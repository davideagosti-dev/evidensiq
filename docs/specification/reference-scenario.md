# Northstar Manufacturing Reference Scenario

## Purpose

Northstar Manufacturing is the canonical executable reference business scenario for Evidensiq Business Context Specification v0.1. It demonstrates that the locked architecture can represent a traceable evidence-backed recommendation without collapsing Source, Evidence, Assertion, Fact, Signal, Inference, and Recommendation into one undifferentiated model.

The machine-readable fixture is [`fixtures/northstar-manufacturing.json`](../../fixtures/northstar-manufacturing.json). This document explains the scenario narrative, semantic test cases, and projection expectations without altering normative specification.

## Scenario Window

**Analysis period:** Q1–Q2 2026 (calendar quarters).

**Canonical `asOf`:** `2026-06-30T00:00:00Z` (last day of Q2; valid-time filter point for projection).

All timestamps in the fixture use fixed UTC `Z` suffix values within the 2026 window.

## Business Context

Northstar Manufacturing is a B2B industrial components manufacturer. Product B is strategically important and high margin.

Recent evidence shows:

| Indicator | Q1 2026 | Q2 2026 |
|-----------|---------|---------|
| Product B quarterly revenue | $1,450,000 | $1,180,000 (−18.6%) |
| Delivery complaint rate | 4.5% | 8.2% |
| Product B gross margin | 62% (corrected from erroneous 58%) | 62% |
| Supplier component lead time | — | 15 days (bottleneck) |
| Revenue growth target | 20% YoY | 20% YoY |

A superficial analysis (high margin + growth goal) could recommend increasing direct-sales acquisition spend for Product B. The evidence-backed context supports deferring that spend until the supplier/fulfilment hard constraint is materially mitigated.

## Source Corpus

Four conceptual sources. `products.csv` and `customers.csv` are intentionally omitted; their semantics are covered by strategy and entity context.

| Source ID | Conceptual file | Purpose | Provenance |
|-----------|-----------------|---------|------------|
| `source-sales-csv` | `sales.csv` | Quarterly Product B revenue; historical-change pair | internal, imported, trusted |
| `source-support-md` | `support.md` | Delivery complaint counts/rates Q1 vs Q2 | internal, system-generated, trusted |
| `source-operations-md` | `operations.md` | Supplier bottleneck report + contradictory capacity assessment | internal, user-provided, trusted |
| `source-strategy-md` | `strategy.md` | Growth goal, Product B strategic importance, margin | internal, user-provided, trusted |

Source content remains observation material. `trustAssessment` does not grant authorization (DATA ≠ INSTRUCTION).

## Traceability Chain

```
source-sales-csv
  → ev-sales-q1-2026 / ev-sales-q2-2026
    → asrt-product-b-revenue-q1-2026 [FACT] / asrt-product-b-revenue-q2-2026 [FACT]
      → signal-product-b-sales-declining
        → inference-acquisition-amplifies-delivery-risk [risk]
          → rec-defer-product-b-acquisition-spend [supported]
            → assessment: evidensiq.default-recommendation-v0.1

source-support-md
  → ev-support-complaints-q1-2026 / ev-support-complaints-q2-2026
    → asrt-delivery-complaint-rate-q1-2026 [FACT] / asrt-delivery-complaint-rate-q2-2026 [FACT]
      → signal-delivery-complaints-increasing
        → inference-acquisition-amplifies-delivery-risk [risk]
          → rec-defer-product-b-acquisition-spend [supported]

source-operations-md
  → ev-ops-supplier-bottleneck
    → asrt-supplier-lead-time [FACT]
    → asrt-supplier-capacity-constrained [FACT]
      → signal-supplier-constraint-active
        → inference-acquisition-amplifies-delivery-risk [risk]
          → rec-defer-product-b-acquisition-spend [supported]
  → ev-ops-capacity-assessment
    → asrt-supplier-capacity-normal [asserted, NOT FACT]
      ↔ conflict-supplier-capacity-status [unresolved] with asrt-supplier-capacity-constrained

source-strategy-md
  → ev-strategy-margin
    → asrt-product-b-margin-preliminary [superseded] → asrt-product-b-margin [FACT]
      → inference-product-b-growth-opportunity-post-constraint [opportunity]
        → rec-defer-product-b-acquisition-spend [supported]
        → rec-increase-product-b-acquisition-spend [rejected via constraint-compliance fail]
  → ev-strategy-growth-goal
    → asrt-goal-target-growth [FACT]
      → inference-product-b-growth-opportunity-post-constraint [opportunity]

constraint-supplier-capacity
  → rel-constraint-constrains-fulfilment
    → rec-defer-product-b-acquisition-spend.constraintIds
    → rec-increase-product-b-acquisition-spend.constraintIds [rejected]
```

**Fact qualification:** An Assertion qualifies as a Fact when `classification = validated`, `validation.result = valid`, and `validation.policyId` is recorded under `evidensiq.default-fact-v0.1`. No Fact objects are persisted.

## Historical Change

Product B quarterly revenue demonstrates normal business evolution across non-overlapping half-open intervals:

| Assertion | Value | `validFrom` | `validUntil` |
|-----------|-------|-------------|--------------|
| `asrt-product-b-revenue-q1-2026` | 1450000 | `2026-01-01T00:00:00Z` | `2026-04-01T00:00:00Z` |
| `asrt-product-b-revenue-q2-2026` | 1180000 | `2026-04-01T00:00:00Z` | `2026-07-01T00:00:00Z` |

Interval semantics: `[validFrom, validUntil)` — inclusive start, exclusive end. Q1 ends at 2026-04-01; Q2 starts at 2026-04-01. **No overlap.**

**Explicit semantics:**

- historical change ≠ conflict
- historical change ≠ supersession

The revenue decline feeds `signal-product-b-sales-declining` but does not create a Conflict and does not use `supersededBy`.

## Contradiction

Supplier capacity status during Q2 2026:

| Assertion | Value | Classification | Q2 validity |
|-----------|-------|----------------|-------------|
| `asrt-supplier-capacity-constrained` | `constrained` | validated | `[2026-04-01, 2026-07-01)` |
| `asrt-supplier-capacity-normal` | `normal` | asserted | `[2026-04-01, 2026-07-01)` |

**Conflict:** `conflict-supplier-capacity-status`

- `assertionIds`: `asrt-supplier-capacity-constrained`, `asrt-supplier-capacity-normal`
- `conflictKind`: `contradiction`
- `status`: `unresolved`

Values are not duplicated in the Conflict object. The contradiction remains unresolved. The canonical recommendation assessment records `conflict-impact → warning` because contradictory evidence exists in context but is not on the supporting assertion chain for the deferral recommendation.

## Supersession

Margin correction (data backfill, not historical evolution):

| Assertion | Value | Classification |
|-----------|-------|----------------|
| `asrt-product-b-margin-preliminary` | 58 | superseded |
| `asrt-product-b-margin` | 62 | validated |

- `asrt-product-b-margin-preliminary.supersededBy` = `asrt-product-b-margin`
- Both share `validFrom: 2026-01-01T00:00:00Z` with overlapping validity
- This is an explicit correction of an erroneous preliminary figure, not quarter-over-quarter business change

## Recommendation

**Canonical:** `rec-defer-product-b-acquisition-spend`

- **Status:** `supported`
- **Meaning:** Defer material increase to Product B direct-sales acquisition spend until the supplier capacity constraint on fulfilment is materially mitigated
- **Assessment policy:** `evidensiq.default-recommendation-v0.1` (`evaluatedAt: 2026-06-30T14:00:00Z`)
- **Results:** evidence-threshold → pass; constraint-compliance → pass; conflict-impact → warning; freshness-policy → pass

Goal traceability travels through `rel-goal-targets-product-b` and inference context (no `goalIds` field on Recommendation).

## Rejected Candidate

**Alternative:** `rec-increase-product-b-acquisition-spend`

- **Description:** Increase Product B direct-sales acquisition spend by 25% immediately
- **Status:** `rejected` (not `conflicted`)
- **Rationale captured:** High margin + growth target without respecting supplier constraint
- **Assessment:** `constraint-compliance → fail` under `evidensiq.default-recommendation-v0.1`

Hard constraint violation on `constraint-supplier-capacity` (`properties.enforcement = hard`) produces `rejected`, demonstrating the L4 distinction between hard-constraint rejection and unresolved contradiction (`conflicted`).

## Projection Expectation

Conceptual `BusinessContextProjectionRequest` (contract definition in schema `$defs`; not root fixture data):

```json
{
  "objective": "Evaluate whether Product B direct-sales acquisition investment should increase",
  "entityIds": [
    "product-b",
    "channel-direct-sales",
    "process-fulfilment",
    "constraint-supplier-capacity",
    "goal-grow-product-b-revenue",
    "metric-product-b-revenue",
    "metric-delivery-complaint-rate"
  ],
  "relationTraversal": { "maxDepth": 2 },
  "asOf": "2026-06-30T00:00:00Z",
  "includeConflicts": true,
  "sizeLimit": { "maxItems": 200 }
}
```

**Schema notes on optional fields:**

- `evidencePolicy` is a free-form string in the schema with no normative policy IDs defined in v0.1 conformance. Any value (e.g. a future `evidensiq.default-evidence-v0.1`) would be adapter-defined semantics. This scenario documents inclusion expectations without asserting a standard policy ID.
- `ordering` is similarly a free-form string with undefined normative semantics in v0.1. Omitted here pending EVI-1.3 policy definitions.
- No `tokenBudget` or provider-specific concepts.

**Expected projection survival at `asOf` 2026-06-30:**

- All requested entities plus relation-traversed entities (`org-northstar`, `segment-enterprise-b2b`, margin metric)
- All 8 relations within traversal depth
- Q2-valid assertions (revenue Q2, complaints Q2, margin corrected, supplier facts); Q1 revenue excluded by temporal filter
- Both recommendations, 3 signals, 2 inferences
- `conflict-supplier-capacity-status` when `includeConflicts: true`
- Evidence and sources referenced by projected objects per adapter evidence policy

## Schema Pressure Notes

Documentation-only observations from EVI-1.2A (P2; no schema mutation):

| ID | Finding |
|----|---------|
| SPF-01 | No normative `evidencePolicy` policy IDs currently defined in conformance.md |
| SPF-02 | Recommendation has no `goalIds` field; goal traceability travels through graph/inference context |
| SPF-03 | Signal does not directly reference Assertions; it uses schema-defined `evidenceIds` only |

## EVI-1.3 Boundary

This scenario owns the canonical business narrative, temporal/contradiction/supersession exemplars, and supported vs rejected recommendation pair. Broader conformance work remains deferred to EVI-1.3:

- General invalid-document corpus
- Cross-language round-trip harness
- Validator behavior tests per L1–L4 level
- Edge-case matrix and evaluation harness
- Normative `evidencePolicy` and `ordering` policy definitions

## Related Documents

- [Business Context Specification](business-context-spec.md)
- [Conformance Model](conformance.md)
- [JSON Schema](../../specification/business-context.schema.json)
