/**
 * Business Context wire model — TypeScript projection of
 * specification/business-context.schema.json (v0.1).
 *
 * Phase 1 schema remains the authoritative semantic contract.
 * Optional fields use absence (exactOptionalPropertyTypes); absent ≠ null.
 * DateTime fields are ISO 8601 strings (not Date).
 * Fact is NOT a wire type — do not add facts[] or interface Fact.
 */

import type { CORE_RELATION_TYPES, KNOWN_ENTITY_TYPES } from "./constants.js";
import type { JsonValue } from "./json.js";

/** Opaque UTF-8 identifier. Unique within the document. */
export type Id = string;

/** ISO 8601 date-time string. No Date objects in the public model. */
export type DateTime = string;

/** Namespaced extension key (reverse-domain-style). Validated at L1 later. */
export type ExtensionKey = string;

/**
 * Controlled extension map. Unknown extensions MUST be preserved at L3.
 * Values remain JSON-safe; content is not interpreted.
 */
export type Extensions = { readonly [key: string]: JsonValue };

/** Namespaced external identifiers (string values only). */
export type ExternalIds = { readonly [key: string]: string };

export type OriginScope = "internal" | "external";

export type AcquisitionMethod = "user-provided" | "system-generated" | "imported" | "unknown";

export type TrustAssessment = "trusted" | "untrusted" | "unknown";

export interface ProvenanceMetadata {
  readonly originScope: OriginScope;
  readonly acquisitionMethod: AcquisitionMethod;
  readonly trustAssessment: TrustAssessment;
}

export type EvidenceStrength = "none" | "weak" | "moderate" | "strong";
export type SourceReliability = "low" | "moderate" | "high" | "unknown";
export type InferenceConfidence = "low" | "moderate" | "high";

export interface ConfidenceDimensions {
  readonly evidenceStrength?: EvidenceStrength;
  readonly sourceReliability?: SourceReliability;
  readonly inferenceConfidence?: InferenceConfidence;
}

export type ValidationResult = "valid" | "invalid";

export interface ValidationMetadata {
  readonly policyId: string;
  readonly evaluatedAt: DateTime;
  readonly result: ValidationResult;
}

export type AssessmentOutcome = "pass" | "fail" | "warning";

export interface AssessmentCheckResult {
  readonly check: string;
  readonly outcome: AssessmentOutcome;
}

export interface AssessmentMetadata {
  readonly evaluatedAt: DateTime;
  readonly policyId: string;
  readonly results: readonly AssessmentCheckResult[];
}

export type KnownEntityType = (typeof KNOWN_ENTITY_TYPES)[number];

/**
 * Entity.type is open / extensible on the wire.
 * Known literals are available for ergonomics without closing the union.
 */
export type EntityType = KnownEntityType | (string & {});

export interface Entity {
  readonly id: Id;
  readonly type: EntityType;
  readonly name?: string;
  readonly description?: string;
  readonly validFrom?: DateTime;
  readonly validUntil?: DateTime;
  readonly observedAt?: DateTime;
  readonly evidenceIds?: readonly Id[];
  readonly externalIds?: ExternalIds;
  /** Entity-specific business attributes. Not schema extensions. */
  readonly properties?: { readonly [key: string]: JsonValue };
  readonly extensions?: Extensions;
}

export type CoreRelationType = (typeof CORE_RELATION_TYPES)[number];

/**
 * Core relation type or namespaced extension type.
 * Extension forms follow Phase 1 ExtensionKey patterning (validated later).
 */
export type RelationType = CoreRelationType | (string & {});

export interface Relation {
  readonly id: Id;
  readonly from: Id;
  readonly to: Id;
  readonly type: RelationType;
  readonly validFrom?: DateTime;
  readonly validUntil?: DateTime;
  readonly evidenceIds?: readonly Id[];
  readonly externalIds?: ExternalIds;
  readonly extensions?: Extensions;
}

export interface Source {
  readonly id: Id;
  readonly type: "Source";
  readonly name?: string;
  readonly reference?: string;
  readonly provenance: ProvenanceMetadata;
  readonly externalIds?: ExternalIds;
  readonly extensions?: Extensions;
}

export interface Evidence {
  readonly id: Id;
  readonly type: "Evidence";
  readonly sourceId: Id;
  readonly contentRef?: string;
  readonly observedAt?: DateTime;
  readonly provenance?: ProvenanceMetadata;
  readonly description?: string;
  readonly externalIds?: ExternalIds;
  readonly extensions?: Extensions;
}

export type AssertionClassification = "asserted" | "validated" | "superseded" | "retracted";

export interface Assertion {
  readonly id: Id;
  readonly type: "Assertion";
  readonly subject: Id;
  readonly predicate: string;
  /** Schema-unconstrained JSON data (not any / unknown in accepted model). */
  readonly value: JsonValue;
  readonly evidenceIds: readonly Id[];
  readonly observedAt: DateTime;
  readonly classification: AssertionClassification;
  readonly validFrom?: DateTime;
  readonly validUntil?: DateTime;
  readonly provenance?: ProvenanceMetadata;
  readonly confidence?: ConfidenceDimensions;
  readonly validation?: ValidationMetadata;
  readonly supersededBy?: Id;
  readonly externalIds?: ExternalIds;
  readonly extensions?: Extensions;
}

export type SignalStatus = "active" | "resolved" | "superseded";

export interface Signal {
  readonly id: Id;
  readonly type: "Signal";
  readonly description?: string;
  readonly evidenceIds?: readonly Id[];
  readonly observedAt?: DateTime;
  readonly status?: SignalStatus;
  readonly confidence?: ConfidenceDimensions;
  readonly externalIds?: ExternalIds;
  readonly extensions?: Extensions;
}

export type InferenceKind = "analytical" | "opportunity" | "risk";

export interface Inference {
  readonly id: Id;
  readonly type: "Inference";
  readonly description?: string;
  readonly inferenceKind?: InferenceKind;
  readonly basedOn?: readonly Id[];
  readonly confidence?: ConfidenceDimensions;
  readonly externalIds?: ExternalIds;
  readonly extensions?: Extensions;
}

export type RecommendationStatus =
  | "candidate"
  | "supported"
  | "insufficient-evidence"
  | "conflicted"
  | "stale"
  | "rejected";

export interface Recommendation {
  readonly id: Id;
  readonly type: "Recommendation";
  readonly description?: string;
  readonly rationale?: string;
  readonly status: RecommendationStatus;
  readonly evidenceIds?: readonly Id[];
  readonly inferenceIds?: readonly Id[];
  readonly constraintIds?: readonly Id[];
  readonly confidence?: ConfidenceDimensions;
  readonly assessment?: AssessmentMetadata;
  readonly externalIds?: ExternalIds;
  readonly extensions?: Extensions;
}

export type ConflictKind = "contradiction" | "uncertainty";
export type ConflictStatus = "unresolved" | "acknowledged" | "resolved";

export interface ConflictResolution {
  readonly method?: string;
  readonly resolvedAt?: DateTime;
  readonly note?: string;
  readonly preferredAssertionId?: Id;
}

/** Conflict has no type discriminator in Phase 1 schema. */
export interface Conflict {
  readonly id: Id;
  readonly assertionIds: readonly Id[];
  readonly conflictKind: ConflictKind;
  readonly status: ConflictStatus;
  readonly resolution?: ConflictResolution;
  readonly externalIds?: ExternalIds;
  readonly extensions?: Extensions;
}

export interface Metadata {
  readonly createdAt?: DateTime;
  readonly updatedAt?: DateTime;
  readonly generator?: string;
  readonly extensions?: Extensions;
}

/**
 * Root Business Context document wire structure.
 * Fact is a semantic view over Assertion — there is no facts collection.
 */
export interface BusinessContextDocument {
  readonly $schema?: string;
  readonly specVersion: "0.1";
  readonly organizationId: Id;
  readonly entities?: readonly Entity[];
  readonly relations?: readonly Relation[];
  readonly sources?: readonly Source[];
  readonly evidence?: readonly Evidence[];
  readonly assertions?: readonly Assertion[];
  readonly signals?: readonly Signal[];
  readonly inferences?: readonly Inference[];
  readonly recommendations?: readonly Recommendation[];
  readonly conflicts?: readonly Conflict[];
  readonly metadata?: Metadata;
}

export interface RelationTraversal {
  readonly maxDepth?: number;
}

export interface SizeLimit {
  readonly maxItems?: number;
  readonly maxCharacters?: number;
  readonly maxBytes?: number;
}

/** Provider-neutral projection request (not a root persisted property). */
export interface BusinessContextProjectionRequest {
  readonly objective?: string;
  readonly domains?: readonly string[];
  readonly entityIds?: readonly Id[];
  readonly relationTraversal?: RelationTraversal;
  readonly asOf?: DateTime;
  readonly includeConflicts?: boolean;
  readonly evidencePolicy?: string;
  readonly sizeLimit?: SizeLimit;
  readonly ordering?: string;
  readonly extensions?: Extensions;
}

/** Provider-neutral projection result (not a root persisted property). */
export interface BusinessContextProjectionResult {
  readonly projectedAt?: DateTime;
  readonly asOf?: DateTime;
  readonly entities?: readonly Entity[];
  readonly relations?: readonly Relation[];
  readonly assertions?: readonly Assertion[];
  readonly signals?: readonly Signal[];
  readonly inferences?: readonly Inference[];
  readonly recommendations?: readonly Recommendation[];
  readonly conflicts?: readonly Conflict[];
  readonly evidence?: readonly Evidence[];
  /** Sources referenced by included Evidence (document order). Omitted when empty. */
  readonly sources?: readonly Source[];
  readonly truncated?: boolean;
  readonly truncationReason?: string;
  readonly extensions?: Extensions;
}
