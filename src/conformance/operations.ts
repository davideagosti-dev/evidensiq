/**
 * Closed L4 category dispatch (DEC-EVI25-05). DATA ≠ INSTRUCTION.
 * No eval, dynamic import, or fixture-driven function names.
 */

import type { Assertion, BusinessContextDocument, Conflict, Id, Recommendation } from "../model.js";
import {
  assessRecommendation,
  evaluateContradictionPreconditions,
  isAssertionActiveAt,
  isFactQualified,
  projectBusinessContext,
  selectCurrentFactAssertions,
  validityIntervalsOverlap,
} from "../semantics/index.js";
import type {
  ContradictionExpectation,
  CurrentTruthExpectation,
  FactQualificationExpectation,
  HistoricalChangeExpectation,
  L4CategoryExpectation,
  RecommendationAssessmentExpectation,
  RecommendationPolicyExpectation,
  TemporalProjectionExpectation,
} from "./types.js";

export type L4OperationResult = {
  readonly pass: boolean;
  readonly expected: Record<string, unknown>;
  readonly actual: Record<string, unknown>;
};

function asDocument(document: unknown): BusinessContextDocument {
  return document as BusinessContextDocument;
}

function assertionIds(document: BusinessContextDocument): readonly Id[] {
  return (document.assertions ?? []).map((a) => a.id);
}

function evidenceIds(document: BusinessContextDocument): readonly Id[] {
  return (document.evidence ?? []).map((e) => e.id);
}

function sortedCopy(ids: readonly string[]): string[] {
  return ids.slice().sort();
}

function sameIdSet(actual: readonly string[], expected: readonly string[]): boolean {
  const a = sortedCopy(actual);
  const e = sortedCopy(expected);
  if (a.length !== e.length) {
    return false;
  }
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== e[i]) {
      return false;
    }
  }
  return true;
}

function findAssertion(document: BusinessContextDocument, id: Id): Assertion | undefined {
  return (document.assertions ?? []).find((a) => a.id === id);
}

function findConflict(document: BusinessContextDocument, id: Id): Conflict | undefined {
  return (document.conflicts ?? []).find((c) => c.id === id);
}

function findRecommendation(document: BusinessContextDocument, id: Id): Recommendation | undefined {
  return (document.recommendations ?? []).find((r) => r.id === id);
}

function hasPersistedFactsCollection(document: unknown): boolean {
  return (
    typeof document === "object" &&
    document !== null &&
    !Array.isArray(document) &&
    Object.hasOwn(document, "facts")
  );
}

function runFactQualification(
  document: unknown,
  expectation: FactQualificationExpectation,
): L4OperationResult {
  const doc = asDocument(document);
  const factIds: Id[] = [];
  const nonFactIds: Id[] = [];
  for (const assertion of doc.assertions ?? []) {
    if (isFactQualified(assertion)) {
      factIds.push(assertion.id);
    } else {
      nonFactIds.push(assertion.id);
    }
  }

  const expectedFact = expectation.factAssertionIds;
  const expectedNonFact = expectation.nonFactAssertionIds;
  const persistedFacts = hasPersistedFactsCollection(document);

  const pass =
    sameIdSet(factIds, expectedFact) &&
    expectedNonFact.every((id) => nonFactIds.includes(id) || !factIds.includes(id)) &&
    expectedNonFact.every((id) => {
      const a = findAssertion(doc, id);
      return a !== undefined && !isFactQualified(a);
    }) &&
    persistedFacts === expectation.persistedFactObjectsExpected;

  return {
    pass,
    expected: {
      factAssertionIds: sortedCopy(expectedFact),
      nonFactAssertionIds: sortedCopy(expectedNonFact),
      persistedFactObjectsExpected: false,
    },
    actual: {
      factAssertionIds: sortedCopy(factIds),
      nonFactAssertionIds: sortedCopy(
        expectedNonFact.filter((id) => {
          const a = findAssertion(doc, id);
          return a !== undefined && !isFactQualified(a);
        }),
      ),
      persistedFactObjectsExpected: persistedFacts,
    },
  };
}

function runCurrentTruth(
  document: unknown,
  expectation: CurrentTruthExpectation,
): L4OperationResult {
  const doc = asDocument(document);
  const current = selectCurrentFactAssertions(doc, expectation.asOf);
  const currentIds = current.map((a) => a.id);

  const includedOk = expectation.includedInCurrentTruth.every((id) => currentIds.includes(id));
  const excludedOk = expectation.excludedFromCurrentTruth.every((id) => !currentIds.includes(id));
  const nonFactOk = expectation.nonFactAssertionIds.every((id) => {
    const a = findAssertion(doc, id);
    return a !== undefined && !isFactQualified(a);
  });

  return {
    pass: includedOk && excludedOk && nonFactOk,
    expected: {
      asOf: expectation.asOf,
      includedInCurrentTruth: [...expectation.includedInCurrentTruth],
      excludedFromCurrentTruth: [...expectation.excludedFromCurrentTruth],
      nonFactAssertionIds: [...expectation.nonFactAssertionIds],
    },
    actual: {
      asOf: expectation.asOf,
      currentTruthAssertionIds: [...currentIds],
      nonFactAssertionIds: expectation.nonFactAssertionIds.filter((id) => {
        const a = findAssertion(doc, id);
        return a !== undefined && !isFactQualified(a);
      }),
    },
  };
}

function runHistoricalChange(
  document: unknown,
  expectation: HistoricalChangeExpectation,
): L4OperationResult {
  const doc = asDocument(document);
  const assertions = expectation.assertionIds
    .map((id) => findAssertion(doc, id))
    .filter((a): a is Assertion => a !== undefined);

  let anyOverlap = false;
  for (let i = 0; i < assertions.length; i += 1) {
    for (let j = i + 1; j < assertions.length; j += 1) {
      const left = assertions[i];
      const right = assertions[j];
      if (left !== undefined && right !== undefined && validityIntervalsOverlap(left, right)) {
        anyOverlap = true;
      }
    }
  }

  const conflicts = doc.conflicts ?? [];
  const conflictInvolving = conflicts.some((c) =>
    c.assertionIds.some((id) => expectation.assertionIds.includes(id)),
  );

  const inferredSupersession = assertions.some(
    (a) =>
      a.classification === "superseded" ||
      (a.supersededBy !== undefined && expectation.assertionIds.includes(a.supersededBy)),
  );

  const historicalChange = assertions.length >= 2 && !anyOverlap;
  const pass =
    historicalChange === expectation.historicalChange &&
    conflictInvolving === expectation.conflictExpected &&
    inferredSupersession === expectation.inferredSupersessionExpected;

  return {
    pass,
    expected: {
      assertionIds: [...expectation.assertionIds],
      historicalChange: true,
      conflictExpected: false,
      inferredSupersessionExpected: false,
    },
    actual: {
      assertionIds: assertions.map((a) => a.id),
      historicalChange,
      conflictExpected: conflictInvolving,
      inferredSupersessionExpected: inferredSupersession,
      intervalsOverlap: anyOverlap,
    },
  };
}

function runContradiction(
  document: unknown,
  expectation: ContradictionExpectation,
): L4OperationResult {
  const doc = asDocument(document);
  const conflict = findConflict(doc, expectation.conflictId);
  if (conflict === undefined) {
    return {
      pass: false,
      expected: {
        conflictId: expectation.conflictId,
        contradictionExpected: true,
      },
      actual: {
        conflictId: expectation.conflictId,
        conflictFound: false,
      },
    };
  }

  const preconditions = evaluateContradictionPreconditions(doc, conflict);
  const preservedAssertions = expectation.preservedAssertionIds.every((id) =>
    assertionIds(doc).includes(id),
  );
  const preservedEvidence = expectation.preservedEvidenceIds.every((id) =>
    evidenceIds(doc).includes(id),
  );
  const assertionIdsMatch = sameIdSet([...conflict.assertionIds], [...expectation.assertionIds]);

  const contradictionOk =
    expectation.contradictionExpected &&
    preconditions.contradictionPreconditionsMetExceptValue === true;

  const pass = contradictionOk && assertionIdsMatch && preservedAssertions && preservedEvidence;

  return {
    pass,
    expected: {
      assertionIds: sortedCopy(expectation.assertionIds),
      contradictionExpected: true,
      conflictId: expectation.conflictId,
      preservedAssertionIds: sortedCopy(expectation.preservedAssertionIds),
      preservedEvidenceIds: sortedCopy(expectation.preservedEvidenceIds),
      contradictionPreconditionsMetExceptValue: true,
    },
    actual: {
      assertionIds: sortedCopy(conflict.assertionIds),
      contradictionExpected: preconditions.contradictionPreconditionsMetExceptValue,
      conflictId: conflict.id,
      preservedAssertionIds: expectation.preservedAssertionIds.filter((id) =>
        assertionIds(doc).includes(id),
      ),
      preservedEvidenceIds: expectation.preservedEvidenceIds.filter((id) =>
        evidenceIds(doc).includes(id),
      ),
      contradictionPreconditionsMetExceptValue:
        preconditions.contradictionPreconditionsMetExceptValue,
      valueIncompatibilityEvaluated: preconditions.valueIncompatibilityEvaluated,
    },
  };
}

function runRecommendationAssessment(
  document: unknown,
  expectation: RecommendationAssessmentExpectation,
): L4OperationResult {
  const doc = asDocument(document);
  const requiredOk = expectation.assessmentRequiredRecommendationIds.every((id) => {
    const rec = findRecommendation(doc, id);
    return rec !== undefined && rec.assessment !== undefined;
  });

  const optionalIds = expectation.assessmentOptionalRecommendationIds ?? [];
  const optionalPresent = optionalIds.map((id) => {
    const rec = findRecommendation(doc, id);
    return {
      id,
      found: rec !== undefined,
      assessmentPresent: rec?.assessment !== undefined,
    };
  });

  return {
    pass: requiredOk && expectation.assessmentExpected,
    expected: {
      assessmentRequiredRecommendationIds: [...expectation.assessmentRequiredRecommendationIds],
      assessmentExpected: true,
      assessmentOptionalRecommendationIds: [...optionalIds],
    },
    actual: {
      assessmentRequired: expectation.assessmentRequiredRecommendationIds.map((id) => {
        const rec = findRecommendation(doc, id);
        return {
          id,
          assessmentPresent: rec?.assessment !== undefined,
        };
      }),
      assessmentOptional: optionalPresent,
    },
  };
}

function runRecommendationPolicy(
  document: unknown,
  expectation: RecommendationPolicyExpectation,
): L4OperationResult {
  const doc = asDocument(document);
  const result = assessRecommendation(doc, expectation.recommendationId, {
    constraintEvaluations: expectation.constraintEvaluations,
  });

  if (!result.found) {
    return {
      pass: false,
      expected: {
        recommendationId: expectation.recommendationId,
        expectedStatus: expectation.expectedStatus,
      },
      actual: {
        found: false,
        recommendationId: expectation.recommendationId,
      },
    };
  }

  const checkName = expectation.expectedAssessmentCheck.name;
  const checkResult = expectation.expectedAssessmentCheck.result;
  const hasCheck = result.evaluatedChecks.some(
    (c) => c.check === checkName && c.outcome === checkResult,
  );
  const statusOk = result.derivedStatus === expectation.expectedStatus;
  const conflictedOk =
    expectation.conflictedExpected === false && result.derivedStatus !== "conflicted";

  return {
    pass: statusOk && hasCheck && conflictedOk,
    expected: {
      recommendationId: expectation.recommendationId,
      expectedStatus: "rejected",
      expectedAssessmentCheck: expectation.expectedAssessmentCheck,
      conflictedExpected: false,
    },
    actual: {
      recommendationId: result.recommendationId,
      derivedStatus: result.derivedStatus ?? null,
      evaluatedChecks: result.evaluatedChecks.map((c) => ({
        check: c.check,
        outcome: c.outcome,
        ...(c.constraintId !== undefined ? { constraintId: c.constraintId } : {}),
      })),
      conflictedExpected: result.derivedStatus === "conflicted",
    },
  };
}

function runTemporalProjection(
  document: unknown,
  expectation: TemporalProjectionExpectation,
): L4OperationResult {
  const doc = asDocument(document);
  const asOf = expectation.projectionRequest.asOf;
  const includeConflicts = expectation.projectionRequest.includeConflicts;

  const active: Id[] = [];
  const inactive: Id[] = [];
  for (const assertion of doc.assertions ?? []) {
    if (isAssertionActiveAt(assertion, asOf)) {
      active.push(assertion.id);
    } else {
      inactive.push(assertion.id);
    }
  }

  const projection = projectBusinessContext(doc, {
    asOf,
    includeConflicts,
  });
  const visibleConflictIds = (projection.conflicts ?? []).map((c) => c.id);

  const pass =
    sameIdSet(active, expectation.expected.activeAssertionIds) &&
    sameIdSet(inactive, expectation.expected.inactiveAssertionIds) &&
    sameIdSet(visibleConflictIds, expectation.expected.visibleConflictIds);

  return {
    pass,
    expected: {
      projectionRequest: {
        asOf,
        includeConflicts,
      },
      expected: {
        activeAssertionIds: sortedCopy(expectation.expected.activeAssertionIds),
        inactiveAssertionIds: sortedCopy(expectation.expected.inactiveAssertionIds),
        visibleConflictIds: sortedCopy(expectation.expected.visibleConflictIds),
      },
    },
    actual: {
      activeAssertionIds: sortedCopy(active),
      inactiveAssertionIds: sortedCopy(inactive),
      visibleConflictIds: sortedCopy(visibleConflictIds),
      projectedAssertionIds: (projection.assertions ?? []).map((a) => a.id),
    },
  };
}

const L4_HANDLERS = {
  "fact-qualification": runFactQualification,
  "current-truth": runCurrentTruth,
  "historical-change": runHistoricalChange,
  contradiction: runContradiction,
  "recommendation-assessment": runRecommendationAssessment,
  "recommendation-policy": runRecommendationPolicy,
  "temporal-projection": runTemporalProjection,
} as const;

export type L4CategoryKind = keyof typeof L4_HANDLERS;

export function isL4CategoryKind(value: string): value is L4CategoryKind {
  return Object.hasOwn(L4_HANDLERS, value);
}

/**
 * Execute a closed L4 category operation.
 * @throws {TypeError} when category discriminant is unknown (API misuse)
 */
export function executeL4Category(
  document: unknown,
  expectation: L4CategoryExpectation,
): L4OperationResult {
  const kind = expectation.kind;
  if (!isL4CategoryKind(kind)) {
    throw new TypeError(`Unknown L4 category: ${String(kind)}`);
  }

  switch (kind) {
    case "fact-qualification":
      return runFactQualification(document, expectation);
    case "current-truth":
      return runCurrentTruth(document, expectation);
    case "historical-change":
      return runHistoricalChange(document, expectation);
    case "contradiction":
      return runContradiction(document, expectation);
    case "recommendation-assessment":
      return runRecommendationAssessment(document, expectation);
    case "recommendation-policy":
      return runRecommendationPolicy(document, expectation);
    case "temporal-projection":
      return runTemporalProjection(document, expectation);
    default: {
      const _exhaustive: never = kind;
      throw new TypeError(`Unknown L4 category: ${String(_exhaustive)}`);
    }
  }
}
