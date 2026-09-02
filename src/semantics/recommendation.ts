/**
 * Recommendation support graph and bounded assessment (EVI-2.4 / DEC-REC-01 / DEC-REC-02).
 * No universal supported/stale/insufficient-evidence/conflicted derivation.
 * No natural-language constraint evaluation. No implicit wall-clock.
 */

import { DEFAULT_RECOMMENDATION_POLICY_ID } from "../constants.js";
import type {
  Assertion,
  AssessmentOutcome,
  BusinessContextDocument,
  Conflict,
  DateTime,
  Entity,
  Evidence,
  Id,
  Inference,
  Recommendation,
  RecommendationStatus,
  Signal,
} from "../model.js";
import { parseDateTimeMs } from "./temporal.js";

/** Caller-supplied per-constraint evaluation (DEC-REC-01). Not a global boolean. */
export type ConstraintEvaluation = {
  readonly constraintId: Id;
  readonly violated: boolean;
};

export type RecommendationAssessmentOptions = {
  readonly constraintEvaluations?: readonly ConstraintEvaluation[];
  readonly policyId?: string;
  readonly asOf?: DateTime;
  readonly evaluatedAt?: DateTime;
};

export type RecommendationSupportGraphFound = {
  readonly found: true;
  readonly recommendationId: Id;
  readonly recommendation: Recommendation;
  readonly constraints: readonly Entity[];
  readonly inferences: readonly Inference[];
  readonly signals: readonly Signal[];
  readonly assertions: readonly Assertion[];
  readonly evidence: readonly Evidence[];
};

export type RecommendationSupportGraphMissing = {
  readonly found: false;
  readonly recommendationId: Id;
};

export type RecommendationSupportGraphResult =
  | RecommendationSupportGraphFound
  | RecommendationSupportGraphMissing;

/** Mechanically decided assessment check (pass / fail). */
export type BoundedAssessmentCheck = {
  readonly check: string;
  readonly outcome: Extract<AssessmentOutcome, "pass" | "fail">;
  readonly constraintId?: Id;
};

/** Mechanically decided warning (e.g. conflict-impact, advisory constraint). */
export type BoundedAssessmentWarning = {
  readonly check: string;
  readonly outcome: "warning";
  readonly constraintId?: Id;
};

/** Check that remains not evaluable under v0.1 normative policy gaps. */
export type NotEvaluableAssessmentCheck = {
  readonly check: string;
  readonly reason: string;
  readonly constraintId?: Id;
};

export type RecommendationAssessmentFound = {
  readonly found: true;
  readonly recommendationId: Id;
  readonly policyId: string;
  readonly support: RecommendationSupportGraphFound;
  readonly evaluatedChecks: readonly BoundedAssessmentCheck[];
  readonly warningChecks: readonly BoundedAssessmentWarning[];
  readonly notEvaluableChecks: readonly NotEvaluableAssessmentCheck[];
  /** Only set when EVI-2.4B can derive a status (hard constraint → rejected). */
  readonly derivedStatus?: RecommendationStatus;
  readonly evaluatedAt?: DateTime;
  readonly asOf?: DateTime;
};

export type RecommendationAssessmentMissing = {
  readonly found: false;
  readonly recommendationId: Id;
};

export type RecommendationAssessmentResult =
  | RecommendationAssessmentFound
  | RecommendationAssessmentMissing;

function findRecommendation(
  document: BusinessContextDocument,
  recommendationId: Id,
): Recommendation | undefined {
  for (const recommendation of document.recommendations ?? []) {
    if (recommendation.id === recommendationId) {
      return recommendation;
    }
  }
  return undefined;
}

function isHardEnforcement(entity: Entity): boolean {
  return entity.properties?.enforcement === "hard";
}

function isAdvisoryEnforcement(entity: Entity): boolean {
  return entity.properties?.enforcement === "advisory";
}

/**
 * Trace explicit Recommendation support references.
 * Exact internal IDs only. Cycles terminate. Document order preserved.
 *
 * Precondition: document is L1+L2-valid (caller responsibility).
 */
export function buildRecommendationSupportGraph(
  document: BusinessContextDocument,
  recommendationId: Id,
): RecommendationSupportGraphResult {
  const recommendation = findRecommendation(document, recommendationId);
  if (recommendation === undefined) {
    return { found: false, recommendationId };
  }

  const entityById = new Map<Id, Entity>();
  for (const entity of document.entities ?? []) {
    if (!entityById.has(entity.id)) {
      entityById.set(entity.id, entity);
    }
  }
  const evidenceById = new Map<Id, Evidence>();
  for (const item of document.evidence ?? []) {
    if (!evidenceById.has(item.id)) {
      evidenceById.set(item.id, item);
    }
  }
  const signalById = new Map<Id, Signal>();
  for (const item of document.signals ?? []) {
    if (!signalById.has(item.id)) {
      signalById.set(item.id, item);
    }
  }
  const assertionById = new Map<Id, Assertion>();
  for (const item of document.assertions ?? []) {
    if (!assertionById.has(item.id)) {
      assertionById.set(item.id, item);
    }
  }
  const inferenceById = new Map<Id, Inference>();
  for (const item of document.inferences ?? []) {
    if (!inferenceById.has(item.id)) {
      inferenceById.set(item.id, item);
    }
  }

  const constraintIds = new Set<Id>();
  const inferenceIds = new Set<Id>();
  const signalIds = new Set<Id>();
  const assertionIds = new Set<Id>();
  const evidenceIds = new Set<Id>();

  const addEvidence = (ids: readonly Id[] | undefined): void => {
    if (ids === undefined) {
      return;
    }
    for (const id of ids) {
      if (evidenceById.has(id)) {
        evidenceIds.add(id);
      }
    }
  };

  for (const id of recommendation.constraintIds ?? []) {
    const entity = entityById.get(id);
    if (entity !== undefined && entity.type === "Constraint") {
      constraintIds.add(id);
    }
  }

  addEvidence(recommendation.evidenceIds);

  const pendingInferences: Id[] = [];
  for (const id of recommendation.inferenceIds ?? []) {
    if (inferenceById.has(id) && !inferenceIds.has(id)) {
      inferenceIds.add(id);
      pendingInferences.push(id);
    }
  }

  while (pendingInferences.length > 0) {
    const currentId = pendingInferences.pop();
    if (currentId === undefined) {
      break;
    }
    const inference = inferenceById.get(currentId);
    if (inference === undefined) {
      continue;
    }
    for (const basedOnId of inference.basedOn ?? []) {
      const signal = signalById.get(basedOnId);
      if (signal !== undefined) {
        signalIds.add(basedOnId);
        addEvidence(signal.evidenceIds);
        continue;
      }
      const assertion = assertionById.get(basedOnId);
      if (assertion !== undefined && assertion.classification === "validated") {
        assertionIds.add(basedOnId);
        addEvidence(assertion.evidenceIds);
        continue;
      }
      const nested = inferenceById.get(basedOnId);
      if (nested !== undefined && !inferenceIds.has(basedOnId)) {
        inferenceIds.add(basedOnId);
        pendingInferences.push(basedOnId);
      }
    }
  }

  // Preserve document order in result arrays.
  const constraints = (document.entities ?? []).filter((e) => constraintIds.has(e.id));
  const inferences = (document.inferences ?? []).filter((i) => inferenceIds.has(i.id));
  const signalsOut = (document.signals ?? []).filter((s) => signalIds.has(s.id));
  const assertionsOut = (document.assertions ?? []).filter((a) => assertionIds.has(a.id));
  const evidenceOut = (document.evidence ?? []).filter((e) => evidenceIds.has(e.id));

  return {
    found: true,
    recommendationId,
    recommendation,
    constraints,
    inferences,
    signals: signalsOut,
    assertions: assertionsOut,
    evidence: evidenceOut,
  };
}

function unresolvedConflictsIntersectingSupport(
  document: BusinessContextDocument,
  supportAssertionIds: ReadonlySet<Id>,
): readonly Conflict[] {
  const out: Conflict[] = [];
  for (const conflict of document.conflicts ?? []) {
    if (conflict.status !== "unresolved") {
      continue;
    }
    if (conflict.assertionIds.some((id) => supportAssertionIds.has(id))) {
      out.push(conflict);
    }
  }
  return out;
}

/**
 * Bounded deterministic recommendation assessment (DEC-REC-02).
 * Derives `rejected` only for hard constraint violations with caller evaluations.
 * Does not invent supported / stale / insufficient-evidence / conflicted.
 *
 * Precondition: document is L1+L2-valid (caller responsibility).
 *
 * @throws {RangeError} when `options.asOf` or `options.evaluatedAt` is not a valid instant
 */
export function assessRecommendation(
  document: BusinessContextDocument,
  recommendationId: Id,
  options?: RecommendationAssessmentOptions,
): RecommendationAssessmentResult {
  if (options?.asOf !== undefined) {
    parseDateTimeMs(options.asOf);
  }
  if (options?.evaluatedAt !== undefined) {
    parseDateTimeMs(options.evaluatedAt);
  }

  const support = buildRecommendationSupportGraph(document, recommendationId);
  if (!support.found) {
    return { found: false, recommendationId };
  }

  const recommendation = support.recommendation;
  const policyId = options?.policyId ?? DEFAULT_RECOMMENDATION_POLICY_ID;
  const entityById = new Map<Id, Entity>();
  for (const entity of document.entities ?? []) {
    if (!entityById.has(entity.id)) {
      entityById.set(entity.id, entity);
    }
  }

  const referencedConstraintIds = new Set(recommendation.constraintIds ?? []);
  const evaluationsByConstraintId = new Map<Id, boolean>();
  for (const evaluation of options?.constraintEvaluations ?? []) {
    if (!referencedConstraintIds.has(evaluation.constraintId)) {
      continue;
    }
    // First evaluation for a given constraintId wins (deterministic).
    if (!evaluationsByConstraintId.has(evaluation.constraintId)) {
      evaluationsByConstraintId.set(evaluation.constraintId, evaluation.violated);
    }
  }

  const evaluatedChecks: BoundedAssessmentCheck[] = [];
  const warningChecks: BoundedAssessmentWarning[] = [];
  const notEvaluableChecks: NotEvaluableAssessmentCheck[] = [];
  let hardViolation = false;

  for (const constraintId of recommendation.constraintIds ?? []) {
    const entity = entityById.get(constraintId);
    if (entity === undefined || entity.type !== "Constraint") {
      notEvaluableChecks.push({
        check: "constraint-compliance",
        constraintId,
        reason: "constraint-entity-not-resolved",
      });
      continue;
    }

    if (!evaluationsByConstraintId.has(constraintId)) {
      notEvaluableChecks.push({
        check: "constraint-compliance",
        constraintId,
        reason: "constraint-not-evaluated",
      });
      continue;
    }

    const violated = evaluationsByConstraintId.get(constraintId) === true;
    if (!violated) {
      evaluatedChecks.push({
        check: "constraint-compliance",
        outcome: "pass",
        constraintId,
      });
      continue;
    }

    if (isHardEnforcement(entity)) {
      hardViolation = true;
      evaluatedChecks.push({
        check: "constraint-compliance",
        outcome: "fail",
        constraintId,
      });
      continue;
    }

    if (isAdvisoryEnforcement(entity)) {
      warningChecks.push({
        check: "constraint-compliance",
        outcome: "warning",
        constraintId,
      });
      continue;
    }

    notEvaluableChecks.push({
      check: "constraint-compliance",
      constraintId,
      reason: "enforcement-not-evaluable",
    });
  }

  const supportAssertionIds = new Set(support.assertions.map((a) => a.id));
  const impactingConflicts = unresolvedConflictsIntersectingSupport(document, supportAssertionIds);
  if (impactingConflicts.length > 0) {
    warningChecks.push({
      check: "conflict-impact",
      outcome: "warning",
    });
  } else {
    evaluatedChecks.push({
      check: "conflict-impact",
      outcome: "pass",
    });
  }

  notEvaluableChecks.push({
    check: "evidence-threshold",
    reason: "no-normative-evidence-threshold",
  });
  notEvaluableChecks.push({
    check: "freshness-policy",
    reason: "no-normative-freshness-policy",
  });

  const result: RecommendationAssessmentFound = {
    found: true,
    recommendationId,
    policyId,
    support,
    evaluatedChecks,
    warningChecks,
    notEvaluableChecks,
    ...(hardViolation ? { derivedStatus: "rejected" as const } : {}),
    ...(options?.evaluatedAt !== undefined ? { evaluatedAt: options.evaluatedAt } : {}),
    ...(options?.asOf !== undefined ? { asOf: options.asOf } : {}),
  };

  return result;
}
