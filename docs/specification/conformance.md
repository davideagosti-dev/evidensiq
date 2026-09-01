# Conformance Model

This document defines the Evidensiq conformance model for Business Context Specification v0.1. Conformance is organized into exactly four levels with stable rule identifiers.

Evaluation (scenario assertions) is defined separately in [evaluation.md](evaluation.md).

## Overview

| Level | Name | Scope |
|-------|------|-------|
| L1 | Structural Conformance | JSON Schema validation |
| L2 | Semantic Conformance | Document integrity and reference rules |
| L3 | Serialization Conformance | Portable round-trip semantics |
| L4 | Behavioral Conformance | Deterministic policy evaluation and derived outcomes |

Policy-derived behavior belongs in L4, not L3.

---

## Diagnostic Contract

Every conformance diagnostic emitted by a conformant validator or evaluator MUST include:

| Field | Type | Description |
|-------|------|-------------|
| `ruleId` | string | Stable machine identifier (`EVI-L[1-4]-NNN`) |
| `level` | enum | `L1`, `L2`, `L3`, or `L4` |
| `severity` | enum | `error` or `warning` |
| `path` | string | RFC 6901 JSON Pointer to the diagnostic location |
| `message` | string | Human-readable diagnostic text |

### Normative Enums

**level:** `L1`, `L2`, `L3`, `L4`

**severity:** `error`, `warning` — no `info` severity in v0.1

**path:** RFC 6901 JSON Pointer (e.g., `/assertions/0/evidenceIds`)

**message:** Human-readable text. Message wording is **not** a conformance-stable identifier. `ruleId` is the stable machine identifier.

The following fields are **not** part of the v0.1 diagnostic contract: `relatedPaths`, `relatedIds`, `policyId`.

---

## Level Pass Semantics

| Level | Pass Condition |
|-------|----------------|
| **L1 PASS** | Zero L1 errors |
| **L2 PASS** | L1 pass + zero L2 errors. L2 **warnings permitted** |
| **L3 PASS** | L2 pass + zero L3 errors |
| **L4 PASS** | L3 pass + zero errors for all normative L4 behaviors claimed by the implementation |

An implementation **MUST NOT** claim conformance for undefined or non-normative behavior merely because it chose an implementation-specific policy.

### Conformance Claims

| Claim | Requires |
|-------|----------|
| L1 conformant | Passes all L1 structural checks |
| L2 conformant | Passes L1 + all L2 semantic checks (warnings allowed) |
| L3 conformant | Passes L1 + L2 + all L3 serialization checks |
| L4 conformant | Passes L1 + L2 + L3 + all normative L4 behavioral checks |

Higher levels subsume lower levels.

---

## Rule Classification

Each entry in the rule registry is classified as one of:

| Classification | Meaning |
|----------------|---------|
| **NORMATIVE RULE** | Required for conformance at the stated level |
| **TEST DESIGN DECISION** | How fixtures will exercise the rule; not additional normative requirement |
| **NON-NORMATIVE GUIDANCE** | Informational; not required for conformance claims |

---

## L1 — Structural Conformance

Validates against `specification/business-context.schema.json` (Draft 2020-12). L1 rules map high-value structural semantics; individual JSON Schema keywords are consolidated where they express one semantic requirement.

### EVI-L1-001 — Root Required Fields

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L1 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Root document MUST include `specVersion` and `organizationId`. |
| **Source** | `business-context.schema.json` root `required` |

### EVI-L1-002 — specVersion Value

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L1 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | `specVersion` MUST equal `"0.1"`. |
| **Source** | `business-context.schema.json` `specVersion.const` |

### EVI-L1-003 — Closed Normative Objects

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L1 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Normative domain objects (Entity, Relation, Source, Evidence, Assertion, Signal, Inference, Recommendation, Conflict, and nested normative objects) MUST NOT contain properties outside their schema definitions (`additionalProperties: false`). Root document is closed. |
| **Source** | Schema closed-object pattern |

### EVI-L1-004 — Entity Shape

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L1 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Every Entity MUST include `id` and `type`. |
| **Source** | `Entity.required` |

### EVI-L1-005 — Source Provenance

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L1 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Every Source MUST include `id`, `type` = `"Source"`, and `provenance` with required `originScope`, `acquisitionMethod`, and `trustAssessment`. |
| **Source** | `Source.required`, `ProvenanceMetadata` |

### EVI-L1-006 — Evidence sourceId

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L1 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Every Evidence MUST include `id`, `type` = `"Evidence"`, and `sourceId`. |
| **Source** | `Evidence.required` |

### EVI-L1-007 — Assertion Required Shape

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L1 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Every Assertion MUST include `id`, `type` = `"Assertion"`, `subject`, `predicate`, `value`, `evidenceIds`, `observedAt`, and `classification`. |
| **Source** | `Assertion.required` |

### EVI-L1-008 — evidenceIds Non-Empty

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L1 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | `Assertion.evidenceIds` MUST contain at least one ID (`minItems: 1`). |
| **Source** | `Assertion.evidenceIds.minItems` |

### EVI-L1-009 — Validated Requires Validation

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L1 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | When `Assertion.classification` = `"validated"`, `validation` metadata with `policyId`, `evaluatedAt`, and `result` MUST be present. |
| **Source** | `Assertion.allOf` conditional |

### EVI-L1-010 — Superseded Requires supersededBy

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L1 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | When `Assertion.classification` = `"superseded"`, `supersededBy` MUST be present. |
| **Source** | `Assertion.allOf` conditional |

### EVI-L1-011 — Classification Enum

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L1 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | `Assertion.classification` MUST be one of: `asserted`, `validated`, `superseded`, `retracted`. |
| **Source** | `Assertion.classification.enum` |

### EVI-L1-012 — Relation Type

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L1 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Every Relation MUST include `id`, `from`, `to`, and `type`. `type` MUST be a core relation type or a namespaced extension type matching the approved pattern. |
| **Source** | `Relation.required`, `CoreRelationType`, extension pattern |

### EVI-L1-013 — Extension Namespace Keys

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L1 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Extension and external ID keys MUST match reverse-domain-style namespace pattern (`ExtensionKey`). |
| **Source** | `ExtensionKey.pattern` |

### EVI-L1-014 — Conflict Structure

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L1 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Every Conflict MUST include `id`, `assertionIds` (minimum 2), `conflictKind`, and `status`. |
| **Source** | `Conflict.required`, `Conflict.assertionIds.minItems` |

### EVI-L1-015 — Recommendation Status and Assessment

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L1 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Every Recommendation MUST include `id`, `type` = `"Recommendation"`, and `status`. When `status` ≠ `"candidate"`, `assessment` with `evaluatedAt`, `policyId`, and `results` MUST be present. |
| **Source** | `Recommendation.required`, `Recommendation.allOf` conditional |

### EVI-L1-016 — DateTime Format

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L1 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | All DateTime fields MUST be ISO 8601 strings with `format: date-time`. |
| **Source** | `DateTime` definition |

### EVI-L1-017 — Non-Empty IDs

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L1 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | All ID fields MUST be non-empty strings (`minLength: 1`). |
| **Source** | `Id.minLength` |

### EVI-L1-018 — Prohibited Constructs

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L1 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Document MUST NOT contain prohibited constructs: `facts` collection, `Fact` type, `TrustClassification`, `Conflict.values`, or `modelConfidence`. |
| **Source** | business-context-spec.md design principles |

### L1 Tools

Any JSON Schema Draft 2020-12 validator may be used. L1 alone does not guarantee semantic correctness.

---

## L2 — Semantic Conformance

L2 rules extend L1 with document-wide integrity checks.

### EVI-L2-001 — Document-Wide ID Uniqueness

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L2 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | All IDs MUST be unique within the document. |

### EVI-L2-002 — Case-Sensitive Unicode Ordinal ID Comparison

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L2 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | ID comparison and uniqueness checks MUST use case-sensitive Unicode ordinal comparison. IDs differing only by case are distinct. |

### EVI-L2-003 — organizationId Resolves to Organization

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L2 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Root `organizationId` MUST resolve to an Entity in `entities` where `type` = `"Organization"`. Resolution to any other Entity type is an error. |

**Documentation correction:** `organizationId` MUST resolve specifically to the canonical Organization entity, not merely any Entity.

### EVI-L2-004 — Relation Endpoints Resolve to Entity

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L2 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | `Relation.from` and `Relation.to` MUST each resolve to an Entity in `entities`. |

### EVI-L2-005 — Evidence sourceId Resolves to Source

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L2 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | `Evidence.sourceId` MUST resolve to a Source in `sources`. |

### EVI-L2-006 — Assertion Subject Resolves to Entity

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L2 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | `Assertion.subject` MUST resolve to an Entity in `entities`. |

### EVI-L2-007 — Assertion evidenceIds Resolve to Evidence

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L2 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Every ID in `Assertion.evidenceIds` MUST resolve to an Evidence in `evidence`. |

### EVI-L2-008 — supersededBy Resolves to Assertion

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L2 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | When present, `Assertion.supersededBy` MUST resolve to an Assertion in `assertions`. |

### EVI-L2-009 — No Supersession Chains

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L2 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | An Assertion referenced by `supersededBy` MUST NOT itself have `classification` = `"superseded"`. Supersession chains without explicit design are prohibited. |

### EVI-L2-010 — Conflict assertionIds Resolve

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L2 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Every ID in `Conflict.assertionIds` MUST resolve to an Assertion in `assertions`. |

### EVI-L2-011 — Conflict Distinct Assertions

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L2 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | `Conflict.assertionIds` MUST contain at least two **distinct** Assertion IDs. |

### EVI-L2-012 — Temporal Interval Validity

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L2 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | When both `validFrom` and `validUntil` are present, `validUntil` MUST be strictly greater than `validFrom`. |

### EVI-L2-013 — Half-Open Temporal Semantics

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L2 |
| **Severity** | error |
| **Machine-testable** | yes (when temporal evaluation is performed) |
| **Requirement** | Valid-time intervals use `[validFrom, validUntil)` semantics: inclusive start, exclusive end. Missing `validFrom` means unbounded past; missing `validUntil` means unbounded future. |

### EVI-L2-014 — Recommendation References Resolve

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L2 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | When present: `Recommendation.evidenceIds` → Evidence; `Recommendation.inferenceIds` → Inference; `Recommendation.constraintIds` → Entity (Constraint). |

### EVI-L2-015 — Signal evidenceIds Resolve

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L2 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | When present, every ID in `Signal.evidenceIds` MUST resolve to an Evidence in `evidence`. |

### EVI-L2-016 — Inference basedOn Target Semantics

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L2 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | When present, every ID in `Inference.basedOn` MUST resolve to one of the following permitted target categories: **Signal** (`type` = `"Signal"`), **validated Assertion** (`type` = `"Assertion"` and `classification` = `"validated"`), or **Inference** (`type` = `"Inference"`). References to Evidence, Source, Entity, Relation, Recommendation, Conflict, or non-validated Assertion are errors. |
| **Source** | `Inference.basedOn` schema description: "IDs of signals, validated assertions, or other inferences." |

### EVI-L2-017 — externalIds Excluded from Internal Resolution

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L2 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | `externalIds` values MUST NOT participate in internal reference resolution. Only document `id` fields resolve references. |

### EVI-L2-018 — Contradiction Subject/Predicate Mismatch

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L2 |
| **Severity** | **warning** |
| **Machine-testable** | yes |
| **Requirement** | For `Conflict.conflictKind` = `"contradiction"`, referenced Assertions SHOULD share the same `subject` and `predicate`. Mismatch produces an L2 **warning**, not an error. Warnings do NOT fail L2. |

### EVI-L2-019 — Core Relation Endpoint-Type Mismatch

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L2 |
| **Severity** | **warning** |
| **Machine-testable** | yes |
| **Requirement** | For known core relation types, endpoint Entity types that do not match expected patterns produce an L2 **warning** in v0.1. Warnings do NOT fail L2. Example: `Product → targets → CustomerSegment` is expected; mismatches warn but do not fail L2. |

---

## L3 — Serialization Conformance

L3 ensures portable serialization semantics across implementations. **Byte-identical JSON is NOT required.** Parsed JSON tree / portable semantic equality is the normative target.

Pretty-printing, whitespace, and object property ordering are **not** conformance requirements.

### EVI-L3-001 — Absent vs Null

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L3 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Absent means unspecified. `null` is prohibited for normative fields unless an explicit field definition states otherwise. |

### EVI-L3-002 — UTC DateTime Normalization

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L3 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Conformance fixtures normalize DateTime values to UTC with `Z` suffix. Round-trip MUST preserve temporal instant semantics. |

### EVI-L3-003 — IEEE 754 Double Semantics

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L3 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | JSON numbers follow IEEE 754 double semantics. Integer values within safe integer range MUST round-trip without loss. |

### EVI-L3-004 — Array Order Preservation

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L3 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Array element order MUST be preserved during round-trip. Semantic significance of order is NOT assumed unless explicitly stated. |

### EVI-L3-005 — Object Member Order Non-Semantic

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L3 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Object property order is not semantically significant. Implementations MUST NOT rely on key order. |

### EVI-L3-006 — Unknown Extension Preservation

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L3 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Unknown namespaced extension keys MUST be preserved during round-trip. Implementations MUST NOT silently drop unrecognized `extensions` entries. |

### EVI-L3-007 — externalIds Preservation

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L3 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | `externalIds` objects and their values MUST be preserved during round-trip. |

### EVI-L3-008 — Unicode Preservation

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L3 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Unicode string content MUST be preserved during round-trip without normalization unless explicitly documented. |

### EVI-L3-009 — Parsed JSON Tree Equality

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L3 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Serialize → deserialize → serialize MUST produce parsed JSON trees that are semantically equivalent. Unknown extensions preserved. Byte-identical output is NOT required. |

### EVI-L3-010 — Enum Preservation

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L3 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Closed enum string values MUST round-trip without transformation. |

---

## L4 — Behavioral Conformance

L4 defines reproducible policy evaluation and derived outcomes for behavior that is **deterministic under v0.1**. Behavior whose policy is not normatively defined is explicitly classified as not currently eligible for normative L4 conformance tests (see Policy Gap Register).

### EVI-L4-001 — Fact Qualification

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L4 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | An Assertion qualifies as a Fact (semantic view) when: `classification` = `"validated"`, `validation.result` = `"valid"`, and `validation.policyId` is recorded. Default policy: `evidensiq.default-fact-v0.1`. |

### EVI-L4-002 — No Persisted Fact Object

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L4 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Fact is a semantic view over validated Assertions. There is no `facts` collection and no persisted `Fact` type. |

### EVI-L4-003 — Superseded Assertion Excluded from Current Truth

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L4 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Assertions with `classification` = `"superseded"` MUST be excluded from current truth. The replacement Assertion (via `supersededBy`) is the current value when otherwise valid. |

### EVI-L4-004 — Retracted Assertion Excluded from Fact Qualification

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L4 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Assertions with `classification` = `"retracted"` MUST NOT qualify as current Facts. |

### EVI-L4-005 — Historical Change Is Not Contradiction

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L4 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Same subject and predicate with non-overlapping valid-time intervals under `[validFrom, validUntil)` semantics represent historical change, NOT contradiction. No Conflict is inferred. |

### EVI-L4-006 — Supersession Never Inferred from Temporal Value

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L4 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Supersession is explicit only. A later temporal value MUST NOT automatically supersede an earlier assertion. Supersession requires `classification` = `"superseded"` and `supersededBy`. |

### EVI-L4-007 — Contradiction Preconditions

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L4 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Contradiction requires: same `subject`, same `predicate`, overlapping valid-time intervals under half-open semantics, and incompatible `value`. Historical non-overlap is NOT contradiction. |

### EVI-L4-008 — Conflict Resolution Preserves Underlying Data

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L4 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Conflict resolution MUST NOT delete Evidence, Assertions, or provenance. Underlying objects remain in the document. |

### EVI-L4-009 — Assessment Required for Non-Candidate Recommendation

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L4 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | When `Recommendation.status` ≠ `"candidate"`, `assessment` metadata MUST be present and reproducible under the recorded `policyId`. Default policy: `evidensiq.default-recommendation-v0.1`. |

### EVI-L4-010 — Hard Constraint Violation Produces Rejected

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L4 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | Under the approved v0.1 convention (`Entity.properties.enforcement` = `"hard"`), hard constraint violation during recommendation assessment MUST produce `status` = `"rejected` with `constraint-compliance` → `fail`. Hard constraint violation MUST NOT be represented as `conflicted`. |
| **Source** | v0.1 documented convention; NOT schema-normative field |

### EVI-L4-011 — asOf Half-Open Temporal Filtering

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L4 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | When `BusinessContextProjectionRequest.asOf` is specified, assertions are active at `asOf` when: `validFrom` ≤ `asOf` (or absent) AND `validUntil` > `asOf` (or absent), using half-open `[validFrom, validUntil)` semantics. |

### EVI-L4-012 — includeConflicts Behavior

| Attribute | Value |
|-----------|-------|
| **Classification** | NORMATIVE RULE |
| **Level** | L4 |
| **Severity** | error |
| **Machine-testable** | yes |
| **Requirement** | When `BusinessContextProjectionRequest.includeConflicts` = `true`, unresolved Conflicts referenced by projected Assertions MUST remain visible in the projection result. |

---

## Currently Non-Normative L4 Behavior

The following behaviors exist in the model but are **NOT currently eligible** for normative L4 conformance tests in v0.1 because policy inputs and mappings are insufficiently defined:

| Behavior | v0.1 Status |
|----------|-------------|
| Freshness threshold / `freshness-policy` pass-fail | NOT NORMATIVE — threshold semantics undefined |
| Evidence threshold / `evidence-threshold` pass-fail | NOT NORMATIVE — threshold criteria undefined |
| `evidencePolicy` semantics | NOT NORMATIVE — no policy IDs defined (SPF-01) |
| Projection ordering | NOT NORMATIVE — ordering policy undefined |
| Truncation precedence | NOT NORMATIVE — precedence rules undefined |
| Revenue percentage rounding | NOT NORMATIVE — no rounding policy |
| `insufficient-evidence` derivation | NOT NORMATIVE — threshold undefined |
| `stale` derivation | NOT NORMATIVE — freshness threshold undefined |

Recommendation statuses (`candidate`, `supported`, `insufficient-evidence`, `conflicted`, `stale`, `rejected`) remain part of the model. Normative L4 derivation rules exist only where policy inputs and mapping are sufficiently defined (e.g., hard constraint → `rejected`).

Implementations MUST NOT present implementation-specific policies for the above as normative Evidensiq v0.1 conformance.

---

## Policy Gap Register

See [evaluation.md](evaluation.md) for the full policy gap register shared between conformance and evaluation.

---

## Constraint Convention

Northstar represents constraint enforcement using:

```json
"properties": { "enforcement": "hard" }
```

on Constraint entities (e.g., `constraint-supplier-capacity`).

For v0.1 this is an **approved documented convention**. It does **NOT** make `enforcement` a globally schema-defined Entity field. Do not mutate `business-context.schema.json` to formalize it.

The convention demonstrates EVI-L4-010: hard constraint violation → `rejected`.

Do not generalize arbitrary `Entity.properties` keys into normative policy inputs.

---

## Security Boundary

**DATA ≠ INSTRUCTION**

- Instruction-like content inside evidence remains business data
- Extensions do not gain execution authority
- `trustAssessment` does not grant authorization
- Conformance/evaluation must not interpret business evidence as runtime commands

EVI-1.3C may include one minimal language-neutral adversarial-content fixture demonstrating inert data semantics. No LLM, prompt-injection benchmark, or provider-specific behavior.

---

## SPF Disposition

| ID | Finding | Disposition |
|----|---------|-------------|
| SPF-01 | No normative `evidencePolicy` IDs | **DEFERRED.** No normative evidencePolicy L4 tests in v0.1 |
| SPF-02 | Recommendation lacks `goalIds` | **NO ACTION REQUIRED** |
| SPF-03 | Signal references evidence rather than Assertions | **NO ACTION REQUIRED** |

---

## Conformance Manifest Contract

Language-neutral conformance fixtures are indexed by [`fixtures/conformance/manifest.json`](../../fixtures/conformance/manifest.json) validated against [`fixtures/conformance/manifest.schema.json`](../../fixtures/conformance/manifest.schema.json).

### Manifest Structure

| Field | Description |
|-------|-------------|
| `manifestVersion` | Manifest contract version (`"0.1"`) |
| `entries` | Array of fixture entries (MAY be empty until EVI-1.3C) |

### Entry Structure

| Field | Required | Description |
|-------|----------|-------------|
| `id` | yes | Stable entry identifier |
| `fixture` | yes | Relative path to fixture document |
| `targetLevel` | yes | `L1`, `L2`, `L3`, or `L4` |
| `expectedValid` | yes | Whether fixture passes at target level |
| `expectedDiagnostics` | no | Expected diagnostics (`ruleId`, `level`, `severity`, `path`) |

Exact message text is NOT required in expected diagnostics. No runtime-specific commands or test framework references.

---

## Versioning and Compatibility

### Extension Evolution

Unknown extension namespaces: preserve and ignore. Generally additive.

### Closed Enum Evolution

Adding a value to a closed normative enum is **POTENTIALLY BREAKING**. An older L1 validator may reject new enum values.

- Enum additions require compatibility review
- Enum additions MUST NOT automatically be labelled additive
- Producers targeting older `specVersion` must not emit unsupported enum values
- Extension evolution and enum evolution are not equivalent

---

## Related Documents

- [Evaluation Model](evaluation.md)
- [Business Context Specification](business-context-spec.md)
- [Northstar Reference Scenario](reference-scenario.md)
- [Terminology](terminology.md)
- [Architecture](../architecture/architecture.md)
- [JSON Schema](../../specification/business-context.schema.json)
