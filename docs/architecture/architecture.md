# Evidensiq Architecture

This document describes the architectural boundaries and design principles of Evidensiq. It reflects the early specification (v0.1) and is subject to evolution.

## Working Thesis

**Business context should be infrastructure, not prompt text.**

Applications and AI agents need structured, traceable business context — not ad-hoc concatenation of documents into prompts. Evidensiq aims to provide the semantic contract and portable representation for that context.

## Positioning

Evidensiq is **open infrastructure for evidence-backed business context and reasoning**.

It is a provider-neutral, embeddable Business Context SDK and open specification that transforms heterogeneous business evidence into structured, temporal, traceable business context and enables AI systems to produce evidence-backed reasoning and recommendations **without owning the agent runtime**.

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
│  Business Model                     │
│  Evidence / Provenance              │
│  Signals                            │
│  Inference                          │
│  Recommendations                    │
│  Validation                         │
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
- **Evidensiq owns the semantic/context contract.** The specification defines what business context means, how evidence flows to recommendations, and how conflicts and provenance are represented.

## What Evidensiq Is

- A **provider-neutral** business context specification
- A **portable format** (`business-context.json`) for structured context
- A **semantic model** for evidence, facts, inference, and recommendations
- **Infrastructure** for traceable, temporal, conflict-aware business reasoning

## What Evidensiq Is Not

Evidensiq is explicitly **not**:

- A generic AI agent framework
- A chatbot framework
- A generic RAG framework
- A vector database
- A generic memory layer
- A workflow engine
- An LLM client
- An agent orchestration system
- A tool-calling framework
- A multi-agent framework
- A CRM or business SaaS product

## Semantic Invariants

These invariants are foundational design constraints:

```
SOURCE ≠ EVIDENCE
EVIDENCE ≠ FACT
FACT ≠ INFERENCE
INFERENCE ≠ RECOMMENDATION
```

Canonical flow:

```
SOURCE
  ↓
EVIDENCE
  ↓
ASSERTION / FACT
  ↓
INFERENCE
  ↓
RECOMMENDATION
```

**The LLM must never be the source of truth.**

Additionally:

```
DATA ≠ INSTRUCTION
```

Business content may contain malicious or accidental prompt-like text. Evidensiq treats business documents and data as evidence, never as privileged system instructions.

See [terminology.md](../specification/terminology.md) for definitions.

## Deterministic Core vs. AI-Assisted

### Deterministic Core

The following capabilities belong in the deterministic, auditable core:

- IDs and identifiers
- Schemas and structural validation
- Entity relationships
- Provenance tracking
- Timestamps and temporal validity
- Versioning
- Validation and constraints
- Confidence representation (multi-dimensional)
- Evidence references
- Contradiction and conflict representation
- Freshness tracking
- Query and context projection
- Serialization
- Rule evaluation
- Recommendation validation

### AI-Assisted Capabilities (Future)

AI-assisted capabilities may later include:

- Entity extraction
- Classification
- Semantic normalization
- Relationship candidate generation
- Interpretation of unstructured documents
- Hypothesis generation
- Recommendation candidate generation
- Summarization

**Principle: Model proposes. Core stores, validates, links, ranks, and constrains.**

AI outputs are candidates subject to validation — not authoritative facts.

## Recommendation Pipeline

Recommendations flow through a **RecommendationPipeline**, not a simple generator:

```
Evidence
  ↓
Signals
  ↓
Inference
  ↓
Candidate Recommendations
  ↓
Constraint Validation
  ↓
Evidence Validation
  ↓
Ranking
  ↓
Recommendations
```

Possible recommendation statuses:

| Status | Meaning |
|--------|---------|
| `candidate` | Proposed, not yet validated |
| `supported` | Backed by sufficient evidence and constraints |
| `conflicted` | Conflicting evidence or constraints |
| `insufficient-evidence` | Cannot be adequately supported |
| `stale` | Supporting evidence is outdated |
| `rejected` | Failed validation |

## Context Projection

Applications should not inject the entire business model into every model request. Evidensiq defines a conceptual projection API:

```javascript
context.project({
  objective: "increase customer retention",
  domains: ["sales", "support"],
  tokenBudget: 6000
});
```

A **BusinessContextProjection** may contain:

- Relevant entities
- Metrics and goals
- Active constraints
- Supporting evidence
- Known conflicts
- Provenance references

This is conceptual in v0.1; runtime implementation is planned for future phases.

## Portable Format

The primary portable artifact is `business-context.json`, validated against `specification/business-context.schema.json`.

See [business-context-spec.md](../specification/business-context-spec.md) for the full specification.

## Evaluation Principles

Future evaluation should measure:

- Evidence coverage
- Contradiction rate
- Unsupported assertion rate
- Constraint violation rate
- Stale evidence rate
- Recommendation stability

**Counterfactual principle:** If important supporting evidence is removed, a recommendation should change, disappear, or reduce confidence. If it does not, the reasoning system may not actually be using business context.

## Reference Scenario

See the [README](../../README.md) for the Northstar Manufacturing example demonstrating signals, evidence, constraints, and recommendations in practice.

## Related Documents

- [Business Context Specification](../specification/business-context-spec.md)
- [Terminology](../specification/terminology.md)
- [Roadmap](../roadmap.md)
- [Open Source Case](../open-source-case.md)
