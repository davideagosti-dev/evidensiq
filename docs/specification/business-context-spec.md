# Business Context Specification v0.1

This document defines the Evidensiq Business Context Specification at version 0.1. It is an **early specification** — extensible, conservative, and intended as an initial contract rather than a frozen ontology.

Machine-readable schema: [`specification/business-context.schema.json`](../../specification/business-context.schema.json)

## Overview

The Business Context Specification defines a portable, provider-neutral representation for:

- Business entities and relationships
- Evidence and provenance
- Signals, inferences, and recommendations
- Temporal validity and conflicts
- Multi-dimensional confidence

The primary artifact is **`business-context.json`**.

## Design Principles

1. **Semantic invariants are non-negotiable** — SOURCE ≠ EVIDENCE ≠ FACT ≠ INFERENCE ≠ RECOMMENDATION
2. **DATA ≠ INSTRUCTION** — business content is evidence, never privileged instructions
3. **Provider-neutral** — no dependency on specific AI providers or agent frameworks
4. **Extensible v0 model** — primitives are a starting point, not a permanent ontology
5. **Temporal awareness** — facts have validity periods; distinguish current truth from historical truth
6. **Conflict preservation** — do not silently resolve conflicting evidence
7. **Traceability** — recommendations link back to evidence through signals and inferences

## Portable Format

Conceptual shape of `business-context.json`:

```json
{
  "$schema": "https://evidensiq.dev/schemas/business-context/v0.1/business-context.schema.json",
  "specVersion": "0.1",
  "organization": {},
  "entities": [],
  "relations": [],
  "sources": [],
  "evidence": [],
  "signals": [],
  "recommendations": []
}
```

The `$schema` URI is conceptual for v0.1; local validation uses the repository schema file.

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
| `Evidence` | An evidence artifact (also listed in `evidence` array) |
| `Source` | An evidence source (also listed in `sources` array) |

## Analytical Objects

| Object | Description |
|--------|-------------|
| `Signal` | An observed pattern or change warranting attention |
| `Inference` | A derived analytical conclusion |
| `Opportunity` | A potential positive outcome |
| `Risk` | A potential negative outcome |
| `Recommendation` | An actionable, validated proposal |

## Relationships

Relationships connect entities. Examples (not exhaustive):

```
Product        → targets        → CustomerSegment
CustomerSegment → acquiredVia   → Channel
Channel        → produces       → Metric
Metric         → measures       → Goal
Process        → constrains     → Goal
Competitor     → competesWith   → Product
Evidence       → supports       → Assertion
Signal         → derivedFrom    → Evidence
Inference      → basedOn        → Signal | Fact
Recommendation → validatedBy    → Evidence
```

Relationships are represented in the `relations` array with `from`, `to`, and `type` fields.

## Source and Evidence Model

### Source

A source identifies where evidence originates:

```json
{
  "id": "source-crm",
  "type": "Source",
  "name": "CRM System",
  "trustClassification": "trusted",
  "reference": "internal://crm"
}
```

Trust classifications: `trusted`, `untrusted`, `external`, `user-provided`, `system-generated`.

### Evidence

Evidence links content to a source:

```json
{
  "id": "evidence-sales-q3",
  "type": "Evidence",
  "sourceId": "source-sales-csv",
  "contentRef": "sales.csv",
  "observedAt": "2025-09-15T00:00:00Z",
  "trustClassification": "user-provided"
}
```

**SOURCE ≠ EVIDENCE** — sources are origins; evidence is derived artifacts.

## Assertions and Facts

Assertions represent structured claims supported by evidence:

```json
{
  "id": "fact-product-b-revenue",
  "type": "Assertion",
  "subject": "product-b",
  "predicate": "revenue",
  "value": 1200000,
  "validFrom": "2025-07-01T00:00:00Z",
  "validUntil": "2025-09-30T23:59:59Z",
  "observedAt": "2025-09-15T00:00:00Z",
  "evidenceIds": ["evidence-sales-q3"],
  "status": "asserted"
}
```

### Temporal Semantics

| Field | Purpose |
|-------|---------|
| `validFrom` | When the fact became true |
| `validUntil` | When the fact ceased to be true |
| `observedAt` | When the fact was recorded or observed |

A fact with `validUntil` in the past was true but is no longer current. This is distinct from a fact that is simply false.

## Conflict Model

When evidence supports incompatible values, Evidensiq represents the conflict rather than selecting a winner.

Example: Product price differs between a 2025 PDF, CRM, and current website.

```json
{
  "id": "conflict-product-a-price",
  "type": "Conflict",
  "subject": "product-a",
  "predicate": "price",
  "values": [
    {
      "value": 99.00,
      "evidenceIds": ["evidence-pdf-2025"],
      "observedAt": "2025-01-15T00:00:00Z"
    },
    {
      "value": 89.00,
      "evidenceIds": ["evidence-crm"],
      "observedAt": "2025-08-01T00:00:00Z"
    },
    {
      "value": 94.99,
      "evidenceIds": ["evidence-website"],
      "observedAt": "2025-09-01T00:00:00Z"
    }
  ],
  "status": "unresolved",
  "freshness": {
    "mostRecent": "2025-09-01T00:00:00Z"
  }
}
```

Conflict statuses: `unresolved`, `acknowledged`, `resolved` (with resolution metadata).

## Confidence Model

Confidence is expressed through separated dimensions:

```json
{
  "confidence": {
    "evidenceStrength": "moderate",
    "sourceReliability": "high",
    "evidenceFreshness": "current",
    "inferenceConfidence": "moderate",
    "modelConfidence": "low"
  }
}
```

Avoid single meaningless numeric values. An `overallConfidence` field may be added by application policy as an aggregate — not as a default model output.

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

## Inferences

```json
{
  "id": "inference-delivery-correlation",
  "type": "Inference",
  "description": "Product B sales decline correlates with delivery complaint increase",
  "basedOn": ["signal-product-b-decline", "signal-delivery-complaints"],
  "confidence": {
    "inferenceConfidence": "moderate",
    "evidenceStrength": "moderate"
  }
}
```

## Recommendation Pipeline

Recommendations are produced through a pipeline, not direct generation:

```
Evidence → Signals → Inference → Candidate Recommendations
  → Constraint Validation → Evidence Validation → Ranking → Recommendations
```

### Recommendation Object

```json
{
  "id": "rec-no-acquisition-spend",
  "type": "Recommendation",
  "description": "Do not increase acquisition spend yet",
  "rationale": "Current operational constraint risks amplifying delivery failures",
  "status": "supported",
  "evidenceIds": ["evidence-operations-md", "evidence-support-md"],
  "inferenceIds": ["inference-delivery-correlation"],
  "constraintIds": ["constraint-supplier-lead-time"]
}
```

### Recommendation Statuses

| Status | Meaning |
|--------|---------|
| `candidate` | Proposed, pending validation |
| `supported` | Adequately backed by evidence and constraints |
| `conflicted` | Conflicting evidence or constraint violations |
| `insufficient-evidence` | Cannot be adequately supported |
| `stale` | Supporting evidence is outdated |
| `rejected` | Failed validation |

## Context Projection

Applications should not inject the entire business model into every LLM request. Evidensiq defines a conceptual projection:

```
context.project({
  objective: "increase customer retention",
  domains: ["sales", "support"],
  tokenBudget: 6000
})
```

A **BusinessContextProjection** contains a subset of:

- Relevant entities
- Metrics and goals
- Active constraints
- Supporting evidence
- Known conflicts
- Provenance references

Runtime implementation is planned for future phases.

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

Hidden scenario elements:

- High-margin Product B sales declining
- Support delivery complaints rising
- Supplier bottleneck in operations
- Company goal: grow Product B revenue

Expected reasoning chain:

| Layer | Content | Evidence |
|-------|---------|----------|
| **Signal** | Product B sales declining | `sales.csv` |
| **Correlated Signal** | Delivery complaints increasing | `support.md` |
| **Constraint** | Supplier lead time | `operations.md` |
| **Recommendation** | Do NOT increase acquisition spend yet | — |
| **Rationale** | Operational constraint risks amplifying delivery failures | — |
| **Status** | `supported` | — |

This scenario is documentation-only in v0.1.

## Evaluation Principles

Future evaluation must measure:

- **Evidence coverage** — Are recommendations backed by sufficient evidence?
- **Contradiction rate** — How often do conflicts go unresolved?
- **Unsupported assertion rate** — Claims without evidence references
- **Constraint violation rate** — Recommendations violating known constraints
- **Stale evidence rate** — Recommendations relying on outdated evidence
- **Recommendation stability** — Consistency under equivalent context

**Counterfactual principle:** Removing important supporting evidence should change, eliminate, or reduce confidence in a recommendation. Failure to do so indicates the system may not be using business context.

## Versioning

This specification is version **0.1**. Breaking changes will increment the major version. The `specVersion` field in `business-context.json` identifies the specification version.

## Related Documents

- [Terminology](terminology.md)
- [Architecture](../architecture/architecture.md)
- [JSON Schema](../../specification/business-context.schema.json)
