# Evidensiq Architecture

This document describes the architectural boundaries and design principles of Evidensiq. It reflects the v0.1 architecture-lock model (EVI-1.1).

## Working Thesis

**Business context should be infrastructure, not prompt text.**

Applications and AI agents need structured, traceable business context — not ad-hoc concatenation of documents into prompts. Evidensiq provides the semantic contract and portable representation for that context.

## Positioning

Evidensiq is **open infrastructure for evidence-backed business context and reasoning**.

It is a provider-neutral, embeddable Business Context SDK contract that transforms heterogeneous business evidence into a structured, temporal, traceable business model and enables AI systems to produce evidence-backed recommendations **without owning the agent runtime**.

Primary consumer: **Developer**.

## Core Boundary

```
┌─────────────────────────────────────┐
│  Existing Agent / Application       │
│  Runtime                            │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  EVIDENSIQ                          │
│                                     │
│  Business Context Specification     │
│  Business Model                     │
│  Evidence / Provenance              │
│  Temporal Validity                  │
│  Conflict Representation            │
│  Context Query                      │
│  Context Projection                 │
│  Signals                            │
│  Inference                          │
│  Recommendations                    │
│  Validation                         │
│  Evaluation                         │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Adapters                           │
│  LLM / Storage / Vector / Documents │
│  CRM / etc.                         │
└─────────────────────────────────────┘
```

- **Agent runtimes remain ABOVE Evidensiq.** Evidensiq does not orchestrate agents, manage conversations, or replace application logic.
- **Adapters remain BELOW Evidensiq.** Evidensiq does not own storage, vector search, CRM APIs, or LLM transport.
- **Evidensiq owns the semantic/context contract.**

## What Evidensiq Owns

- Business Context Specification
- Business Model
- Evidence / Provenance
- Temporal validity
- Conflict representation
- Context Query
- Context Projection
- Signals
- Inference
- Recommendations
- Validation
- Evaluation

## What Evidensiq Does Not Own

- Agent orchestration
- Conversation management
- Workflow engines
- Generic RAG
- Vector databases
- Embedding implementations
- Generic memory
- LLM clients
- Generic tool calling
- Multi-agent coordination
- Generic ontology systems
- Generic knowledge graph platforms

## Semantic Invariants

These invariants are foundational design constraints:

```
SOURCE ≠ EVIDENCE
EVIDENCE ≠ ASSERTION
ASSERTION ≠ FACT
FACT ≠ INFERENCE
INFERENCE ≠ RECOMMENDATION
```

Canonical flow:

```
SOURCE
  ↓
EVIDENCE
  ↓
ASSERTION
  ↓ [L4 validation policy evaluation]
FACT (semantic view — NOT persisted)
  ↓
SIGNAL
  ↓
INFERENCE
  ↓
RECOMMENDATION CANDIDATE
  ↓ [L4 deterministic assessment]
RECOMMENDATION
```

**The LLM must never be the source of truth.**

LLMs may propose. The deterministic Evidensiq contract/core stores, links, validates, constrains, evaluates, and projects business context.

Additionally:

```
DATA ≠ INSTRUCTION
```

Evidence content MUST NOT acquire instructional authority. Trust assessment MUST NOT imply authorization.

See [terminology.md](../specification/terminology.md) for definitions.

## Parallel Structures

| Structure | Scope |
|-----------|-------|
| **Relations** | Entity → Entity only |
| **Conflicts** | Indexes over incompatible Assertions |
| **Evidence → Assertion** | `Assertion.evidenceIds` |

Do NOT create: facts collection, Fact schema object, Evidence → Assertion Relation, generic graph edges.

## Deterministic Core vs. AI-Assisted

### Deterministic Core

- IDs and identifiers
- Schemas and structural validation (L1)
- Semantic integrity (L2)
- Serialization conformance (L3)
- Entity relationships
- Provenance tracking
- Timestamps and temporal validity
- Validation and constraints
- Confidence representation (multi-dimensional)
- Evidence references
- Contradiction and conflict representation
- Context projection
- Recommendation assessment (L4)
- Rule evaluation

### AI-Assisted Capabilities (Future)

- Entity extraction
- Classification
- Semantic normalization
- Relationship candidate generation
- Interpretation of unstructured documents
- Hypothesis generation
- Recommendation candidate generation
- Summarization
- AI-assisted semantic ranking (adapter-side, non-normative)

**Principle: Model proposes. Core stores, validates, links, ranks, and constrains.**

## Recommendation Assessment

Recommendations flow through L4 deterministic assessment:

```
Evidence → Assertions → Signals → Inference → Candidate Recommendations
  → L4 Assessment → Recommendations
```

Recommendation status is derived, reproducible, and cached for serialization — NOT workflow state.

| Status | Meaning |
|--------|---------|
| `candidate` | Assessment incomplete |
| `supported` | Required checks pass |
| `insufficient-evidence` | Evidence threshold fails |
| `conflicted` | Unresolved contradiction affects supporting assertion |
| `stale` | Freshness policy fails |
| `rejected` | Hard constraint violation |

Hard constraint violation MUST NOT be represented as `conflicted`.

Default recommendation assessment policy: `evidensiq.default-recommendation-v0.1`

Constraint enforcement: `hard` (→ rejected) or `advisory` (→ warning only).

## Context Projection

Provider-neutral contract definitions:

- `BusinessContextProjectionRequest`
- `BusinessContextProjectionResult`

These are contract definitions — NOT root persisted properties.

Request supports: `objective`, `domains`, `entityIds`, `relationTraversal` (maxDepth 0–3), `asOf`, `includeConflicts`, `evidencePolicy`, `sizeLimit`, `ordering`, `extensions`.

NO `tokenBudget` in normative core. Provider-specific token budgeting belongs to adapters/runtimes.

Do NOT turn projection into RAG/vector search.

## Controlled Extensions

Normative domain objects are closed (`additionalProperties: false`) with optional `extensions` for namespaced keys.

Unknown extensions: preserve at L3, ignore for normative core processing.

Extensions MUST NOT execute code, define runtime hooks, or modify security authority.

## Portable Format

The primary portable artifact is `business-context.json`, validated against `specification/business-context.schema.json`.

Root requires `organizationId` resolving to an Organization Entity.

See [business-context-spec.md](../specification/business-context-spec.md) for the full specification.

## Conformance Model

Four levels — see [conformance.md](../specification/conformance.md):

| Level | Scope |
|-------|-------|
| L1 Structural | JSON Schema validation |
| L2 Semantic | References, integrity, temporal rules |
| L3 Serialization | Round-trip portability |
| L4 Behavioral | Policy evaluation, assessment derivation |

Do NOT place policy-derived behavior into L3.

## Evaluation Principles

Future evaluation should measure:

- Evidence coverage
- Contradiction rate
- Unsupported assertion rate
- Constraint violation rate
- Stale evidence rate
- Recommendation stability

**Counterfactual principle:** If important supporting evidence is removed, a recommendation should change, disappear, or reduce confidence.

## Reference Scenario

See [business-context-spec.md](../specification/business-context-spec.md) for the Northstar Manufacturing example demonstrating the complete semantic chain, historical change, contradiction, and explicit supersession.

## Related Documents

- [Business Context Specification](../specification/business-context-spec.md)
- [Terminology](../specification/terminology.md)
- [Conformance](../specification/conformance.md)
- [Roadmap](../roadmap.md)
