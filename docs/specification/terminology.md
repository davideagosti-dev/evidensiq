# Terminology

This document defines core terms used in the Evidensiq specification. Definitions reflect the early v0.1 model and may be refined in future versions.

## Semantic Hierarchy

Evidensiq enforces a strict separation between layers of business knowledge:

```
SOURCE → EVIDENCE → ASSERTION/FACT → INFERENCE → RECOMMENDATION
```

Each layer has distinct meaning and must not be conflated.

## Core Terms

### Source

A **source** is the origin of raw business information — a system, document, person, or process that produced or holds data.

Examples: CRM system, PDF report, website, CSV export, user input, internal database.

A source is not evidence itself; it is the provenance anchor for evidence.

### Evidence

**Evidence** is a specific artifact or observation derived from a source, suitable for supporting assertions.

Examples: a row in `sales.csv`, a paragraph in `support.md`, a CRM field value, a metric reading at a point in time.

Evidence carries provenance (which source, when observed) and may carry trust metadata.

**SOURCE ≠ EVIDENCE**

### Assertion / Fact

An **assertion** (or **fact**) is a structured claim about the business, supported by one or more evidence items.

Examples: "Product B Q3 revenue was $1.2M", "Average delivery time is 14 days", "Company goal is to grow Product B revenue by 20%."

Assertions may have temporal validity (`validFrom`, `validUntil`, `observedAt`).

**EVIDENCE ≠ FACT** — A fact is a validated, structured claim; evidence is the raw support.

### Inference

An **inference** is a derived conclusion from one or more facts, signals, or other inferences.

Examples: "Product B sales decline correlates with delivery complaint increase", "Supplier bottleneck may be constraining fulfillment capacity."

Inferences are not recommendations; they represent analytical conclusions.

**FACT ≠ INFERENCE**

### Recommendation

A **recommendation** is an actionable proposal, validated against evidence and constraints, with traceable rationale.

Examples: "Do not increase acquisition spend yet", "Prioritize supplier lead time reduction before marketing expansion."

Recommendations carry status (candidate, supported, conflicted, etc.) and must reference supporting evidence.

**INFERENCE ≠ RECOMMENDATION**

## Analytical Objects

### Signal

A **signal** is an observed pattern or change in business data that may warrant attention.

Examples: "Product B sales declining", "Delivery complaints increasing."

Signals reference evidence and may trigger inference.

### Opportunity

An **opportunity** is a identified potential for positive business outcome, derived from analysis.

### Risk

A **risk** is an identified potential for negative business outcome, derived from analysis.

## Trust and Provenance

### Provenance

**Provenance** is metadata tracing an object back to its source, including identity, observation time, and trust classification.

Minimum trust classifications:

| Classification | Meaning |
|----------------|---------|
| `trusted` | Verified internal source |
| `untrusted` | Unknown or unverified origin |
| `external` | Third-party origin |
| `user-provided` | Explicitly submitted by a user |
| `system-generated` | Produced by automated process |

### Temporal Semantics

Business facts support temporal dimensions:

| Field | Meaning |
|-------|---------|
| `validFrom` | When the fact became true |
| `validUntil` | When the fact ceased to be true (if applicable) |
| `observedAt` | When the fact was observed or recorded |

Distinguish **FALSE** (currently untrue) from **WAS TRUE** (historically true but no longer valid).

## Conflict

A **conflict** exists when multiple evidence items or assertions support incompatible values for the same subject.

Evidensiq does not arbitrarily resolve conflicts. It represents:

- Conflicting values
- Source and evidence references
- Observation times
- Freshness indicators
- Unresolved/conflicted status

## Confidence

Confidence is **multi-dimensional**. Avoid meaningless single values like `confidence: 0.97`.

Dimensions include:

| Dimension | Meaning |
|-----------|---------|
| `evidenceStrength` | How strongly evidence supports a claim |
| `sourceReliability` | Trustworthiness of the source |
| `evidenceFreshness` | Recency of supporting evidence |
| `inferenceConfidence` | Confidence in derived conclusions |
| `modelConfidence` | Model's self-assessed confidence (lowest trust) |

An `overallConfidence` aggregate may exist as application-defined or policy-derived — not as a model-generated default.

## Data vs. Instruction

```
DATA ≠ INSTRUCTION
```

Business documents and data are **evidence**, not system instructions. Content that resembles prompts ("ignore previous instructions") must be treated as untrusted data, never as privileged commands.

## Provider Neutrality

**Provider-neutral** means the specification does not depend on, favor, or require a specific AI provider, agent framework, cloud platform, or storage technology.

## Portable Artifact

**business-context.json** — The portable JSON document representing a structured business context, conforming to `specification/business-context.schema.json`.

## Related Documents

- [Business Context Specification](business-context-spec.md)
- [Architecture](../architecture/architecture.md)
