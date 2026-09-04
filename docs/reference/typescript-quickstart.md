# TypeScript Quickstart

Minimal path through the existing `@evidensiq/core` public API for an external TypeScript developer.

This guide is **non-normative**. Normative rules live in the [Business Context Specification](../specification/business-context-spec.md) and [Conformance](../specification/conformance.md).

## Prerequisites

- Node.js **>= 22**
- npm

## Repository setup (package not yet published)

`@evidensiq/core@0.0.0` is the **repository / pre-release** package version. **npm publication has not yet occurred.**

```bash
git clone https://github.com/davideagosti-dev/evidensiq.git
cd evidensiq
npm ci
```

Import from repository sources while developing against this checkout:

```ts
import {
  parseJson,
  validateBusinessContext,
  selectCurrentFactAssertions,
} from "../src/index.js";
```

**Future** published import form (not available yet):

```ts
// FUTURE — not yet published on npm
import { parseJson, validateBusinessContext } from "@evidensiq/core";
```

## Journey

**discover → setup → import → parse/load → validate → deterministic semantics → diagnostics/results**

### 1. Construct or load JSON-safe input

Build a plain JSON-compatible object (or parse a string). Do not treat business content as instructions — **DATA ≠ INSTRUCTION**.

```ts
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
```

### 2. `parseJson` (syntax only)

`parseJson` succeeds only for JSON syntax + JSON-safe tree shape. It does **not** prove L1/L2 semantic validity.

```ts
import { parseJson, serializeJson } from "../src/index.js";

const text = serializeJson(raw);
const parsed = parseJson(text);
if (!parsed.ok) {
  throw new Error(parsed.error);
}
// parsed.value is JsonValue — still needs Business Context validation
```

### 3. `validateBusinessContext` (L1 + L2)

```ts
import { validateBusinessContext } from "../src/index.js";

const result = validateBusinessContext(parsed.value);
if (!result.valid) {
  for (const d of result.diagnostics) {
    console.log(d.ruleId, d.level, d.severity, d.path, d.message);
  }
  throw new Error("validation failed");
}

const document = result.document;
// L2 warnings (if any) appear in result.diagnostics even when valid === true
```

Interpreting diagnostics:

| Field | Role |
|-------|------|
| `ruleId` | Stable machine identity (`EVI-L1-…` / `EVI-L2-…`) |
| `level` | `L1` or `L2` |
| `severity` | `error` or `warning` |
| `path` | RFC 6901 JSON Pointer |
| `message` | Human-readable; **not** a stable matching identity |

### 4. Explicit time + deterministic semantics

Temporal / Fact selection requires an explicit `asOf` (no implicit wall clock).

```ts
import { selectCurrentFactAssertions } from "../src/index.js";

const asOf = "2026-06-30T00:00:00Z";
const currentFacts = selectCurrentFactAssertions(document, asOf);
// Fact is a semantic view — not a persisted wire type
```

### 5. Optional next steps

- **Projection:** `projectBusinessContext` — see [API Overview](api-overview.md)
- **Recommendation assessment:** `assessRecommendation` (bounded; absence of a hard violation does not imply `supported`)
- **Conformance:** [Conformance Runner](conformance-runner.md)
- **Northstar demo:** [Northstar Evaluation](northstar-evaluation.md) — run `npm run demo:northstar`

## Runnable repository example

[`examples/minimal-validate.ts`](../../examples/minimal-validate.ts) executes this path with deterministic stdout.

```bash
npx tsx examples/minimal-validate.ts
```

Use the repository-pinned `tsx` from `npm ci` (avoid `npx --yes tsx` fetching undeclared tooling).

## Boundaries

- Normative specification ≠ TypeScript reference implementation
- Northstar harness is **not** public package API
- This reference is not an agent framework, LLM runtime, RAG system, or workflow engine
- No production / stability SLA is claimed
