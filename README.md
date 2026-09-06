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

**`@evidensiq/core`** is the Phase 2 TypeScript reference implementation: portable model types, L1/L2 validation, deterministic temporal / Fact / conflict semantics, context projection, bounded recommendation assessment, and a portable conformance runner.

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
| **Phase 3** — Portable Context Consumption | **In progress** (EVI-3.1 authorized; .NET deferred) |
| **Package** | `@evidensiq/core@0.1.0` (first intended public release; pre-1.0) |
| **Node** | `>=22` |
| **Module format** | **ESM-only** (TypeScript declarations included) |
| **Production / stability SLA** | **None claimed** |

This repository provides a **TypeScript reference implementation** of the frozen Phase 1 scope, complete for the approved Phase 2 scope. Version `0.1.0` is the first intended public release of `@evidensiq/core`. npm publication is a separate Product Owner authorization step.

See the [Roadmap](https://github.com/davideagosti-dev/evidensiq/blob/main/docs/roadmap.md).

## Install

Requires **Node.js >= 22**. The package is **ESM-only** and ships TypeScript declarations.

```bash
npm install @evidensiq/core
```

## Quickstart

Minimal path through the public API:

**discover → setup → import → parse → validate → deterministic semantics → diagnostics/results**

```ts
import {
  parseJson,
  selectCurrentFactAssertions,
  serializeJson,
  validateBusinessContext,
} from "@evidensiq/core";

const ASOF = "2026-06-30T00:00:00Z";

const raw = {
  specVersion: "0.1",
  organizationId: "org-1",
  entities: [
    { id: "org-1", type: "Organization", name: "Org One" },
    { id: "entity-1", type: "Product", name: "Product One" },
  ],
  sources: [
    {
      id: "source-1",
      type: "Source",
      provenance: {
        originScope: "internal",
        acquisitionMethod: "imported",
        trustAssessment: "trusted",
      },
    },
  ],
  evidence: [{ id: "ev-1", type: "Evidence", sourceId: "source-1" }],
  assertions: [
    {
      id: "asrt-1",
      type: "Assertion",
      subject: "entity-1",
      predicate: "status",
      value: "active",
      evidenceIds: ["ev-1"],
      observedAt: "2026-01-15T00:00:00Z",
      validFrom: "2026-01-01T00:00:00Z",
      classification: "validated",
      validation: {
        policyId: "evidensiq.default-fact-v0.1",
        evaluatedAt: "2026-06-30T12:00:00Z",
        result: "valid",
      },
    },
  ],
};

const text = serializeJson(raw);
const parsed = parseJson(text);
if (!parsed.ok) {
  throw new Error(parsed.error);
}

const validated = validateBusinessContext(parsed.value);
if (!validated.valid) {
  throw new Error("validation failed");
}

const currentFacts = selectCurrentFactAssertions(validated.document, ASOF);
console.log(currentFacts.map((a) => a.id));
```

Additional public capabilities (same root entrypoint):

- **Validation:** `validateBusinessContext`, `validateL1`, `validateL2`
- **Projection / recommendation assessment:** `projectBusinessContext`, `assessRecommendation`, `buildRecommendationSupportGraph`
- **Conformance runner:** `runConformanceCase`, `runConformanceSuite`

Full walkthrough: [TypeScript Quickstart](https://github.com/davideagosti-dev/evidensiq/blob/main/docs/reference/typescript-quickstart.md). API map: [API Overview](https://github.com/davideagosti-dev/evidensiq/blob/main/docs/reference/api-overview.md).

The **Northstar Manufacturing** reference scenario (Q1–Q14) demonstrates the integrated Phase 2 baseline; see [Northstar Evaluation](https://github.com/davideagosti-dev/evidensiq/blob/main/docs/reference/northstar-evaluation.md).

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

See [Terminology](https://github.com/davideagosti-dev/evidensiq/blob/main/docs/specification/terminology.md).

## Normative vs Reference

| Kind | What |
|------|------|
| **Normative** | Phase 1 specification, JSON Schema, conformance rules where defined normatively |
| **Reference** | `@evidensiq/core` TypeScript behavior implementing the frozen scope; some deterministic algorithms where Phase 1 leaves room (e.g. N-way contradiction temporal common-intersection is **reference implementation behavior**, not a newly normative Phase 1 rule) |
| **Non-normative** | Northstar scenario outcomes, human-readable conclusions, quickstart examples |

## Scope / Non-Scope

**Evidensiq owns:** Business Context Specification; model; evidence/provenance; temporal validity; conflict representation; projection; signals/inference representation; recommendation validation/assessment; conformance/evaluation.

**Evidensiq does not own:** agent orchestration; conversation management; workflow engines; generic RAG; vector DBs; embeddings; generic memory; LLM clients; generic tool calling; multi-agent coordination.

## Portable Format

Validated against the schema shipped in the package (`specification/business-context.schema.json`). Repository copy: [`specification/business-context.schema.json`](https://github.com/davideagosti-dev/evidensiq/blob/main/specification/business-context.schema.json).

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

## Documentation

Repository documentation (not all paths are included in the npm package tarball):

### Normative specification

| Document | Description |
|----------|-------------|
| [Business Context Specification](https://github.com/davideagosti-dev/evidensiq/blob/main/docs/specification/business-context-spec.md) | Normative v0.1 specification |
| [Terminology](https://github.com/davideagosti-dev/evidensiq/blob/main/docs/specification/terminology.md) | Core terms and invariants |
| [Conformance](https://github.com/davideagosti-dev/evidensiq/blob/main/docs/specification/conformance.md) | L1–L4 conformance model |
| [Evaluation](https://github.com/davideagosti-dev/evidensiq/blob/main/docs/specification/evaluation.md) | Evaluation model (normative Phase 1 text) |
| [Architecture](https://github.com/davideagosti-dev/evidensiq/blob/main/docs/architecture/architecture.md) | Design boundaries |

### TypeScript reference

| Document | Description |
|----------|-------------|
| [TypeScript Quickstart](https://github.com/davideagosti-dev/evidensiq/blob/main/docs/reference/typescript-quickstart.md) | Install → parse → validate → semantics |
| [API Overview](https://github.com/davideagosti-dev/evidensiq/blob/main/docs/reference/api-overview.md) | Task-oriented map of the public surface |
| [Conformance Runner](https://github.com/davideagosti-dev/evidensiq/blob/main/docs/reference/conformance-runner.md) | `runConformanceCase` / `runConformanceSuite` |
| [Northstar Evaluation](https://github.com/davideagosti-dev/evidensiq/blob/main/docs/reference/northstar-evaluation.md) | Q1–Q14 reference demonstration |

### Project

| Document | Description |
|----------|-------------|
| [Roadmap](https://github.com/davideagosti-dev/evidensiq/blob/main/docs/roadmap.md) | Phase status |
| [Contributing](https://github.com/davideagosti-dev/evidensiq/blob/main/CONTRIBUTING.md) | Contributor workflow |
| [Security](https://github.com/davideagosti-dev/evidensiq/blob/main/SECURITY.md) | Disclosure and `DATA ≠ INSTRUCTION` |
| [Governance](https://github.com/davideagosti-dev/evidensiq/blob/main/GOVERNANCE.md) | Project governance |
| [Funding](https://github.com/davideagosti-dev/evidensiq/blob/main/docs/funding.md) | Funding status |

## Developing from this repository

For contributors working on the reference implementation itself (not the primary npm consumer path), see [Contributing](https://github.com/davideagosti-dev/evidensiq/blob/main/CONTRIBUTING.md). Typical local setup:

```bash
git clone https://github.com/davideagosti-dev/evidensiq.git
cd evidensiq
npm ci
npm test
npm run build
npm run demo:northstar   # Northstar Q1–Q14 (expect 14 PASS / 0 FAIL / 0 SKIP)
```

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
