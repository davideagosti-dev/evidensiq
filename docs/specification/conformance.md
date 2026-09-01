# Conformance Model

This document defines the Evidensiq conformance model for Business Context Specification v0.1. Conformance is organized into exactly four levels.

## Overview

| Level | Name | Scope |
|-------|------|-------|
| L1 | Structural Conformance | JSON Schema validation |
| L2 | Semantic Conformance | Document integrity and reference rules |
| L3 | Serialization Conformance | Portable round-trip semantics |
| L4 | Behavioral Conformance | Policy evaluation and derived outcomes |

Policy-derived behavior belongs in L4, not L3.

---

## L1 — Structural Conformance

Validates against `specification/business-context.schema.json` (Draft 2020-12).

### Requirements

- Types, shape, and required fields
- Enum values for closed normative fields
- Closed normative domain objects (`additionalProperties: false`)
- Extension namespace key shape (reverse-domain-style)
- Conditional validation rules (e.g., validated Assertion requires validation metadata)
- Absence of prohibited constructs (no `facts` collection, no `Fact` type, no `TrustClassification`, no `Conflict.values`, no `modelConfidence`)

### L1 Tools

Any JSON Schema Draft 2020-12 validator may be used. L1 alone does not guarantee semantic correctness.

---

## L2 — Semantic Conformance

L2 rules extend L1 with document-wide integrity checks.

### ID Uniqueness

All IDs MUST be unique within the document. Comparison is case-sensitive Unicode ordinal.

### Reference Existence

All internal ID references MUST resolve to an existing object in the document:

- `organizationId` → Entity
- `Assertion.subject` → Entity
- `Assertion.evidenceIds` → Evidence
- `Assertion.supersededBy` → Assertion
- `Conflict.assertionIds` → Assertion
- `Relation.from`, `Relation.to` → Entity
- `Evidence.sourceId` → Source
- `Recommendation.evidenceIds`, `inferenceIds`, `constraintIds` → respective collections

`externalIds` MUST NOT participate in internal reference resolution.

### Reference Target Types

- `organizationId` MUST resolve to an Entity where `type` = `"Organization"`
- `Assertion.type` MUST be `"Assertion"`
- `Evidence.type` MUST be `"Evidence"`
- etc.

### Organization Resolution

`organizationId` is required at root and MUST resolve to an Organization Entity.

### Temporal Interval Validity

When both `validFrom` and `validUntil` are present on an object supporting temporal fields, `validUntil` MUST be strictly greater than `validFrom`.

Valid-time convention: `[validFrom, validUntil)` — inclusive start, exclusive end.

### Supersession Integrity

When `Assertion.classification` = `"superseded"`:

- `supersededBy` MUST reference an existing Assertion
- The referenced Assertion MUST NOT have `classification` = `"superseded"` (no chains without explicit design)

### Conflict Integrity

- `Conflict.assertionIds` MUST contain at least 2 distinct Assertion IDs
- Referenced Assertions SHOULD share subject and predicate for `conflictKind` = `"contradiction"` (L2 warning if not)

### Validated Assertion Completeness

When `Assertion.classification` = `"validated"`:

- `validation.policyId` MUST be present
- `validation.evaluatedAt` MUST be present
- `validation.result` MUST be present

### Relation Endpoint-Type Mismatch

For known core relation types, endpoint Entity types that do not match expected patterns produce an **L2 WARNING** in v0.1 — not a hard validation error.

Example: `Product → targets → CustomerSegment` is expected; mismatches warn but do not fail L2.

### Evidence Linkage

Every Assertion MUST have at least one Evidence ID in `evidenceIds`.

---

## L3 — Serialization Conformance

L3 ensures portable serialization semantics across implementations (TypeScript, .NET, etc.).

### Absent vs. Null

- **Absent** means unspecified
- **`null`** is prohibited for normative fields in v0.1 unless an explicit field definition states otherwise

### DateTime Normalization

- ISO 8601 format
- Conformance fixtures normalize to UTC with `Z` suffix

### Number Portability

- JSON numbers
- Document portability expectations between JavaScript/TypeScript and .NET (integer vs. floating-point edge cases documented in fixtures)

### Array Ordering

- Array element order is preserved during round-trip
- Semantic significance is NOT assumed unless explicitly stated

### Object Key Ordering

- Not semantically significant
- Implementations MUST NOT rely on key order

### Unknown Extension Preservation

Unknown extension keys MUST be preserved during round-trip serialization. Implementations MUST NOT silently drop unrecognized `extensions` entries.

### ID Comparison

Case-sensitive Unicode ordinal comparison.

### Round-Trip

Serialize → deserialize → serialize MUST produce semantically equivalent documents. Unknown extensions preserved.

---

## L4 — Behavioral Conformance

L4 defines reproducible policy evaluation and derived outcomes.

### Fact Qualification

An Assertion qualifies as a Fact when:

```
classification = "validated"
AND validation.result = "valid"
AND validation.policyId is recorded
```

#### Default Fact Validation Policy

**Policy ID:** `evidensiq.default-fact-v0.1`

Minimum evaluation (conceptual):

1. Assertion has at least one Evidence ID in `evidenceIds`
2. All referenced Evidence IDs exist in the document
3. All referenced Evidence items have valid `sourceId` references
4. `validation.result` = `"valid"` is explicitly recorded with `evaluatedAt`

Using the default policy is allowed. Its use MUST NEVER be invisible — policy ID and evaluation metadata must be persisted.

### Freshness Derivation

`evidenceFreshness` is derived at L4 from temporal and evidence metadata — NOT persisted normatively in confidence dimensions.

Freshness policies are identified by policy ID and evaluated deterministically given the same document and evaluation timestamp.

### Recommendation Assessment

Recommendation status is derived, reproducible, and cached for serialization.

#### Default Recommendation Assessment Policy

**Policy ID:** `evidensiq.default-recommendation-v0.1`

Minimum checks (conceptual):

| Check | Outcome Mapping |
|-------|-----------------|
| `evidence-threshold` | fail → `insufficient-evidence` |
| `constraint-compliance` (hard) | fail → `rejected` |
| `constraint-compliance` (advisory) | fail → warning in assessment results |
| `conflict-impact` | unresolved contradiction on supporting assertion → `conflicted` |
| `freshness-policy` | fail → `stale` |
| All required checks pass | → `supported` |

Assessment metadata is persisted when `status` != `"candidate"`.

Hard constraint violation MUST NOT be represented as `conflicted`.

### Conflict Policy Evaluation

Contradiction detection (L4):

- Same `subject` (Entity ID)
- Same `predicate`
- Overlapping valid-time intervals under `[validFrom, validUntil)` semantics
- Incompatible `value`

Historical non-overlap is NOT contradiction.

### Projection / Truncation

Given identical `BusinessContextProjectionRequest` and document state, projection outcomes MUST be deterministic:

- Same entities, assertions, and subsets included
- Same truncation decisions given same `sizeLimit`
- Same `truncated` and `truncationReason` values

### Shared Fixture Expectations

L4 conformance fixtures (EVI-1.3) will define expected outcomes for reference scenarios including Northstar Manufacturing.

---

## Conformance Level Summary

Implementations MAY claim conformance at specific levels:

| Claim | Requires |
|-------|----------|
| L1 conformant | Passes all L1 structural checks |
| L2 conformant | Passes L1 + all L2 semantic checks |
| L3 conformant | Passes L1 + L2 + all L3 serialization checks |
| L4 conformant | Passes L1 + L2 + L3 + all L4 behavioral checks |

Higher levels subsume lower levels.

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

No migration tooling in EVI-1.1.

---

## Related Documents

- [Business Context Specification](business-context-spec.md)
- [Terminology](terminology.md)
- [Architecture](../architecture/architecture.md)
- [JSON Schema](../../specification/business-context.schema.json)
