# Business Context Specification v0.1

This document defines the Evidensiq Business Context Specification at version 0.1. It is the architecture-lock candidate for EVI-1.1 — extensible, conservative, and intended as the initial contract rather than a frozen ontology.

Machine-readable schema: [`specification/business-context.schema.json`](../../specification/business-context.schema.json)

Conformance model: [conformance.md](conformance.md)

## Overview

The Business Context Specification defines a portable, provider-neutral representation for:

- Business entities and relationships
- Evidence, assertions, and provenance
- Signals, inferences, and recommendations
- Temporal validity and conflicts
- Multi-dimensional confidence
- Context projection

The primary artifact is **`business-context.json`**.

## Design Principles

1. **Semantic invariants are non-negotiable** — SOURCE ≠ EVIDENCE ≠ ASSERTION ≠ FACT ≠ INFERENCE ≠ RECOMMENDATION
2. **DATA ≠ INSTRUCTION** — business content is evidence, never privileged instructions
3. **Provider-neutral** — no dependency on specific AI providers or agent frameworks
4. **Extensible v0 model** — primitives are a starting point, not a permanent ontology
5. **Temporal awareness** — assertions have validity periods; distinguish current truth from historical truth
6. **Conflict preservation** — do not silently resolve conflicting evidence
7. **Traceability** — recommendations link back to evidence through signals and inferences
8. **Controlled extensions** — normative domain objects are closed; extensions use namespaced keys

## Portable Format

Conceptual shape of `business-context.json`:

```json
{
  "$schema": "https://evidensiq.dev/schemas/business-context/v0.1/business-context.schema.json",
  "specVersion": "0.1",
  "organizationId": "org-northstar",
  "entities": [],
  "relations": [],
  "sources": [],
  "evidence": [],
  "assertions": [],
  "signals": [],
  "inferences": [],
  "recommendations": [],
  "conflicts": []
}
```

The `$schema` URI is conceptual for v0.1; local validation uses the repository schema file.

## Canonical Semantic Chain

```
SOURCE
  ↓
EVIDENCE
  ↓
ASSERTION
  ↓ [L4 validation policy evaluation]
FACT (semantic view — NOT a persisted object)
  ↓
SIGNAL
  ↓
INFERENCE
  ↓
RECOMMENDATION CANDIDATE
  ↓ [L4 deterministic assessment]
RECOMMENDATION
```

**FACT** is not a persisted object. A **Fact** is an Assertion where:

- `classification` = `"validated"`
- `validation.result` = `"valid"`
- under an explicitly recorded `validation.policyId`

There is no `facts` collection and no `Fact` schema type.

## Identifier Model

- IDs are opaque UTF-8 strings with `minLength` 1
- UUID is NOT mandatory
- Uniqueness is document-wide
- Comparison is case-sensitive Unicode ordinal
- Internal references use exact ID match
- External identity is separate via optional `externalIds` with namespaced keys
- `externalIds` MUST NOT participate in internal reference resolution

Document-wide uniqueness and reference integrity are L2 semantic conformance requirements.

## Organization Model

The root document requires `organizationId`, which MUST resolve at L2 to an Entity where `type` = `"Organization"`. Organization business attributes live only in the canonical Entity — there is no duplicate root-level Organization representation.

## Base Primitives

The v0 model includes these entity types. Types are extensible via the `type` field.

| Primitive | Description |
|-----------|-------------|
| `Organization` | The business or organizational unit |
| `Product` | A product offered by the organization |
| `Service` | A service offered by the organization |
| `CustomerSegment` | A defined customer group |
| `Channel` | A sales, marketing, or delivery channel |
| `Process` | An operational or business process |
| `Metric` | A measurable business indicator |
| `Goal` | A business objective or target |
| `Constraint` | A limiting factor or boundary condition |
| `Competitor` | A competing entity |

## Assertion Model

Assertions are first-class persisted objects in the `assertions` array.

```json
{
  "id": "assertion-product-b-revenue-q3",
  "type": "Assertion",
  "subject": "product-b",
  "predicate": "revenue",
  "value": 1200000,
  "evidenceIds": ["evidence-sales-q3"],
  "observedAt": "2025-09-15T00:00:00Z",
  "classification": "validated",
  "validFrom": "2025-07-01T00:00:00Z",
  "validUntil": "2025-10-01T00:00:00Z",
  "validation": {
    "policyId": "evidensiq.default-fact-v0.1",
    "evaluatedAt": "2025-09-15T12:00:00Z",
    "result": "valid"
  }
}
```

### Required Fields

| Field | Description |
|-------|-------------|
| `id` | Unique identifier |
| `type` | Must be `"Assertion"` |
| `subject` | Entity ID this assertion is about |
| `predicate` | Property or attribute being asserted |
| `value` | Asserted value |
| `evidenceIds` | At least one Evidence ID |
| `observedAt` | Record time |
| `classification` | Lifecycle classification |

### Classification Enum

| Value | Meaning |
|-------|---------|
| `asserted` | Claim recorded, not yet validated |
| `validated` | Passed validation policy — qualifies as Fact |
| `superseded` | Explicitly replaced by another assertion |
| `retracted` | Withdrawn |

When `classification` = `"validated"`, `validation` metadata is required with `policyId`, `evaluatedAt`, and `result`.

When `classification` = `"superseded"`, `supersededBy` is required.

### Fact Qualification

The default Fact validation policy is `evidensiq.default-fact-v0.1`. Using the default policy is allowed but MUST NEVER be invisible — validation policy ID and evaluation metadata must be persisted on validated Assertions.

Evidence → Assertion linkage is through `Assertion.evidenceIds`. Do NOT use Relation for Evidence → Assertion links.

## Temporal Model

Valid-time convention: **`[validFrom, validUntil)`**

| Rule | Meaning |
|------|---------|
| `validFrom` inclusive | Assertion becomes valid at this instant |
| `validUntil` exclusive | Assertion ceases to be valid at this instant |
| Missing `validFrom` | Unbounded past |
| Missing `validUntil` | Unbounded future |
| Both present | `validUntil` MUST be strictly greater than `validFrom` |

`observedAt` is record time — when evidence or assertion entered or was observed by context.

### Four Temporal Concepts

**A. Historical Change** — Same subject and predicate with non-overlapping valid-time intervals (e.g., price £100 Jan–Mar, price £120 Apr–Jun). Result: no conflict, no automatic supersession.

**B. Contradiction** — Same subject + predicate, overlapping valid-time, incompatible values. Result: Conflict with `assertionIds`.

**C. Correction** — Later-recorded assertion explicitly replaces an inaccurate prior record. May use supersession.

**D. Supersession** — Explicit only. Requires `classification` = `"superseded"` and `supersededBy` = replacement Assertion ID. NEVER infer supersession solely because a later temporal value exists.

Normal business evolution MUST NOT automatically supersede historical Assertions.

## Source and Evidence Model

### Source

```json
{
  "id": "source-crm",
  "type": "Source",
  "name": "CRM System",
  "reference": "internal://crm",
  "provenance": {
    "originScope": "internal",
    "acquisitionMethod": "system-generated",
    "trustAssessment": "trusted"
  }
}
```

`ProvenanceMetadata` is required on Source.

### Evidence

```json
{
  "id": "evidence-sales-q3",
  "type": "Evidence",
  "sourceId": "source-sales-csv",
  "contentRef": "sales.csv",
  "observedAt": "2025-09-15T00:00:00Z",
  "provenance": {
    "originScope": "internal",
    "acquisitionMethod": "imported",
    "trustAssessment": "unknown"
  }
}
```

**SOURCE ≠ EVIDENCE** — sources are origins; evidence is derived artifacts.

Evidence content MUST NOT acquire instructional authority.

## Provenance / Trust Model

`ProvenanceMetadata` replaces the former conflated trust classification. Three orthogonal dimensions:

| Dimension | Values |
|-----------|--------|
| `originScope` | `internal`, `external` |
| `acquisitionMethod` | `user-provided`, `system-generated`, `imported`, `unknown` |
| `trustAssessment` | `trusted`, `untrusted`, `unknown` (default: `unknown`) |

**trustAssessment ≠ authorization.** Trust assessment does not grant execution authority.

## Conflict Model

Conflicts index incompatible Assertions — they do not duplicate competing values.

```json
{
  "id": "conflict-product-a-price",
  "assertionIds": ["assertion-price-pdf", "assertion-price-crm"],
  "conflictKind": "contradiction",
  "status": "unresolved"
}
```

### Required Fields

| Field | Description |
|-------|-------------|
| `id` | Unique identifier |
| `assertionIds` | Minimum 2 Assertion IDs |
| `conflictKind` | `contradiction` or `uncertainty` |
| `status` | `unresolved`, `acknowledged`, or `resolved` |

Contradiction requires: same subject, same predicate, overlapping valid-time, incompatible values. Historical non-overlap is NOT contradiction.

Conflict resolution MUST NOT delete Evidence, Assertions, or provenance.

Optional resolution metadata: `method`, `resolvedAt`, `note`, `preferredAssertionId`.

## Confidence Model

Normative persisted dimensions:

| Dimension | Values |
|-----------|--------|
| `evidenceStrength` | `none`, `weak`, `moderate`, `strong` |
| `sourceReliability` | `low`, `moderate`, `high`, `unknown` |
| `inferenceConfidence` | `low`, `moderate`, `high` |

`evidenceFreshness` is L4 policy-derived — not persisted normatively.

`modelConfidence` is absent from the normative model. If model self-assessment is represented, use `modelSelfAssessment` as diagnostic, non-authoritative, extension-only.

`overallConfidence` is NOT normative core — may exist only as explicitly identified policy output or extension.

Do not use arbitrary floating-point confidence scores in the normative v0.1 contract.

## Relations

**HARD BOUNDARY:** Relation is Entity → Entity only.

Required: `id`, `from`, `to`, `type`

Optional: `validFrom`, `validUntil`, `evidenceIds`, `externalIds`, `extensions`

Core relation vocabulary (exactly seven v0.1 types):

1. `targets`
2. `acquiredVia`
3. `produces`
4. `measures`
5. `constrains`
6. `competesWith`
7. `partOf`

Do NOT include `supports`. Evidence → Assertion is represented only through `Assertion.evidenceIds`.

Non-core relation types must use the approved namespaced extension form. Endpoint-type mismatch for a known core relation is an L2 WARNING in v0.1, not a hard validation error.

Direction `from` → `to` is authoritative.

## Inference Model

Opportunity and Risk are NOT separate collections. Extend Inference with `inferenceKind`:

| Value | Meaning |
|-------|---------|
| `analytical` | General analytical conclusion (default) |
| `opportunity` | Potential positive outcome |
| `risk` | Potential negative outcome |

```json
{
  "id": "inference-supplier-bottleneck",
  "type": "Inference",
  "inferenceKind": "risk",
  "description": "Supplier bottleneck may constrain fulfillment capacity",
  "basedOn": ["signal-delivery-complaints"],
  "confidence": {
    "inferenceConfidence": "moderate",
    "evidenceStrength": "moderate"
  }
}
```

## Signals

```json
{
  "id": "signal-product-b-decline",
  "type": "Signal",
  "description": "Product B sales declining",
  "evidenceIds": ["evidence-sales-q3"],
  "observedAt": "2025-09-15T00:00:00Z",
  "status": "active"
}
```

## Recommendation Pipeline

Recommendations are produced through a pipeline, not direct generation:

```
Evidence → Assertions → Signals → Inference → Candidate Recommendations
  → L4 Assessment → Recommendations
```

### Recommendation Object

```json
{
  "id": "rec-no-acquisition-spend",
  "type": "Recommendation",
  "description": "Do not increase acquisition spend yet",
  "rationale": "Operational constraint risks amplifying delivery failures",
  "status": "supported",
  "evidenceIds": ["evidence-operations-md", "evidence-support-md"],
  "inferenceIds": ["inference-delivery-correlation"],
  "constraintIds": ["constraint-supplier-lead-time"],
  "assessment": {
    "evaluatedAt": "2025-09-15T14:00:00Z",
    "policyId": "evidensiq.default-recommendation-v0.1",
    "results": [
      { "check": "evidence-threshold", "outcome": "pass" },
      { "check": "constraint-compliance", "outcome": "pass" }
    ]
  }
}
```

### Recommendation Statuses

| Status | Meaning |
|--------|---------|
| `candidate` | Assessment incomplete or not yet performed |
| `supported` | Required checks pass |
| `insufficient-evidence` | Evidence threshold fails |
| `conflicted` | Unresolved contradiction affects supporting assertion |
| `stale` | Freshness policy fails |
| `rejected` | Hard constraint violation or explicit rejection rule |

Recommendation status is derived, reproducible, and cached for serialization. It is NOT workflow state.

Hard constraint violation MUST NOT be represented as `conflicted`. Advisory violations produce warnings only; hard violations produce `rejected`.

Assessment is persisted when `status` != `"candidate"`.

## Context Projection

Provider-neutral contract definitions (NOT root persisted properties):

### BusinessContextProjectionRequest

Supports: `objective`, `domains`, `entityIds`, `relationTraversal` (maxDepth 0–3), `asOf`, `includeConflicts`, `evidencePolicy`, `sizeLimit` (maxItems, maxCharacters, maxBytes), `ordering`, `extensions`.

NO `tokenBudget` in normative core. Provider-specific token budgeting belongs to adapters/runtimes.

The following request fields are **accepted but currently reserved / non-operative** in the v0.1 reference contract:

| Field | Current behavior |
|-------|------------------|
| `objective` | Accepted; MUST NOT drive natural-language interpretation or LLM filtering |
| `domains` | Accepted; MUST NOT invent ontology or ranking semantics |
| `evidencePolicy` | Accepted; no normative policy IDs or evidence-sufficiency thresholds (SPF-01 deferred) |
| `ordering` | Accepted; normative projected collection order remains original document order |
| `sizeLimit` | Accepted as a no-op; MUST NOT truncate or emit `truncated` / `truncationReason` until a separate deterministic truncation policy is approved |

### BusinessContextProjectionResult

Supports: `projectedAt`, `asOf`, filtered context subsets (`entities`, `relations`, `assertions`, `signals`, `inferences`, `recommendations`, `conflicts`, `evidence`, `sources`), `truncated`, `truncationReason`, `extensions`.

#### Evidence → Source closure

Projection is **provenance-complete**, not document-complete:

- For every Evidence object included in a projection result, every Source referenced by that Evidence's `sourceId` and present in `document.sources` MUST appear exactly once in `ProjectionResult.sources`.
- Projected Sources MUST preserve original `document.sources` order (no ID sort; no Evidence-encounter order).
- Sources not referenced by included Evidence MUST be excluded.
- When no Source qualifies, `sources` MUST be omitted (do not emit `sources: []`).
- Projection assumes L1+L2-valid input. Unresolved Source references MUST NOT fabricate Sources or placeholders.

Empty collection convention matches existing projection behavior: empty projected collections are omitted rather than emitted as empty arrays.

#### Fact boundary

Projection continues to include Assertions according to existing projection rules. Projection is **not** Fact-only. There is no `factsOnly` / `factQualifiedOnly` request flag and no persisted Fact result collection. Fact remains a semantic view of a validated Assertion.

Temporal semantics (`asOf`, half-open `[validFrom, validUntil)`) are unchanged. No implicit clock.

AI-assisted semantic ranking is non-normative and adapter-side. Do NOT turn projection into RAG/vector search.

### Context Query (composition)

Context Query is a **conceptual** composition of Evidensiq's existing deterministic primitives — not a separate query language or `queryBusinessContext()` API. Consumers may compose, as needed:

- `projectBusinessContext` (structured subset + Evidence/Source closure)
- explicit `asOf` / `isAssertionActiveAt` (temporal selection)
- `isFactQualified` / `selectCurrentFactAssertions` (Fact view)
- `includeConflicts` (explicit conflict visibility)
- `assessRecommendation` / `buildRecommendationSupportGraph` (recommendation assessment)

Not every primitive is required for every consumption path. Context Query MUST NOT imply SQL, semantic search, embeddings, or natural-language querying.

### Fact consumption (composition)

Consumers obtain a Fact-qualified reasoning view by composing projection with Fact/temporal helpers (for example `projectBusinessContext` + `isFactQualified` + `isAssertionActiveAt`, or `selectCurrentFactAssertions` with an explicit `asOf`). Fact consumption MUST NOT mutate projection semantics and MUST NOT introduce an implicit clock.

## Controlled Extensions

Normative domain objects use `additionalProperties: false` with optional `extensions` for namespaced keys.

Extension keys use reverse-domain-style namespace constraints (e.g., `com.example.field`). Reserve `evidensiq.*` for specification-defined extensions.

Unknown extensions:

- MUST be preserved during L3 round-trip
- MUST be ignored for normative core processing unless understood

Extensions MUST NOT execute code, define runtime hooks, create plugin semantics, or modify security authority.

`Entity.properties` may remain for entity-specific business attributes — do not confuse with schema extensions.

## Deterministic Core vs. AI-Assisted

| Deterministic Core | AI-Assisted (Future) |
|--------------------|----------------------|
| IDs, schemas, relationships | Entity extraction |
| Provenance, timestamps | Classification |
| Validation, constraints | Semantic normalization |
| Conflict representation | Relationship candidates |
| Confidence dimensions | Document interpretation |
| Context projection | Hypothesis generation |
| Recommendation validation | Recommendation candidates |

**Model proposes. Core stores, validates, links, ranks, and constrains.**

## Reference Scenario: Northstar Manufacturing

Synthetic business with sources: `products.csv`, `customers.csv`, `sales.csv`, `support.md`, `operations.md`, `strategy.md`.

### Complete Semantic Chain

| Layer | Content | Linkage |
|-------|---------|---------|
| **Source** | `sales.csv` | — |
| **Evidence** | Q3 sales data row | `sourceId` → Source |
| **Assertion** | Product B Q3 revenue = $1.2M | `evidenceIds` → Evidence |
| **Validation** | `evidensiq.default-fact-v0.1` → valid | Fact qualification |
| **Signal** | Product B sales declining | `evidenceIds` → Evidence |
| **Inference (risk)** | Delivery failures correlate with sales decline | `inferenceKind`: `risk` |
| **Recommendation Candidate** | Do NOT increase acquisition spend | — |
| **Assessment** | `evidensiq.default-recommendation-v0.1` → supported | — |

### A. Historical Temporal Change

Price = £100 valid `[2025-01-01, 2025-04-01)`, Price = £120 valid `[2025-04-01, 2025-07-01)`. Non-overlapping intervals → no conflict, no supersession.

### B. Contradiction

Two assertions for Product A price with overlapping valid-time and incompatible values → Conflict with `assertionIds`.

### C. Explicit Correction

Inaccurate assertion superseded: `classification` = `"superseded"`, `supersededBy` = replacement Assertion ID.

### D. Evidence → Assertion

`Assertion.evidenceIds` — NOT `Relation.supports`.

This scenario is documentation-only in v0.1. Executable Northstar JSON fixture belongs to EVI-1.2 / EVI-1.3.

## Serialization Rules

| Rule | Semantics |
|------|-----------|
| Absent | Unspecified |
| `null` | Prohibited for normative fields unless explicitly allowed |
| DateTime | ISO 8601; fixtures normalize to UTC with Z suffix |
| Numbers | JSON numbers; document portability between JS/TS and .NET |
| Array ordering | Preserved during round-trip; semantic significance not assumed unless stated |
| Object key ordering | Not semantically significant |
| IDs | Case-sensitive ordinal comparison |

Do NOT introduce cryptographic canonical JSON.

## Versioning and Compatibility

Separate `specVersion` from future package/library semver.

### Extension Evolution

Unknown extension namespaces: preserve and ignore. Generally additive.

### Closed Enum Evolution

Adding a value to a closed normative enum is **POTENTIALLY BREAKING**. An older L1 validator may reject new enum values. Enum additions require compatibility review and MUST NOT automatically be labelled additive. Producers targeting older specVersion must not emit unsupported enum values.

Extension evolution and enum evolution are not equivalent. No migration tooling in EVI-1.1.

## Evaluation Principles

Future evaluation must measure:

- **Evidence coverage** — Are recommendations backed by sufficient evidence?
- **Contradiction rate** — How often do conflicts go unresolved?
- **Unsupported assertion rate** — Claims without evidence references
- **Constraint violation rate** — Recommendations violating known constraints
- **Stale evidence rate** — Recommendations relying on outdated evidence
- **Recommendation stability** — Consistency under equivalent context

**Counterfactual principle:** Removing important supporting evidence should change, eliminate, or reduce confidence in a recommendation.

## Related Documents

- [Terminology](terminology.md)
- [Conformance](conformance.md)
- [Architecture](../architecture/architecture.md)
- [JSON Schema](../../specification/business-context.schema.json)
