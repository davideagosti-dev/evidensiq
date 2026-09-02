/**
 * @evidensiq/core public API — portable model, L1/L2 validation,
 * temporal / Fact / conflict semantics (EVI-2.3), projection /
 * bounded recommendation assessment (EVI-2.4), and portable
 * conformance runner (EVI-2.5).
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
} from "./conformance/index.js";
export { runConformanceCase, runConformanceSuite } from "./conformance/index.js";

export {
  CORE_RELATION_TYPES,
  DEFAULT_FACT_POLICY_ID,
  DEFAULT_RECOMMENDATION_POLICY_ID,
  KNOWN_ENTITY_TYPES,
  SPEC_VERSION,
} from "./constants.js";
export type { JsonArray, JsonObject, JsonPrimitive, JsonValue } from "./json.js";

export type {
  AcquisitionMethod,
  Assertion,
  AssertionClassification,
  AssessmentCheckResult,
  AssessmentMetadata,
  AssessmentOutcome,
  BusinessContextDocument,
  BusinessContextProjectionRequest,
  BusinessContextProjectionResult,
  ConfidenceDimensions,
  Conflict,
  ConflictKind,
  ConflictResolution,
  ConflictStatus,
  CoreRelationType,
  DateTime,
  Entity,
  EntityType,
  Evidence,
  EvidenceStrength,
  ExtensionKey,
  Extensions,
  ExternalIds,
  Id,
  Inference,
  InferenceConfidence,
  InferenceKind,
  KnownEntityType,
  Metadata,
  OriginScope,
  Recommendation,
  RecommendationStatus,
  Relation,
  RelationTraversal,
  RelationType,
  Signal,
  SignalStatus,
  SizeLimit,
  Source,
  SourceReliability,
  TrustAssessment,
  ValidationMetadata,
  ValidationResult,
} from "./model.js";

export type { JsonParseFailure, JsonParseResult, JsonParseSuccess } from "./parse.js";

export { isJsonValue, jsonEquals, parseJson, serializeJson } from "./parse.js";

export type {
  BoundedAssessmentCheck,
  BoundedAssessmentWarning,
  ConstraintEvaluation,
  ContradictionPreconditionResult,
  NotEvaluableAssessmentCheck,
  ProjectionOptions,
  RecommendationAssessmentFound,
  RecommendationAssessmentMissing,
  RecommendationAssessmentOptions,
  RecommendationAssessmentResult,
  RecommendationSupportGraphFound,
  RecommendationSupportGraphMissing,
  RecommendationSupportGraphResult,
  ValidityBounds,
} from "./semantics/index.js";
export {
  assessRecommendation,
  buildRecommendationSupportGraph,
  evaluateContradictionPreconditions,
  isAssertionActiveAt,
  isFactQualified,
  projectBusinessContext,
  selectCurrentFactAssertions,
  validityIntervalsOverlap,
} from "./semantics/index.js";

export type {
  BusinessContextValidationFailure,
  BusinessContextValidationResult,
  BusinessContextValidationSuccess,
  ConformanceLevel,
  Diagnostic,
  DiagnosticSeverity,
  L1ValidationFailure,
  L1ValidationResult,
  L1ValidationSuccess,
  L2ValidationResult,
} from "./validate.js";

export { validateBusinessContext, validateL1, validateL2 } from "./validate.js";
