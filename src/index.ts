/**
 * @evidensiq/core public API — EVI-2.1 portable model foundation.
 */

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
