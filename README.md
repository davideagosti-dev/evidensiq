# Evidensiq

**Open infrastructure for evidence-backed business context and reasoning.**

> Business context should be infrastructure, not prompt text.

---

## What Evidensiq Is

Evidensiq is a **provider-neutral Business Context specification and TypeScript reference implementation** (`@evidensiq/core`) that:

- Transforms heterogeneous business evidence into structured, temporal, traceable business context
- Enables AI systems to produce evidence-backed reasoning and recommendations
- Does this **without owning the agent runtime**

Evidensiq owns the semantic contract for business context — not the agent, not the LLM, not the storage layer.

## What Evidensiq Is Not

Evidensiq is **not**:

- An agent framework, LLM runtime, RAG system, or workflow engine
- A generic memory layer, vector database, or embeddings stack
- An agent orchestration or tool-calling framework
- A CRM or business SaaS product

## Current Status

| Item | Status |
|------|--------|
| **Phase 1** — Specification & reference architecture | **Closed** |
| **Phase 2** — TypeScript reference implementation | **Closed** (EVI-2.1–EVI-2.7 complete for approved Phase 2 scope) |
| **Phase 3** — .NET reference implementation | **Not started** |
| **Package** | `@evidensiq/core@0.0.0` (repository / pre-release version) |
| **npm publication** | **Not yet performed** |
| **Node** | `>=22` |
| **Production / stability SLA** | **None claimed** |

This repository provides a **TypeScript reference implementation** of the frozen Phase 1 scope, complete for the approved Phase 2 scope. It is not an agent framework, LLM runtime, RAG system, or workflow engine. Package version `0.0.0` is the repository pre-release version; npm publication has not occurred.

See [Roadmap](docs/roadmap.md).

## Core Thesis

Organizations accumulate business knowledge across CRMs, spreadsheets, documents, and operational tools. Concatenating documents into prompts or locking knowledge into vendor-specific memory systems loses provenance, hides conflicts, and breaks portability.

Evidensiq defines a portable semantic contract so evidence-backed reasoning can be validated, traced, and shared without owning the agent stack.

## Semantic Invariants

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

Business documents and data are **evidence**, never privileged system instructions. **Fact** is a semantic classification (validated assertion), not a persisted wire type.

See [Terminology](docs/specification/terminology.md).

## Normative vs Reference

| Kind | What |
|------|------|
| **Normative** | Phase 1 specification, JSON Schema, conformance rules where defined normatively |
| **Reference** | `@evidensiq/core` TypeScript behavior implementing the frozen scope; some deterministic algorithms where Phase 1 leaves room (e.g. N-way contradiction temporal common-intersection is **reference implementation behavior**, not a newly normative Phase 1 rule) |
| **Non-normative** | Northstar scenario outcomes, human-readable conclusions, quickstart examples |

## Scope / Non-Scope

**Evidensiq owns:** Business Context Specification; model; evidence/provenance; temporal validity; conflict representation; projection; signals/inference representation; recommendation validation/assessment; conformance/evaluation.

**Evidensiq does not own:** agent orchestration; conversation management; workflow engines; generic RAG; vector DBs; embeddings; generic memory; LLM clients; generic tool calling; multi-agent coordination.

## Quickstart (developers)

While the package remains unpublished, clone and use the repository:

```bash
git clone https://github.com/davideagosti-dev/evidensiq.git
cd evidensiq
npm ci
```

Minimal path through the public API:

**discover → setup → import → parse → validate → deterministic semantics → diagnostics/results**

See the full walkthrough: [TypeScript Quickstart](docs/reference/typescript-quickstart.md).

Verify the reference:

```bash
npm test                 # unit + conformance + Northstar regression
npm run build
npm run demo:northstar   # Northstar Q1–Q14 (expect 14 PASS / 0 FAIL / 0 SKIP)
```

Optional local checks: `npm run lint`, `npm run typecheck`, `npm run pack:check`, `npm run format:check`.

Copy/paste minimal example (repository context): [`examples/minimal-validate.ts`](examples/minimal-validate.ts).

## Documentation

### Normative specification

| Document | Description |
|----------|-------------|
| [Business Context Specification](docs/specification/business-context-spec.md) | Normative v0.1 specification |
| [Terminology](docs/specification/terminology.md) | Core terms and invariants |
| [Conformance](docs/specification/conformance.md) | L1–L4 conformance model |
| [Evaluation](docs/specification/evaluation.md) | Evaluation model (normative Phase 1 text) |
| [Architecture](docs/architecture/architecture.md) | Design boundaries |

### TypeScript reference

| Document | Description |
|----------|-------------|
| [TypeScript Quickstart](docs/reference/typescript-quickstart.md) | Install → parse → validate → semantics |
| [API Overview](docs/reference/api-overview.md) | Task-oriented map of the public surface |
| [Conformance Runner](docs/reference/conformance-runner.md) | `runConformanceCase` / `runConformanceSuite` |
| [Northstar Evaluation](docs/reference/northstar-evaluation.md) | Q1–Q14 reference demonstration |

### Project

| Document | Description |
|----------|-------------|
| [Roadmap](docs/roadmap.md) | Phase status |
| [Contributing](CONTRIBUTING.md) | Contributor workflow |
| [Security](SECURITY.md) | Disclosure and `DATA ≠ INSTRUCTION` |
| [Governance](GOVERNANCE.md) | Project governance |
| [Funding](docs/funding.md) | Funding status (no application in this sprint) |

## Portable Format

Validated against [`specification/business-context.schema.json`](specification/business-context.schema.json).

```json
{
  "specVersion": "0.1",
  "organizationId": "org-example",
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

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
