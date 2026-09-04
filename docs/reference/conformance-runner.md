# Conformance Runner

Developer guide for the public portable conformance runner exported by `@evidensiq/core`.

This document is **non-normative** relative to Phase 1 rules. Normative L1–L4 requirements live in [Conformance](../specification/conformance.md).

## Public API

```ts
import {
  runConformanceCase,
  runConformanceSuite,
  type ConformanceCaseInput,
  type ConformanceSuiteResult,
} from "../src/index.js"; // or @evidensiq/core when published
```

| Function | Role |
|----------|------|
| `runConformanceCase` | Execute one in-memory case |
| `runConformanceSuite` | Execute many cases; aggregate counts / `ok` |

**No filesystem / path / cwd** in the public core. Callers load fixtures themselves (tests use repository helpers under `test/helpers/` — those helpers are **not** portable public runtime APIs).

## Levels

| Level | Name | Typical expectation |
|-------|------|---------------------|
| **L1** | Structural | JSON Schema / structural validation |
| **L2** | Semantic | Document integrity and reference rules |
| **L3** | Serialization | Portable round-trip (`roundTripJsonEquals`) |
| **L4** | Behavioral | Closed operation / category registry |

## Pass / fail / skip

| Status | Meaning |
|--------|---------|
| `pass` | Actual matches expectation |
| `fail` | Mismatch (or unexpected error) |
| `skip` | Explicit only: `skip: true` (optional `skipReason`) |

Suite `ok` is true when there are **zero fails**. Skips do not fail the suite.

## Diagnostic oracle identity

Stable matching identity is the multiset of:

```
(ruleId, level, severity, path)
```

- **`message` is not** part of stable matching identity.
- Duplicate diagnostics count (multiset semantics).
- Order of expected diagnostics does not matter for matching.

## L3

L3 uses semantic JSON tree equality (`jsonEquals` / round-trip), not byte-identical serialization.

## L4

L4 expectations use a **closed** category registry (for example: `fact-qualification`, `current-truth`, `historical-change`, `contradiction`, `recommendation-assessment`, `recommendation-policy`, `temporal-projection`). Unknown categories throw.

Malformed levels / categories throw `TypeError` rather than silently skipping.

## Artifacts (repository)

| Path | Role |
|------|------|
| `fixtures/conformance/manifest.json` | Indexed L1–L4 fixture corpus |
| `fixtures/conformance/l4-expectations.json` | L4 behavioral oracle |
| `fixtures/conformance/l4-expectations.schema.json` | Oracle shape |

These fixtures are frozen for Phase 2. Known coverage debt (some rules unit-tested without an individual persisted manifest entry; historic “18 L2” vs frozen manifest **17** L2 cases) does **not** redefine conformance rules. Do not backfill fixtures casually.

## Minimal usage example

```ts
import {
  runConformanceCase,
  runConformanceSuite,
  type ConformanceCaseInput,
} from "../src/index.js";

const document = {
  specVersion: "0.1",
  organizationId: "org-1",
  entities: [{ id: "org-1", type: "Organization", name: "Org One" }],
};

const passCase: ConformanceCaseInput = {
  caseId: "demo-l1-valid",
  level: "L1",
  document,
  expectation: { kind: "validation", expectedValid: true },
};

const single = runConformanceCase(passCase);
// single.status === "pass"

const suite: ReturnType<typeof runConformanceSuite> = runConformanceSuite([
  passCase,
  {
    caseId: "demo-skip",
    level: "L2",
    skip: true,
    skipReason: "deferred example",
  },
]);
// suite.ok === true; suite.counts.skip === 1
```

## Related

- [API Overview](api-overview.md)
- [TypeScript Quickstart](typescript-quickstart.md)
- [Northstar Evaluation](northstar-evaluation.md) — scenario evaluation, **not** L1–L4 conformance
- Normative: [Conformance Model](../specification/conformance.md)
