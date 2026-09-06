/**
 * Portable conformance runner types (EVI-2.5).
 * Distinct from validator ConformanceLevel ("L1"|"L2").
 */

import type { JsonValue } from "../json.js";
import type { DateTime, Id } from "../model.js";
import type { ConstraintEvaluation } from "../semantics/recommendation.js";

/** Runner case levels — includes L3/L4; does not widen validator ConformanceLevel. */
export type ConformanceCaseLevel = "L1" | "L2" | "L3" | "L4";

export type ConformanceStatus = "pass" | "fail" | "skip";

/** Stable diagnostic identity for oracle matching (message excluded). */
export type DiagnosticIdentity = {
  readonly ruleId: string;
  readonly level: string;
  readonly severity: string;
  readonly path: string;
};

export type ExpectedSemanticError = {
  readonly name: string;
};

export type ValidationExpectation = {
  readonly kind: "validation";
  readonly expectedValid: boolean;
  readonly expectedDiagnostics?: readonly DiagnosticIdentity[];
};

export type RoundTripExpectation = {
  readonly kind: "roundTripJsonEquals";
};

export type FactQualificationExpectation = {
  readonly kind: "fact-qualification";
  readonly factAssertionIds: readonly Id[];
  readonly nonFactAssertionIds: readonly Id[];
  readonly persistedFactObjectsExpected: false;
};

export type CurrentTruthExpectation = {
  readonly kind: "current-truth";
  readonly asOf: DateTime;
  readonly includedInCurrentTruth: readonly Id[];
  readonly excludedFromCurrentTruth: readonly Id[];
  readonly nonFactAssertionIds: readonly Id[];
};

export type HistoricalChangeExpectation = {
  readonly kind: "historical-change";
  readonly assertionIds: readonly Id[];
  readonly historicalChange: true;
  readonly conflictExpected: false;
  readonly inferredSupersessionExpected: false;
};

export type ContradictionExpectation = {
  readonly kind: "contradiction";
  readonly assertionIds: readonly Id[];
  readonly contradictionExpected: true;
  readonly conflictId: Id;
  readonly preservedAssertionIds: readonly Id[];
  readonly preservedEvidenceIds: readonly Id[];
};

export type RecommendationAssessmentExpectation = {
  readonly kind: "recommendation-assessment";
  readonly assessmentRequiredRecommendationIds: readonly Id[];
  readonly assessmentExpected: true;
  readonly assessmentOptionalRecommendationIds?: readonly Id[];
};

export type RecommendationPolicyExpectation = {
  readonly kind: "recommendation-policy";
  readonly recommendationId: Id;
  readonly expectedStatus: "rejected";
  readonly expectedAssessmentCheck: {
    readonly name: "constraint-compliance";
    readonly result: "fail";
  };
  readonly conflictedExpected: false;
  readonly constraintEvaluations: readonly ConstraintEvaluation[];
};

export type TemporalProjectionExpectation = {
  readonly kind: "temporal-projection";
  readonly projectionRequest: {
    readonly asOf: DateTime;
    readonly includeConflicts: boolean;
  };
  readonly expected: {
    readonly activeAssertionIds: readonly Id[];
    readonly inactiveAssertionIds: readonly Id[];
    readonly visibleConflictIds: readonly Id[];
  };
};

/** Ordered Source ID list — document order is significant (EVI-L4-013). */
export type ProjectionSourceClosureCase = {
  readonly caseId: string;
  readonly projectionRequest: {
    readonly entityIds?: readonly Id[];
    readonly relationTraversal?: {
      readonly maxDepth?: number;
    };
  };
  /** Expected projected Evidence IDs (set semantics). */
  readonly expectedEvidenceIds: readonly Id[];
  /**
   * Expected projected Source IDs in document.sources order.
   * Empty array means `sources` MUST be omitted from the projection result.
   */
  readonly expectedSourceIds: readonly Id[];
};

export type ProjectionSourceClosureExpectation = {
  readonly kind: "projection-source-closure";
  readonly cases: readonly ProjectionSourceClosureCase[];
};

/** Closed L4 category expectation discriminants (DATA ≠ INSTRUCTION). */
export type L4CategoryExpectation =
  | FactQualificationExpectation
  | CurrentTruthExpectation
  | HistoricalChangeExpectation
  | ContradictionExpectation
  | RecommendationAssessmentExpectation
  | RecommendationPolicyExpectation
  | TemporalProjectionExpectation
  | ProjectionSourceClosureExpectation;

export type ConformanceExpectation =
  | ValidationExpectation
  | RoundTripExpectation
  | L4CategoryExpectation;

/**
 * In-memory conformance case. No repository paths.
 * Skip must be explicit (`skip: true`) when deferred.
 */
export type ConformanceCaseInput = {
  readonly caseId: string;
  readonly level: ConformanceCaseLevel;
  readonly ruleIds?: readonly string[];
  readonly document?: unknown;
  readonly expectation?: ConformanceExpectation;
  readonly skip?: true;
  readonly skipReason?: string;
  readonly expectedError?: ExpectedSemanticError;
  readonly notes?: string;
};

export type ConformanceErrorIdentity = {
  readonly name: string;
};

/** JSON-safe stable summaries for expected/actual comparison. */
export type ConformanceSummary = JsonValue;

export type ConformanceCaseResult = {
  readonly caseId: string;
  readonly level: ConformanceCaseLevel;
  readonly ruleIds: readonly string[];
  readonly status: ConformanceStatus;
  readonly expected: ConformanceSummary;
  readonly actual: ConformanceSummary;
  readonly diagnostics?: readonly DiagnosticIdentity[];
  readonly expectedError?: ConformanceErrorIdentity;
  readonly actualError?: ConformanceErrorIdentity;
  readonly reason?: string;
  readonly notes?: string;
};

export type ConformanceSuiteCounts = {
  readonly pass: number;
  readonly fail: number;
  readonly skip: number;
};

export type ConformanceSuiteOptions = {
  readonly failFast?: boolean;
};

export type ConformanceSuiteResult = {
  readonly results: readonly ConformanceCaseResult[];
  readonly counts: ConformanceSuiteCounts;
  /** true iff fail === 0 (skips alone do not make ok false). */
  readonly ok: boolean;
};
