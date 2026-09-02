/**
 * Normative constants from Evidensiq Business Context Specification v0.1.
 * Package semver is independent of specVersion.
 */

export const SPEC_VERSION = "0.1" as const;

/** Default Fact validation policy ID (Phase 1). */
export const DEFAULT_FACT_POLICY_ID = "evidensiq.default-fact-v0.1" as const;

/** Default recommendation assessment policy ID (Phase 1). */
export const DEFAULT_RECOMMENDATION_POLICY_ID = "evidensiq.default-recommendation-v0.1" as const;

/** Approved v0.1 core relation vocabulary (Entity → Entity only). */
export const CORE_RELATION_TYPES = [
  "targets",
  "acquiredVia",
  "produces",
  "measures",
  "constrains",
  "competesWith",
  "partOf",
] as const;

/** Known entity primitive type literals (open wire type remains string). */
export const KNOWN_ENTITY_TYPES = [
  "Organization",
  "Product",
  "Service",
  "CustomerSegment",
  "Channel",
  "Process",
  "Metric",
  "Goal",
  "Constraint",
  "Competitor",
] as const;
