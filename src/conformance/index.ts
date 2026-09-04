/**
 * Public conformance runner surface (EVI-2.5).
 */

export type {
  ConformanceCaseInput,
  ConformanceCaseLevel,
  ConformanceCaseResult,
  ConformanceErrorIdentity,
  ConformanceExpectation,
  ConformanceStatus,
  ConformanceSuiteCounts,
  ConformanceSuiteOptions,
  ConformanceSuiteResult,
  ConformanceSummary,
  ContradictionExpectation,
  CurrentTruthExpectation,
  DiagnosticIdentity,
  ExpectedSemanticError,
  FactQualificationExpectation,
  HistoricalChangeExpectation,
  L4CategoryExpectation,
  RecommendationAssessmentExpectation,
  RecommendationPolicyExpectation,
  RoundTripExpectation,
  TemporalProjectionExpectation,
  ValidationExpectation,
} from "./types.js";

export { runConformanceCase, runConformanceSuite } from "./runner.js";
