# Evidensiq

**Open infrastructure for evidence-backed business context and reasoning.**

> Business context should be infrastructure, not prompt text.

---

## The Problem

Organizations accumulate business knowledge across CRMs, spreadsheets, documents, support systems, and operational tools. When AI systems need this context, developers typically concatenate documents into prompts, build ad-hoc RAG pipelines, or lock knowledge into vendor-specific memory systems.

This approach is fragile, untraceable, and non-portable. Provenance is lost. Conflicts are hidden. Recommendations cannot be linked back to evidence.

## What Evidensiq Is

Evidensiq is a **provider-neutral, embeddable Business Context SDK and open specification** that aims to:

- Transform heterogeneous business evidence into structured, temporal, traceable business context
- Enable AI systems to produce evidence-backed reasoning and recommendations
- Do this **without owning the agent runtime**

Evidensiq defines the semantic contract for business context — not the agent, not the LLM, not the storage layer.

## What Evidensiq Is Not

Evidensiq is **not**:

- A generic AI agent framework, chatbot framework, or multi-agent system
- A generic RAG framework or vector database
- A generic memory layer, workflow engine, or LLM client
- An agent orchestration or tool-calling framework
- A CRM or business SaaS product

## Core Architecture

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
│  Business Model · Evidence          │
│  Signals · Inference                │
│  Recommendations · Validation       │
└─────────────────┬───────────────────┘
                  │
                  ▼
┌─────────────────────────────────────┐
│  Adapters                           │
│  LLM · Storage · Vector · Documents │
│  CRM · etc.                         │
└─────────────────────────────────────┘
```

**Agent runtimes remain above Evidensiq. Adapters remain below. Evidensiq owns the semantic/context contract.**

See [Architecture](docs/architecture/architecture.md) for full details.

## Semantic Invariants

These design invariants are foundational:

```
SOURCE ≠ EVIDENCE
EVIDENCE ≠ ASSERTION
ASSERTION ≠ FACT
FACT ≠ INFERENCE
INFERENCE ≠ RECOMMENDATION
```

```
DATA ≠ INSTRUCTION
```

Business documents and data are **evidence**, never privileged system instructions. **Fact** is a semantic classification (validated assertion), not a persisted type. The LLM must never be the source of truth.

See [Terminology](docs/specification/terminology.md).

## Portable Format: business-context.json

Evidensiq defines a portable JSON artifact for structured business context:

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
  "recommendations": []
}
```

Validated against [`specification/business-context.schema.json`](specification/business-context.schema.json).

See [Business Context Specification](docs/specification/business-context-spec.md).

## Example: Northstar Manufacturing

A synthetic scenario illustrating evidence-backed reasoning:

| Layer | Content | Linkage |
|-------|---------|---------|
| **Evidence** | Q3 sales data | `sales.csv` |
| **Assertion** | Product B Q3 revenue validated | `evidenceIds` |
| **Signal** | Product B sales declining | Evidence |
| **Inference (risk)** | Delivery failures correlate with decline | Signals |
| **Recommendation** | Do NOT increase acquisition spend yet | Inferences + constraints |
| **Status** | `supported` (L4 assessment) | — |

The company goal is to grow Product B revenue — but current operational constraints mean acquisition spend would amplify delivery failures rather than solve the underlying problem.

## Project Status

**Phase 1 — Specification & Reference Architecture (in progress).**

- Business Context Specification v0.1 architecture lock (EVI-1.1)
- JSON Schema and conformance model (L1–L4) available
- No runtime implementation yet
- No npm or NuGet packages published
- Not production-ready

See [Roadmap](docs/roadmap.md) for planned phases.

## Scope

EVI-0.1 includes:

- Open-source repository foundation (Apache 2.0)
- Architecture and specification documentation
- Business Context Specification v0.1
- JSON Schema for portable context artifacts
- Governance, contributing, and security policies

EVI-0.1 explicitly excludes runtime code, package publication, and CI pipelines.

## Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/architecture/architecture.md) | Design boundaries and principles |
| [Business Context Specification](docs/specification/business-context-spec.md) | Full v0.1 specification |
| [Terminology](docs/specification/terminology.md) | Core terms and definitions |
| [Conformance](docs/specification/conformance.md) | L1–L4 conformance model |
| [Roadmap](docs/roadmap.md) | Planned development phases |
| [Open Source Case](docs/open-source-case.md) | Why open infrastructure matters |
| [Public Interest](docs/public-interest.md) | Public interest rationale |
| [Funding](docs/funding.md) | Funding status and principles |
| [Contributing](CONTRIBUTING.md) | How to contribute |
| [Security](SECURITY.md) | Security policy and disclosure |
| [Governance](GOVERNANCE.md) | Project governance |

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before proposing specification changes. Semantic invariants and provider neutrality must be preserved.

## Security

Report security vulnerabilities responsibly — **not** through public issues. See [SECURITY.md](SECURITY.md).

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

---

*We are building open interoperability infrastructure for trustworthy business reasoning by AI systems.*
