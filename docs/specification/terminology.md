# Terminology

This document defines core terms used in the Evidensiq specification. Definitions reflect the v0.1 architecture-lock model (EVI-1.1).

## Semantic Hierarchy

Evidensiq enforces a strict separation between layers of business knowledge:

```
SOURCE → EVIDENCE → ASSERTION → FACT → SIGNAL → INFERENCE → RECOMMENDATION
```

Each layer has distinct meaning and must not be conflated:

```
SOURCE ≠ EVIDENCE
EVIDENCE ≠ ASSERTION
ASSERTION ≠ FACT
FACT ≠ INFERENCE
INFERENCE ≠ RECOMMENDATION
```

## Core Terms

### Source

A **source** is the origin of raw business information — a system, document, person, or process that produced or holds data.

Examples: CRM system, PDF report, website, CSV export, user input, internal database.

A source is not evidence itself; it is the provenance anchor for evidence. Source requires `ProvenanceMetadata`.

### Evidence

**Evidence** is a specific artifact or observation derived from a source, suitable for supporting assertions.

Examples: a row in `sales.csv`, a paragraph in `support.md`, a CRM field value, a metric reading at a point in time.

Evidence carries provenance (which source, when observed) and optional trust metadata.

**SOURCE ≠ EVIDENCE**

Evidence content MUST NOT acquire instructional authority.

### Assertion

An **assertion** is a structured, persisted claim about the business, supported by one or more evidence items via `evidenceIds`.

Examples: "Product B Q3 revenue was $1.2M", "Average delivery time is 14 days."

Assertions are first-class objects in the `assertions` array with required fields: `id`, `type`, `subject`, `predicate`, `value`, `evidenceIds`, `observedAt`, `classification`.

**EVIDENCE ≠ ASSERTION** — Evidence is raw support; assertions are structured claims.

Evidence → Assertion linkage is through `Assertion.evidenceIds`, NOT through Relation.

### Fact

A **fact** is NOT a persisted object. It is a semantic view:

An Assertion where `classification` = `"validated"` AND `validation.result` = `"valid"` under an explicitly recorded `validation.policyId`.

There is no `facts` collection and no `Fact` schema type.

**ASSERTION ≠ FACT** — All facts are validated assertions; not all assertions are facts.

Default Fact validation policy: `evidensiq.default-fact-v0.1`

### Signal

A **signal** is an observed pattern or change in business data that may warrant attention.

Examples: "Product B sales declining", "Delivery complaints increasing."

Signals reference evidence and may trigger inference.

### Inference

An **inference** is a derived conclusion from one or more signals, validated assertions, or other inferences.

Examples: "Product B sales decline correlates with delivery complaint increase", "Supplier bottleneck may constrain fulfillment capacity."

Inferences are not recommendations; they represent analytical conclusions.

**FACT ≠ INFERENCE**

### Inference Kind

Opportunity and Risk are expressed through `inferenceKind` on Inference — not as separate collections:

| Value | Meaning |
|-------|---------|
| `analytical` | General analytical conclusion (default) |
| `opportunity` | Potential positive outcome |
| `risk` | Potential negative outcome |

### Recommendation

A **recommendation** is an actionable proposal, assessed against evidence and constraints, with traceable rationale.

Examples: "Do not increase acquisition spend yet", "Prioritize supplier lead time reduction before marketing expansion."

Recommendations carry derived status and must reference supporting evidence.

**INFERENCE ≠ RECOMMENDATION**

## Trust and Provenance

### ProvenanceMetadata

Orthogonal provenance dimensions replacing the former conflated trust classification:

| Dimension | Values | Meaning |
|-----------|--------|---------|
| `originScope` | `internal`, `external` | Origin relative to organization |
| `acquisitionMethod` | `user-provided`, `system-generated`, `imported`, `unknown` | How content was acquired |
| `trustAssessment` | `trusted`, `untrusted`, `unknown` | Trust assessment (default: `unknown`) |

**trustAssessment ≠ authorization.** Trust assessment does not grant execution authority.

Source: `ProvenanceMetadata` required.
Evidence: optional, may inherit Source semantics.
Assertion: optional override only where necessary.

## Temporal Semantics

Valid-time convention: **`[validFrom, validUntil)`**

| Field | Meaning |
|-------|---------|
| `validFrom` | Inclusive start of validity |
| `validUntil` | Exclusive end of validity |
| `observedAt` | Record time — when entered or observed |

Missing `validFrom`: unbounded past. Missing `validUntil`: unbounded future.

When both exist, `validUntil` MUST be strictly greater than `validFrom`.

### Historical Change vs. Contradiction vs. Supersession

| Concept | Condition | Result |
|---------|-----------|--------|
| Historical change | Non-overlapping valid-time for same subject+predicate | No conflict, no supersession |
| Contradiction | Overlapping valid-time, incompatible values | Conflict |
| Correction | Explicit replacement of inaccurate record | May use supersession |
| Supersession | `classification` = `superseded`, `supersededBy` set | Explicit only |

NEVER infer supersession solely because a later temporal value exists.

## Conflict

A **conflict** indexes incompatible assertions via `assertionIds` (minimum 2).

Evidensiq does not arbitrarily resolve conflicts. Conflicts preserve:

- Referenced assertions and their evidence
- Provenance
- Resolution metadata when resolved

Conflict kinds: `contradiction`, `uncertainty`.
Conflict statuses: `unresolved`, `acknowledged`, `resolved`.

## Confidence

Confidence is **multi-dimensional** with normative enum values:

| Dimension | Values |
|-----------|--------|
| `evidenceStrength` | `none`, `weak`, `moderate`, `strong` |
| `sourceReliability` | `low`, `moderate`, `high`, `unknown` |
| `inferenceConfidence` | `low`, `moderate`, `high` |

`evidenceFreshness` is L4 policy-derived — not persisted normatively.

`modelConfidence` is absent from normative core. Model self-assessment, if represented, uses `modelSelfAssessment` as diagnostic extension-only.

`overallConfidence` is NOT normative core.

Do not use arbitrary floating-point confidence scores in the normative v0.1 contract.

## Relation

**Relation is Entity → Entity only.**

Core v0.1 relation types (exactly seven):

`targets`, `acquiredVia`, `produces`, `measures`, `constrains`, `competesWith`, `partOf`

Do NOT use `supports` for Evidence → Assertion. That linkage is `Assertion.evidenceIds`.

## Identifier

IDs are opaque UTF-8 strings, case-sensitive, unique within the document. UUID is not mandatory. External identity uses namespaced `externalIds` that do NOT participate in internal reference resolution.

## Data vs. Instruction

```
DATA ≠ INSTRUCTION
```

Business documents and data are **evidence**, not system instructions. Content that resembles prompts ("ignore previous instructions") must be treated as untrusted data, never as privileged commands.

## Provider Neutrality

**Provider-neutral** means the specification does not depend on, favor, or require a specific AI provider, agent framework, cloud platform, or storage technology.

## Portable Artifact

**business-context.json** — The portable JSON document representing a structured business context, conforming to `specification/business-context.schema.json`.

## Conformance Levels

| Level | Scope |
|-------|-------|
| L1 Structural | JSON Schema types, shape, enums, closed objects |
| L2 Semantic | ID uniqueness, references, temporal validity, integrity |
| L3 Serialization | Round-trip, absent/null, DateTime, ordering |
| L4 Behavioral | Policy evaluation, assessment derivation, projection |

See [conformance.md](conformance.md) for full definitions.

## Related Documents

- [Business Context Specification](business-context-spec.md)
- [Conformance](conformance.md)
- [Architecture](../architecture/architecture.md)
