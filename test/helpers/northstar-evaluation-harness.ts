/**
 * Northstar Q1–Q14 evaluation harness (EVI-2.6B).
 *
 * Test/reference infrastructure only — not public package API.
 * Closed scenario dispatch; DATA ≠ INSTRUCTION; no formula execution.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { ConstraintEvaluation } from "../../src/index.js";
import {
  assessRecommendation,
  buildRecommendationSupportGraph,
  evaluateContradictionPreconditions,
  isAssertionActiveAt,
  isFactQualified,
  projectBusinessContext,
  selectCurrentFactAssertions,
  validateBusinessContext,
  validateL1,
  validateL2,
} from "../../src/index.js";
import type {
  Assertion,
  AssessmentCheckResult,
  BusinessContextDocument,
  Conflict,
  Entity,
  Recommendation,
} from "../../src/model.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** Canonical Northstar evaluation instant (DEC-EVI26-04). */
export const NORTHSTAR_AS_OF = "2026-06-30T00:00:00Z";

/**
 * Scenario-oracle constraint judgment for Q9/Q10 runtime reassessment
 * (DEC-EVI26-05). Not Business Context wire data.
 */
export const NORTHSTAR_HARD_CONSTRAINT_ORACLE: readonly ConstraintEvaluation[] = [
  { constraintId: "constraint-supplier-capacity", violated: true },
];

export type EvaluationStatus = "pass" | "fail" | "skip";

export type NorthstarTrace = {
  readonly entityIds?: readonly string[];
  readonly evidenceIds?: readonly string[];
  readonly assertionIds?: readonly string[];
  readonly conflictIds?: readonly string[];
  readonly signalIds?: readonly string[];
  readonly inferenceIds?: readonly string[];
  readonly constraintIds?: readonly string[];
  readonly recommendationIds?: readonly string[];
  readonly sourceIds?: readonly string[];
};

export type NorthstarEvaluationResult = {
  readonly questionId: string;
  readonly category: string;
  readonly status: EvaluationStatus;
  readonly expected: unknown;
  readonly actual: unknown;
  readonly trace: NorthstarTrace;
  readonly reason?: string;
};

export type NorthstarSuiteCounts = {
  readonly pass: number;
  readonly fail: number;
  readonly skip: number;
};

export type NorthstarSuiteResult = {
  readonly results: readonly NorthstarEvaluationResult[];
  readonly counts: NorthstarSuiteCounts;
  readonly ok: boolean;
};

export type NorthstarQuestionExpectation = {
  readonly id: string;
  readonly category: string;
  readonly description?: string;
  readonly expectation: Record<string, unknown>;
  readonly level?: string;
  readonly ruleId?: string;
};

export type NorthstarExpectationsFile = {
  readonly expectationVersion: string;
  readonly scenario: string;
  readonly fixture: string;
  readonly expectations: readonly NorthstarQuestionExpectation[];
};

export type NorthstarEvaluationOptions = {
  /** Override Q9/Q10 scenario constraint oracle (test/reference only). */
  readonly constraintEvaluations?: readonly ConstraintEvaluation[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Malformed Northstar oracle: ${label} must be a non-empty string`);
  }
  return value;
}

function requireNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Malformed Northstar oracle: ${label} must be a finite number`);
  }
  return value;
}

function requireStringArray(value: unknown, label: string): readonly string[] {
  if (!Array.isArray(value) || !value.every((item) => typeof item === "string")) {
    throw new Error(`Malformed Northstar oracle: ${label} must be a string array`);
  }
  return value;
}

function passResult(
  question: NorthstarQuestionExpectation,
  expected: unknown,
  actual: unknown,
  trace: NorthstarTrace,
): NorthstarEvaluationResult {
  return {
    questionId: question.id,
    category: question.category,
    status: "pass",
    expected,
    actual,
    trace,
  };
}

function failResult(
  question: NorthstarQuestionExpectation,
  expected: unknown,
  actual: unknown,
  trace: NorthstarTrace,
  reason: string,
): NorthstarEvaluationResult {
  return {
    questionId: question.id,
    category: question.category,
    status: "fail",
    expected,
    actual,
    trace,
    reason,
  };
}

function findAssertion(document: BusinessContextDocument, id: string): Assertion | undefined {
  return (document.assertions ?? []).find((a) => a.id === id);
}

function requireAssertion(document: BusinessContextDocument, id: string): Assertion {
  const found = findAssertion(document, id);
  if (found === undefined) {
    throw new Error(`Missing assertion ${id}`);
  }
  return found;
}

function findEntity(document: BusinessContextDocument, id: string): Entity | undefined {
  return (document.entities ?? []).find((e) => e.id === id);
}

function findConflict(document: BusinessContextDocument, id: string): Conflict | undefined {
  return (document.conflicts ?? []).find((c) => c.id === id);
}

function findRecommendation(
  document: BusinessContextDocument,
  id: string,
): Recommendation | undefined {
  return (document.recommendations ?? []).find((r) => r.id === id);
}

function sourceIdsForEvidence(
  document: BusinessContextDocument,
  evidenceIds: readonly string[],
): readonly string[] {
  const evidenceById = new Map((document.evidence ?? []).map((e) => [e.id, e] as const));
  const sourceIdSet = new Set<string>();
  const ordered: string[] = [];
  for (const evidenceId of evidenceIds) {
    const evidence = evidenceById.get(evidenceId);
    if (evidence === undefined) {
      continue;
    }
    if (!sourceIdSet.has(evidence.sourceId)) {
      sourceIdSet.add(evidence.sourceId);
      ordered.push(evidence.sourceId);
    }
  }
  return ordered;
}

function containsAll(actual: ReadonlySet<string>, expected: readonly string[]): boolean {
  return expected.every((id) => actual.has(id));
}

function idsEqualDocumentOrder(actual: readonly string[], expected: readonly string[]): boolean {
  if (actual.length !== expected.length) {
    return false;
  }
  for (let i = 0; i < actual.length; i += 1) {
    if (actual[i] !== expected[i]) {
      return false;
    }
  }
  return true;
}

function assessmentResults(recommendation: Recommendation): readonly AssessmentCheckResult[] {
  return recommendation.assessment?.results ?? [];
}

function findAssessmentCheck(
  recommendation: Recommendation,
  check: string,
): AssessmentCheckResult | undefined {
  return assessmentResults(recommendation).find((r) => r.check === check);
}

/**
 * Load and lightly validate the frozen Northstar Q1–Q14 oracle.
 * File-system access is test/reference-only.
 */
export function loadNorthstarExpectations(
  relativePath = "fixtures/evaluation/northstar-expectations.json",
): NorthstarExpectationsFile {
  const text = readFileSync(join(repoRoot, relativePath), "utf8");
  const raw: unknown = JSON.parse(text);
  if (!isRecord(raw)) {
    throw new Error("Malformed Northstar oracle: root must be an object");
  }
  const expectationVersion = requireString(raw.expectationVersion, "expectationVersion");
  const scenario = requireString(raw.scenario, "scenario");
  const fixture = requireString(raw.fixture, "fixture");
  if (!Array.isArray(raw.expectations)) {
    throw new Error("Malformed Northstar oracle: expectations must be an array");
  }
  const expectations: NorthstarQuestionExpectation[] = [];
  for (const entry of raw.expectations) {
    if (!isRecord(entry)) {
      throw new Error("Malformed Northstar oracle: expectation entry must be an object");
    }
    const id = requireString(entry.id, "expectation.id");
    const category = requireString(entry.category, "expectation.category");
    if (!isRecord(entry.expectation)) {
      throw new Error(`Malformed Northstar oracle: ${id}.expectation must be an object`);
    }
    expectations.push({
      id,
      category,
      expectation: entry.expectation,
      ...(typeof entry.description === "string" ? { description: entry.description } : {}),
      ...(typeof entry.level === "string" ? { level: entry.level } : {}),
      ...(typeof entry.ruleId === "string" ? { ruleId: entry.ruleId } : {}),
    });
  }
  return { expectationVersion, scenario, fixture, expectations };
}

/**
 * Load Northstar manufacturing fixture and require L1+L2 validity.
 * File-system access is test/reference-only.
 */
export function loadNorthstarDocument(
  relativePath = "fixtures/northstar-manufacturing.json",
): BusinessContextDocument {
  const text = readFileSync(join(repoRoot, relativePath), "utf8");
  const raw: unknown = JSON.parse(text);
  const result = validateBusinessContext(raw);
  if (!result.valid) {
    throw new Error("Northstar fixture failed L1+L2 validation");
  }
  return result.document;
}

/** Prerequisite structural/semantic validity using existing public APIs. */
export function verifyNorthstarL1L2(document: unknown): { l1: boolean; l2: boolean } {
  const l1 = validateL1(document);
  if (!l1.valid) {
    return { l1: false, l2: false };
  }
  const l2 = validateL2(l1.document);
  return { l1: true, l2: l2.valid };
}

function evaluateAssertionValue(
  document: BusinessContextDocument,
  question: NorthstarQuestionExpectation,
): NorthstarEvaluationResult {
  const exp = question.expectation;
  const assertionId = requireString(exp.assertionId, `${question.id}.assertionId`);
  const predicate = requireString(exp.predicate, `${question.id}.predicate`);
  const expectedValue = requireNumber(exp.value, `${question.id}.value`);

  const assertion = findAssertion(document, assertionId);
  const evidenceIds = assertion?.evidenceIds ?? [];
  const sourceIds = sourceIdsForEvidence(document, evidenceIds);
  const trace: NorthstarTrace = {
    assertionIds: [assertionId],
    evidenceIds: [...evidenceIds],
    sourceIds,
  };

  const expected = { assertionId, predicate, value: expectedValue };
  if (assertion === undefined) {
    return failResult(
      question,
      expected,
      { found: false },
      trace,
      `missing assertion ${assertionId}`,
    );
  }

  const actual = {
    assertionId: assertion.id,
    predicate: assertion.predicate,
    value: assertion.value,
  };

  if (assertion.predicate !== predicate || !Object.is(assertion.value, expectedValue)) {
    return failResult(question, expected, actual, trace, "assertion value mismatch");
  }
  return passResult(question, expected, actual, trace);
}

/**
 * Q3 closed arithmetic — formula string is DATA, never executed.
 */
function evaluateDerivedMetricQ3(
  document: BusinessContextDocument,
  question: NorthstarQuestionExpectation,
): NorthstarEvaluationResult {
  const derivation = question.expectation.derivation;
  if (!isRecord(derivation)) {
    throw new Error("Malformed Northstar oracle: Q3.derivation must be an object");
  }
  const formula = requireString(derivation.formula, "Q3.formula");
  const expectedValue = requireNumber(derivation.expectedValue, "Q3.expectedValue");
  const inputs = derivation.inputs;
  if (!isRecord(inputs) || !isRecord(inputs.q1Revenue) || !isRecord(inputs.q2Revenue)) {
    throw new Error("Malformed Northstar oracle: Q3.inputs must declare q1Revenue/q2Revenue");
  }

  const q1Id = requireString(inputs.q1Revenue.assertionId, "Q3.q1Revenue.assertionId");
  const q2Id = requireString(inputs.q2Revenue.assertionId, "Q3.q2Revenue.assertionId");
  const q1Assertion = requireAssertion(document, q1Id);
  const q2Assertion = requireAssertion(document, q2Id);

  const q1Revenue = q1Assertion.value;
  const q2Revenue = q2Assertion.value;
  if (typeof q1Revenue !== "number" || !Number.isFinite(q1Revenue)) {
    return failResult(
      question,
      { expectedValue, formula },
      { q1Revenue, q2Revenue },
      { assertionIds: [q1Id, q2Id] },
      "q1Revenue is not a finite number",
    );
  }
  if (typeof q2Revenue !== "number" || !Number.isFinite(q2Revenue)) {
    return failResult(
      question,
      { expectedValue, formula },
      { q1Revenue, q2Revenue },
      { assertionIds: [q1Id, q2Id] },
      "q2Revenue is not a finite number",
    );
  }

  // Trusted closed operation only — never eval / parse / interpret `formula`.
  const actualValue = (q2Revenue - q1Revenue) / q1Revenue;
  const expected = {
    formula,
    expectedValue,
    q1Revenue,
    q2Revenue,
  };
  const actual = {
    formulaMetadata: formula,
    actualValue,
    q1Revenue,
    q2Revenue,
  };
  const trace: NorthstarTrace = { assertionIds: [q1Id, q2Id] };

  if (!Object.is(actualValue, expectedValue)) {
    return failResult(question, expected, actual, trace, "derived metric mismatch");
  }
  if (formula !== "(q2Revenue - q1Revenue) / q1Revenue") {
    return failResult(question, expected, actual, trace, "formula metadata mismatch");
  }
  return passResult(question, expected, actual, trace);
}

function evaluateComplaintIncreaseQ4(
  document: BusinessContextDocument,
  question: NorthstarQuestionExpectation,
): NorthstarEvaluationResult {
  const exp = question.expectation;
  if (!isRecord(exp.q1) || !isRecord(exp.q2)) {
    throw new Error("Malformed Northstar oracle: Q4 requires q1/q2");
  }
  const q1Id = requireString(exp.q1.assertionId, "Q4.q1.assertionId");
  const q2Id = requireString(exp.q2.assertionId, "Q4.q2.assertionId");
  const q1Expected = requireNumber(exp.q1.value, "Q4.q1.value");
  const q2Expected = requireNumber(exp.q2.value, "Q4.q2.value");

  const q1 = findAssertion(document, q1Id);
  const q2 = findAssertion(document, q2Id);
  const trace: NorthstarTrace = { assertionIds: [q1Id, q2Id] };
  const expected = {
    q1: { assertionId: q1Id, value: q1Expected },
    q2: { assertionId: q2Id, value: q2Expected },
    increased: true,
  };

  if (q1 === undefined || q2 === undefined) {
    return failResult(
      question,
      expected,
      { q1Found: q1 !== undefined, q2Found: q2 !== undefined },
      trace,
      "missing complaint-rate assertion",
    );
  }

  const q1Value = q1.value;
  const q2Value = q2.value;
  const actual = {
    q1: { assertionId: q1.id, value: q1Value },
    q2: { assertionId: q2.id, value: q2Value },
    increased:
      typeof q1Value === "number" && typeof q2Value === "number" ? q2Value > q1Value : false,
  };

  if (!Object.is(q1Value, q1Expected) || !Object.is(q2Value, q2Expected)) {
    return failResult(question, expected, actual, trace, "complaint rate value mismatch");
  }
  if (!(typeof q2Value === "number" && typeof q1Value === "number" && q2Value > q1Value)) {
    return failResult(question, expected, actual, trace, "q2 is not greater than q1");
  }
  return passResult(question, expected, actual, trace);
}

function evaluateConstraintQ5(
  document: BusinessContextDocument,
  question: NorthstarQuestionExpectation,
): NorthstarEvaluationResult {
  const exp = question.expectation;
  const entityId = requireString(exp.entityId, "Q5.entityId");
  const type = requireString(exp.type, "Q5.type");
  const signalId = requireString(exp.signalId, "Q5.signalId");
  const status = requireString(exp.status, "Q5.status");
  if (!isRecord(exp.properties)) {
    throw new Error("Malformed Northstar oracle: Q5.properties required");
  }
  const enforcement = requireString(exp.properties.enforcement, "Q5.properties.enforcement");

  const entity = findEntity(document, entityId);
  const signal = (document.signals ?? []).find((s) => s.id === signalId);
  const expected = {
    entityId,
    type,
    enforcement,
    signalId,
    status,
  };
  const actual = {
    entityId: entity?.id,
    type: entity?.type,
    enforcement: entity?.properties?.enforcement,
    signalId: signal?.id,
    status: signal?.status,
  };
  const trace: NorthstarTrace = {
    entityIds: [entityId],
    constraintIds: [entityId],
    signalIds: [signalId],
  };

  if (
    entity === undefined ||
    entity.type !== type ||
    entity.properties?.enforcement !== enforcement ||
    signal === undefined ||
    signal.status !== status
  ) {
    return failResult(question, expected, actual, trace, "hard constraint convention mismatch");
  }
  return passResult(question, expected, actual, trace);
}

function evaluateConflictQ6(
  document: BusinessContextDocument,
  question: NorthstarQuestionExpectation,
): NorthstarEvaluationResult {
  const exp = question.expectation;
  const conflictId = requireString(exp.conflictId, "Q6.conflictId");
  const conflictKind = requireString(exp.conflictKind, "Q6.conflictKind");
  const status = requireString(exp.status, "Q6.status");
  const assertionIds = requireStringArray(exp.assertionIds, "Q6.assertionIds");

  const conflict = findConflict(document, conflictId);
  const expected = { conflictId, conflictKind, status, assertionIds };
  const trace: NorthstarTrace = { conflictIds: [conflictId], assertionIds };

  if (conflict === undefined) {
    return failResult(question, expected, { found: false }, trace, "missing conflict");
  }

  const preconditions = evaluateContradictionPreconditions(document, conflict);
  const actual = {
    conflictId: conflict.id,
    conflictKind: conflict.conflictKind,
    status: conflict.status,
    assertionIds: [...conflict.assertionIds],
    contradictionPreconditionsMetExceptValue:
      preconditions.contradictionPreconditionsMetExceptValue,
    valueIncompatibilityEvaluated: preconditions.valueIncompatibilityEvaluated,
  };

  if (
    conflict.conflictKind !== conflictKind ||
    conflict.status !== status ||
    !idsEqualDocumentOrder([...conflict.assertionIds], [...assertionIds])
  ) {
    return failResult(question, expected, actual, trace, "conflict expectation mismatch");
  }
  if (!preconditions.contradictionPreconditionsMetExceptValue) {
    return failResult(question, expected, actual, trace, "contradiction preconditions not met");
  }
  return passResult(question, expected, actual, trace);
}

function evaluateFactQualificationQ7(
  document: BusinessContextDocument,
  question: NorthstarQuestionExpectation,
): NorthstarEvaluationResult {
  const exp = question.expectation;
  if (!isRecord(exp.currentFact) || !isRecord(exp.superseded)) {
    throw new Error("Malformed Northstar oracle: Q7 requires currentFact/superseded");
  }
  const currentId = requireString(exp.currentFact.assertionId, "Q7.currentFact.assertionId");
  const currentValue = requireNumber(exp.currentFact.value, "Q7.currentFact.value");
  const currentClass = requireString(
    exp.currentFact.classification,
    "Q7.currentFact.classification",
  );
  const supersededId = requireString(exp.superseded.assertionId, "Q7.superseded.assertionId");
  const supersededValue = requireNumber(exp.superseded.value, "Q7.superseded.value");
  const supersededClass = requireString(
    exp.superseded.classification,
    "Q7.superseded.classification",
  );
  const supersededBy = requireString(exp.superseded.supersededBy, "Q7.superseded.supersededBy");

  const current = findAssertion(document, currentId);
  const superseded = findAssertion(document, supersededId);
  const currentFacts = selectCurrentFactAssertions(document, NORTHSTAR_AS_OF);
  const currentFactIds = currentFacts.map((a) => a.id);
  const expected = {
    currentFact: { assertionId: currentId, value: currentValue, classification: currentClass },
    superseded: {
      assertionId: supersededId,
      value: supersededValue,
      classification: supersededClass,
      supersededBy,
    },
  };
  const actual = {
    currentFact: current
      ? {
          assertionId: current.id,
          value: current.value,
          classification: current.classification,
          isFactQualified: isFactQualified(current),
        }
      : null,
    superseded: superseded
      ? {
          assertionId: superseded.id,
          value: superseded.value,
          classification: superseded.classification,
          supersededBy: superseded.supersededBy,
          isFactQualified: isFactQualified(superseded),
        }
      : null,
    currentFactIds,
  };
  const trace: NorthstarTrace = { assertionIds: [currentId, supersededId] };

  if (
    current === undefined ||
    superseded === undefined ||
    !Object.is(current.value, currentValue) ||
    current.classification !== currentClass ||
    !isFactQualified(current) ||
    !Object.is(superseded.value, supersededValue) ||
    superseded.classification !== supersededClass ||
    superseded.supersededBy !== supersededBy ||
    isFactQualified(superseded) ||
    !currentFactIds.includes(currentId) ||
    currentFactIds.includes(supersededId)
  ) {
    return failResult(question, expected, actual, trace, "fact/supersession mismatch");
  }
  return passResult(question, expected, actual, trace);
}

function evaluateRecommendationPersisted(
  document: BusinessContextDocument,
  question: NorthstarQuestionExpectation,
  options: NorthstarEvaluationOptions,
): NorthstarEvaluationResult {
  const recommendationId = requireString(
    question.expectation.recommendationId,
    `${question.id}.recommendationId`,
  );
  const status = requireString(question.expectation.status, `${question.id}.status`);
  const recommendation = findRecommendation(document, recommendationId);
  const expected = { recommendationId, status };
  const trace: NorthstarTrace = { recommendationIds: [recommendationId] };

  if (recommendation === undefined) {
    return failResult(question, expected, { found: false }, trace, "missing recommendation");
  }

  // Q9 additionally verifies runtime bounded assessment agreement.
  if (question.id === "Q9") {
    const constraintEvaluations = options.constraintEvaluations ?? NORTHSTAR_HARD_CONSTRAINT_ORACLE;
    const assessment = assessRecommendation(document, recommendationId, {
      constraintEvaluations: [...constraintEvaluations],
    });
    const derivedStatus = assessment.found ? assessment.derivedStatus : undefined;
    const actual = {
      recommendationId: recommendation.id,
      status: recommendation.status,
      derivedStatus: derivedStatus ?? null,
    };
    const q9Trace: NorthstarTrace = {
      recommendationIds: [recommendationId],
      constraintIds: ["constraint-supplier-capacity"],
    };

    if (recommendation.status !== status) {
      return failResult(
        question,
        expected,
        actual,
        q9Trace,
        "persisted recommendation status mismatch",
      );
    }
    if (!assessment.found || derivedStatus !== "rejected") {
      return failResult(
        question,
        { ...expected, derivedStatus: "rejected" },
        actual,
        q9Trace,
        "runtime derivedStatus is not rejected",
      );
    }
    return passResult(question, { ...expected, derivedStatus: "rejected" }, actual, q9Trace);
  }

  // Q8: persisted supported only — do not derive universal supported.
  const actual = {
    recommendationId: recommendation.id,
    status: recommendation.status,
  };
  if (recommendation.status !== status) {
    return failResult(
      question,
      expected,
      actual,
      trace,
      "persisted recommendation status mismatch",
    );
  }
  return passResult(question, expected, actual, trace);
}

function evaluateRecommendationAssessmentQ10(
  document: BusinessContextDocument,
  question: NorthstarQuestionExpectation,
  options: NorthstarEvaluationOptions,
): NorthstarEvaluationResult {
  const recommendationId = requireString(
    question.expectation.recommendationId,
    "Q10.recommendationId",
  );
  const constraintId = requireString(question.expectation.constraintId, "Q10.constraintId");
  const assessmentExp = question.expectation.assessment;
  if (!isRecord(assessmentExp)) {
    throw new Error("Malformed Northstar oracle: Q10.assessment required");
  }
  const policyId = requireString(assessmentExp.policyId, "Q10.assessment.policyId");
  const failedCheck = requireString(assessmentExp.failedCheck, "Q10.assessment.failedCheck");
  const outcome = requireString(assessmentExp.outcome, "Q10.assessment.outcome");

  const recommendation = findRecommendation(document, recommendationId);
  const constraintEvaluations = options.constraintEvaluations ?? NORTHSTAR_HARD_CONSTRAINT_ORACLE;
  const runtime = assessRecommendation(document, recommendationId, {
    constraintEvaluations: [...constraintEvaluations],
  });

  const persistedCheck =
    recommendation !== undefined ? findAssessmentCheck(recommendation, failedCheck) : undefined;

  const runtimeConstraintCheck = runtime.found
    ? runtime.evaluatedChecks.find(
        (c) => c.check === "constraint-compliance" && c.constraintId === constraintId,
      )
    : undefined;

  const expected = {
    recommendationId,
    persisted: { policyId, failedCheck, outcome, constraintId },
    runtime: {
      constraintCompliance: "fail",
      derivedStatus: "rejected",
      constraintId,
    },
  };
  const actual = {
    recommendationId,
    persisted: {
      policyId: recommendation?.assessment?.policyId,
      failedCheck: persistedCheck?.check,
      outcome: persistedCheck?.outcome,
      constraintId,
    },
    runtime: {
      found: runtime.found,
      policyId: runtime.found ? runtime.policyId : undefined,
      constraintCompliance: runtimeConstraintCheck?.outcome,
      derivedStatus: runtime.found ? (runtime.derivedStatus ?? null) : null,
      notEvaluableChecks: runtime.found ? runtime.notEvaluableChecks.map((c) => c.check) : [],
    },
  };
  const trace: NorthstarTrace = {
    recommendationIds: [recommendationId],
    constraintIds: [constraintId],
  };

  if (
    recommendation === undefined ||
    recommendation.assessment?.policyId !== policyId ||
    persistedCheck?.check !== failedCheck ||
    persistedCheck.outcome !== outcome
  ) {
    return failResult(question, expected, actual, trace, "persisted assessment mismatch");
  }
  if (
    !runtime.found ||
    runtimeConstraintCheck?.outcome !== "fail" ||
    runtime.derivedStatus !== "rejected"
  ) {
    return failResult(question, expected, actual, trace, "runtime bounded assessment mismatch");
  }
  return passResult(question, expected, actual, trace);
}

function evaluateTemporalFilterQ11(
  document: BusinessContextDocument,
  question: NorthstarQuestionExpectation,
): NorthstarEvaluationResult {
  const asOf = requireString(question.expectation.asOf, "Q11.asOf");
  const activeAssertionIds = requireStringArray(
    question.expectation.activeAssertionIds,
    "Q11.activeAssertionIds",
  );
  const inactiveAssertionIds = requireStringArray(
    question.expectation.inactiveAssertionIds,
    "Q11.inactiveAssertionIds",
  );

  const activeActual: string[] = [];
  for (const assertion of document.assertions ?? []) {
    if (isAssertionActiveAt(assertion, asOf)) {
      activeActual.push(assertion.id);
    }
  }
  const activeSet = new Set(activeActual);
  const inactiveActual = inactiveAssertionIds.filter((id) => !activeSet.has(id));
  const missingActive = activeAssertionIds.filter((id) => !activeSet.has(id));
  const unexpectedlyActive = inactiveAssertionIds.filter((id) => activeSet.has(id));

  const expected = { asOf, activeAssertionIds, inactiveAssertionIds };
  const actual = {
    asOf,
    activeAssertionIds: activeActual,
    requiredActivePresent: missingActive.length === 0,
    requiredInactiveInactive: unexpectedlyActive.length === 0,
    missingActive,
    unexpectedlyActive,
  };
  const trace: NorthstarTrace = {
    assertionIds: [...activeAssertionIds, ...inactiveAssertionIds],
  };

  if (asOf !== NORTHSTAR_AS_OF) {
    return failResult(question, expected, actual, trace, "unexpected asOf");
  }
  if (missingActive.length > 0 || unexpectedlyActive.length > 0) {
    return failResult(question, expected, actual, trace, "temporal activity mismatch");
  }
  // Silence unused for clarity in actual payload.
  void inactiveActual;
  return passResult(question, expected, actual, trace);
}

function evaluateSupersessionQ12(
  document: BusinessContextDocument,
  question: NorthstarQuestionExpectation,
): NorthstarEvaluationResult {
  const included = requireStringArray(
    question.expectation.includedInCurrentTruth,
    "Q12.includedInCurrentTruth",
  );
  const excluded = requireStringArray(
    question.expectation.excludedFromCurrentTruth,
    "Q12.excludedFromCurrentTruth",
  );
  const facts = selectCurrentFactAssertions(document, NORTHSTAR_AS_OF);
  const factIds = facts.map((a) => a.id);
  const factSet = new Set(factIds);
  const expected = { includedInCurrentTruth: included, excludedFromCurrentTruth: excluded };
  const actual = { currentTruthIds: factIds };
  const trace: NorthstarTrace = { assertionIds: [...included, ...excluded] };

  if (!containsAll(factSet, included) || excluded.some((id) => factSet.has(id))) {
    return failResult(question, expected, actual, trace, "current truth mismatch");
  }
  return passResult(question, expected, actual, trace);
}

function evaluateProjectionQ13(
  document: BusinessContextDocument,
  question: NorthstarQuestionExpectation,
): NorthstarEvaluationResult {
  const projectionRequest = question.expectation.projectionRequest;
  if (!isRecord(projectionRequest)) {
    throw new Error("Malformed Northstar oracle: Q13.projectionRequest required");
  }
  const asOf = requireString(projectionRequest.asOf, "Q13.asOf");
  const includeConflicts = projectionRequest.includeConflicts;
  if (includeConflicts !== true) {
    throw new Error("Malformed Northstar oracle: Q13.includeConflicts must be true");
  }
  const conflictId = requireString(question.expectation.conflictId, "Q13.conflictId");
  const visible = question.expectation.visible;
  if (visible !== true) {
    throw new Error("Malformed Northstar oracle: Q13.visible must be true");
  }

  const projection = projectBusinessContext(document, {
    asOf,
    includeConflicts: true,
  });
  const projectedConflictIds = (projection.conflicts ?? []).map((c) => c.id);
  const expected = { asOf, includeConflicts: true, conflictId, visible: true };
  const actual = {
    asOf,
    includeConflicts: true,
    conflictIds: projectedConflictIds,
    visible: projectedConflictIds.includes(conflictId),
  };
  const trace: NorthstarTrace = { conflictIds: [conflictId] };

  if (!projectedConflictIds.includes(conflictId)) {
    return failResult(question, expected, actual, trace, "conflict not visible in projection");
  }
  return passResult(question, expected, actual, trace);
}

function evaluateTraceabilityQ14(
  document: BusinessContextDocument,
  question: NorthstarQuestionExpectation,
): NorthstarEvaluationResult {
  const recommendationId = requireString(
    question.expectation.recommendationId,
    "Q14.recommendationId",
  );
  const chain = question.expectation.traceabilityChain;
  if (!isRecord(chain)) {
    throw new Error("Malformed Northstar oracle: Q14.traceabilityChain required");
  }
  const inferenceIds = requireStringArray(chain.inferenceIds, "Q14.inferenceIds");
  const signalIds = requireStringArray(chain.signalIds, "Q14.signalIds");
  const evidenceIds = requireStringArray(chain.evidenceIds, "Q14.evidenceIds");
  const sourceIds = requireStringArray(chain.sourceIds, "Q14.sourceIds");

  const graph = buildRecommendationSupportGraph(document, recommendationId);
  if (!graph.found) {
    return failResult(
      question,
      { recommendationId, inferenceIds, signalIds, evidenceIds, sourceIds },
      { found: false },
      { recommendationIds: [recommendationId] },
      "recommendation support graph not found",
    );
  }

  const actualInferenceIds = graph.inferences.map((i) => i.id);
  const actualSignalIds = graph.signals.map((s) => s.id);
  const actualEvidenceIds = graph.evidence.map((e) => e.id);
  // Source resolution: Evidence.sourceId → Source.id (do not alter support graph API).
  const actualSourceIds = sourceIdsForEvidence(document, actualEvidenceIds);
  const sourceSet = new Set(actualSourceIds);
  // Prefer document order intersection for stable trace of required sources.
  const requiredSourcesPresent = sourceIds.filter((id) => sourceSet.has(id));

  const expected = { recommendationId, inferenceIds, signalIds, evidenceIds, sourceIds };
  const actual = {
    recommendationId,
    inferenceIds: actualInferenceIds,
    signalIds: actualSignalIds,
    evidenceIds: actualEvidenceIds,
    sourceIds: actualSourceIds,
  };
  const trace: NorthstarTrace = {
    recommendationIds: [recommendationId],
    inferenceIds: actualInferenceIds,
    signalIds: actualSignalIds,
    evidenceIds: actualEvidenceIds,
    sourceIds: actualSourceIds,
  };

  const ok =
    containsAll(new Set(actualInferenceIds), inferenceIds) &&
    containsAll(new Set(actualSignalIds), signalIds) &&
    containsAll(new Set(actualEvidenceIds), evidenceIds) &&
    containsAll(sourceSet, sourceIds);

  if (!ok) {
    return failResult(
      question,
      expected,
      { ...actual, requiredSourcesPresent },
      trace,
      "traceability containment failure",
    );
  }
  return passResult(question, expected, actual, trace);
}

/**
 * Closed Q1–Q14 dispatcher. Unknown id/category fails loudly (never silent skip).
 */
export function evaluateNorthstarQuestion(
  document: BusinessContextDocument,
  question: NorthstarQuestionExpectation,
  options: NorthstarEvaluationOptions = {},
): NorthstarEvaluationResult {
  switch (question.id) {
    case "Q1":
    case "Q2":
      if (question.category !== "assertion-value") {
        return failResult(
          question,
          question.expectation,
          null,
          {},
          `unexpected category for ${question.id}: ${question.category}`,
        );
      }
      return evaluateAssertionValue(document, question);
    case "Q3":
      if (question.category !== "derived-metric") {
        return failResult(
          question,
          question.expectation,
          null,
          {},
          `unexpected category for Q3: ${question.category}`,
        );
      }
      return evaluateDerivedMetricQ3(document, question);
    case "Q4":
      if (question.category !== "assertion-value") {
        return failResult(
          question,
          question.expectation,
          null,
          {},
          `unexpected category for Q4: ${question.category}`,
        );
      }
      return evaluateComplaintIncreaseQ4(document, question);
    case "Q5":
      if (question.category !== "constraint") {
        return failResult(
          question,
          question.expectation,
          null,
          {},
          `unexpected category for Q5: ${question.category}`,
        );
      }
      return evaluateConstraintQ5(document, question);
    case "Q6":
      if (question.category !== "conflict") {
        return failResult(
          question,
          question.expectation,
          null,
          {},
          `unexpected category for Q6: ${question.category}`,
        );
      }
      return evaluateConflictQ6(document, question);
    case "Q7":
      if (question.category !== "fact-qualification") {
        return failResult(
          question,
          question.expectation,
          null,
          {},
          `unexpected category for Q7: ${question.category}`,
        );
      }
      return evaluateFactQualificationQ7(document, question);
    case "Q8":
    case "Q9":
      if (question.category !== "recommendation") {
        return failResult(
          question,
          question.expectation,
          null,
          {},
          `unexpected category for ${question.id}: ${question.category}`,
        );
      }
      return evaluateRecommendationPersisted(document, question, options);
    case "Q10":
      if (question.category !== "recommendation-assessment") {
        return failResult(
          question,
          question.expectation,
          null,
          {},
          `unexpected category for Q10: ${question.category}`,
        );
      }
      return evaluateRecommendationAssessmentQ10(document, question, options);
    case "Q11":
      if (question.category !== "temporal-filter") {
        return failResult(
          question,
          question.expectation,
          null,
          {},
          `unexpected category for Q11: ${question.category}`,
        );
      }
      return evaluateTemporalFilterQ11(document, question);
    case "Q12":
      if (question.category !== "supersession") {
        return failResult(
          question,
          question.expectation,
          null,
          {},
          `unexpected category for Q12: ${question.category}`,
        );
      }
      return evaluateSupersessionQ12(document, question);
    case "Q13":
      if (question.category !== "projection") {
        return failResult(
          question,
          question.expectation,
          null,
          {},
          `unexpected category for Q13: ${question.category}`,
        );
      }
      return evaluateProjectionQ13(document, question);
    case "Q14":
      if (question.category !== "traceability") {
        return failResult(
          question,
          question.expectation,
          null,
          {},
          `unexpected category for Q14: ${question.category}`,
        );
      }
      return evaluateTraceabilityQ14(document, question);
    default:
      return failResult(
        question,
        question.expectation,
        null,
        {},
        `unknown Northstar question id: ${question.id}`,
      );
  }
}

export function aggregateNorthstarResults(
  results: readonly NorthstarEvaluationResult[],
): NorthstarSuiteResult {
  let pass = 0;
  let fail = 0;
  let skip = 0;
  for (const result of results) {
    if (result.status === "pass") {
      pass += 1;
    } else if (result.status === "fail") {
      fail += 1;
    } else {
      skip += 1;
    }
  }
  return {
    results,
    counts: { pass, fail, skip },
    ok: fail === 0 && skip === 0,
  };
}

/**
 * Run the full Northstar Q1–Q14 suite against a document + oracle.
 * Does not mutate document or expectations.
 */
export function evaluateNorthstarSuite(
  document: BusinessContextDocument,
  expectations: NorthstarExpectationsFile,
  options: NorthstarEvaluationOptions = {},
): NorthstarSuiteResult {
  const results: NorthstarEvaluationResult[] = [];
  for (const question of expectations.expectations) {
    results.push(evaluateNorthstarQuestion(document, question, options));
  }
  return aggregateNorthstarResults(results);
}

/** JSON-stable suite snapshot for determinism comparisons (no timestamps). */
export function suiteResultSnapshot(suite: NorthstarSuiteResult): string {
  return JSON.stringify(suite);
}

/**
 * Reference-demo-only conclusion derived from structured Q outcomes / known IDs.
 * Not a Business Context field and not normative package semantics.
 */
export function referenceDemoConclusion(suite: NorthstarSuiteResult): {
  readonly kind: "reference/demo-only";
  readonly deferRecommendationId: string;
  readonly increaseRecommendationId: string;
  readonly deferPersistedStatus: string | null;
  readonly increasePersistedStatus: string | null;
  readonly suiteOk: boolean;
} {
  const byId = new Map(suite.results.map((r) => [r.questionId, r] as const));
  const q8 = byId.get("Q8");
  const q9 = byId.get("Q9");
  const deferStatus =
    q8?.status === "pass" && isRecord(q8.actual) && typeof q8.actual.status === "string"
      ? q8.actual.status
      : null;
  const increaseStatus =
    q9?.status === "pass" && isRecord(q9.actual) && typeof q9.actual.status === "string"
      ? q9.actual.status
      : null;
  return {
    kind: "reference/demo-only",
    deferRecommendationId: "rec-defer-product-b-acquisition-spend",
    increaseRecommendationId: "rec-increase-product-b-acquisition-spend",
    deferPersistedStatus: deferStatus,
    increasePersistedStatus: increaseStatus,
    suiteOk: suite.ok,
  };
}
