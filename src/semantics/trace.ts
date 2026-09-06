import type {
  AssessmentCheckResult,
  BusinessContextDocument,
  BusinessContextProjectionResult,
  DateTime,
  Id,
  Recommendation,
} from "../model.js";
import {
  assessRecommendation,
  type RecommendationAssessmentOptions,
} from "./recommendation.js";

export type ProjectionTraceSurface = {
  readonly kind: "projection";
  readonly projectedAt?: DateTime;
  readonly asOf?: DateTime;
  readonly entityIds: readonly Id[];
  readonly relationIds: readonly Id[];
  readonly assertionIds: readonly Id[];
  readonly signalIds: readonly Id[];
  readonly inferenceIds: readonly Id[];
  readonly recommendationIds: readonly Id[];
  readonly conflictIds: readonly Id[];
  readonly evidenceIds: readonly Id[];
  readonly sourceIds: readonly Id[];
};

export type RecommendationTraceSupport = {
  readonly constraintIds: readonly Id[];
  readonly inferenceIds: readonly Id[];
  readonly signalIds: readonly Id[];
  readonly assertionIds: readonly Id[];
  readonly evidenceIds: readonly Id[];
  readonly sourceIds: readonly Id[];
  readonly conflictIds: readonly Id[];
};

export type RecommendationRuntimeAssessmentTrace = {
  readonly policyId: string;
  readonly derivedStatus?: Recommendation["status"];
  readonly evaluatedAt?: DateTime;
  readonly asOf?: DateTime;
  readonly evaluatedChecks: readonly AssessmentCheckResult[];
  readonly warningChecks: readonly AssessmentCheckResult[];
  readonly notEvaluableChecks: readonly {
    readonly check: string;
    readonly reason: string;
    readonly constraintId?: Id;
  }[];
};

export type RecommendationPersistedAssessmentTrace = {
  readonly policyId: string;
  readonly evaluatedAt: DateTime;
  readonly results: readonly AssessmentCheckResult[];
};

export type RecommendationTraceFound = {
  readonly found: true;
  readonly kind: "recommendation";
  readonly recommendationId: Id;
  readonly status: Recommendation["status"];
  readonly support: RecommendationTraceSupport;
  readonly persistedAssessment?: RecommendationPersistedAssessmentTrace;
  readonly runtimeAssessment: RecommendationRuntimeAssessmentTrace;
};

export type RecommendationTraceMissing = {
  readonly found: false;
  readonly kind: "recommendation";
  readonly recommendationId: Id;
};

export type RecommendationTraceSurface =
  | RecommendationTraceFound
  | RecommendationTraceMissing;

function sourceIdsInDocumentOrder(
  document: BusinessContextDocument,
  evidenceIds: readonly Id[],
): readonly Id[] {
  const evidenceById = new Map((document.evidence ?? []).map((item) => [item.id, item] as const));
  const referenced = new Set<Id>();
  for (const evidenceId of evidenceIds) {
    const evidence = evidenceById.get(evidenceId);
    if (evidence !== undefined) {
      referenced.add(evidence.sourceId);
    }
  }
  return (document.sources ?? [])
    .filter((source) => referenced.has(source.id))
    .map((source) => source.id);
}

function unresolvedConflictIdsForAssertions(
  document: BusinessContextDocument,
  assertionIds: ReadonlySet<Id>,
): readonly Id[] {
  return (document.conflicts ?? [])
    .filter(
      (conflict) =>
        conflict.status === "unresolved" &&
        conflict.assertionIds.some((assertionId) => assertionIds.has(assertionId)),
    )
    .map((conflict) => conflict.id);
}

export function buildProjectionTrace(
  result: BusinessContextProjectionResult,
): ProjectionTraceSurface {
  return {
    kind: "projection",
    ...(result.projectedAt !== undefined ? { projectedAt: result.projectedAt } : {}),
    ...(result.asOf !== undefined ? { asOf: result.asOf } : {}),
    entityIds: (result.entities ?? []).map((item) => item.id),
    relationIds: (result.relations ?? []).map((item) => item.id),
    assertionIds: (result.assertions ?? []).map((item) => item.id),
    signalIds: (result.signals ?? []).map((item) => item.id),
    inferenceIds: (result.inferences ?? []).map((item) => item.id),
    recommendationIds: (result.recommendations ?? []).map((item) => item.id),
    conflictIds: (result.conflicts ?? []).map((item) => item.id),
    evidenceIds: (result.evidence ?? []).map((item) => item.id),
    sourceIds: (result.sources ?? []).map((item) => item.id),
  };
}

export function buildRecommendationTrace(
  document: BusinessContextDocument,
  recommendationId: Id,
  options?: RecommendationAssessmentOptions,
): RecommendationTraceSurface {
  const assessment = assessRecommendation(document, recommendationId, options);
  if (!assessment.found) {
    return {
      found: false,
      kind: "recommendation",
      recommendationId,
    };
  }

  const support = assessment.support;
  const evidenceIds = support.evidence.map((item) => item.id);
  const assertionIds = new Set(support.assertions.map((item) => item.id));

  return {
    found: true,
    kind: "recommendation",
    recommendationId,
    status: support.recommendation.status,
    support: {
      constraintIds: support.constraints.map((item) => item.id),
      inferenceIds: support.inferences.map((item) => item.id),
      signalIds: support.signals.map((item) => item.id),
      assertionIds: support.assertions.map((item) => item.id),
      evidenceIds,
      sourceIds: sourceIdsInDocumentOrder(document, evidenceIds),
      conflictIds: unresolvedConflictIdsForAssertions(document, assertionIds),
    },
    ...(support.recommendation.assessment !== undefined
      ? {
          persistedAssessment: {
            policyId: support.recommendation.assessment.policyId,
            evaluatedAt: support.recommendation.assessment.evaluatedAt,
            results: support.recommendation.assessment.results,
          },
        }
      : {}),
    runtimeAssessment: {
      policyId: assessment.policyId,
      ...(assessment.derivedStatus !== undefined
        ? { derivedStatus: assessment.derivedStatus }
        : {}),
      ...(assessment.evaluatedAt !== undefined ? { evaluatedAt: assessment.evaluatedAt } : {}),
      ...(assessment.asOf !== undefined ? { asOf: assessment.asOf } : {}),
      evaluatedChecks: assessment.evaluatedChecks,
      warningChecks: assessment.warningChecks,
      notEvaluableChecks: assessment.notEvaluableChecks,
    },
  };
}
