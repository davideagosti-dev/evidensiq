# Northstar Evaluation — Developer Reference (EVI-2.6)

Non-normative developer guide for the Phase 2 TypeScript reference evaluation of the frozen Northstar Manufacturing scenario.

This document does **not** change Phase 1 specification semantics.

## What it demonstrates

The harness proves that structured Business Context plus existing `@evidensiq/core` semantics can reproduce the canonical Northstar business reasoning chain for **Q1–Q14**:

- assertions, evidence, provenance
- Fact / supersession
- temporal activity
- explicit conflicts
- signals, inferences, constraints
- recommendation state
- bounded recommendation assessment
- projection
- support-graph traceability to evidence and sources

**Without** LLM, prompts, RAG, embeddings, semantic similarity, a generic business-rule engine, hidden ontology, or executable fixture expressions.

Core thesis: **business context should be infrastructure, not prompt text.**

## How to run

From the repository root:

```bash
npm ci
npm test -- test/northstar-evaluation.test.ts
```

Developer demonstration (same harness logic):

```bash
npx --yes tsx examples/northstar-evaluation.ts
```

Expected structured outcome: **14 PASS / 0 FAIL / 0 SKIP**.

Canonical evaluation time: `2026-06-30T00:00:00Z` (no system clock).

## Frozen Phase 1 inputs

| Artifact | Role |
|----------|------|
| `fixtures/northstar-manufacturing.json` | Canonical scenario |
| `fixtures/evaluation/northstar-expectations.json` | Q1–Q14 oracle (`expectationVersion` 0.1) |
| `docs/specification/evaluation.md` | Evaluation model (normative Phase 1 text) |

Do not modify these to make tests pass.

## Evaluation ≠ conformance

| | Conformance (L1–L4) | Northstar evaluation (Q1–Q14) |
|--|---------------------|-------------------------------|
| Purpose | Implementation correctness vs normative rules | Scenario expected outcomes + traceability |
| Oracle | Conformance manifest / L4 expectations | `northstar-expectations.json` |
| Runner | Public `runConformanceCase` / suite | Test/reference harness only |

Q1–Q14 are **not** merged into the L1–L4 conformance architecture.

## Important boundaries

- **No public API expansion** — harness lives under `test/helpers/` and `examples/`; nothing new is exported from `@evidensiq/core`.
- **Scenario constraint oracle (Q9/Q10)** — `{ constraintId: "constraint-supplier-capacity", violated: true }` is test/reference metadata supplied to `assessRecommendation`. It is not Business Context wire data and is not inferred from prose.
- **Persisted vs runtime assessment** — fixture assessment may record `evidence-threshold` / `freshness-policy` as pass; bounded runtime assessment intentionally leaves those **not-evaluable**. Do not invent policy to reconcile them.
- **Q3 formula string** — declarative metadata only. Trusted harness arithmetic computes `(q2 - q1) / q1`. Never `eval` / parse / interpret the formula.
- **Q8** — verifies persisted `supported` only; does not universally derive `supported` via `assessRecommendation`.
- **Q14** — containment oracle (`expected ⊆ actual`); Sources resolved via `Evidence.sourceId → Source.id`.
- **No network / LLM** required.

## Traceability path

Recommendation → Inferences → Signals / validated Assertions → Evidence → Source (`sourceId` join).

## Artifacts

| Path | Role |
|------|------|
| `test/helpers/northstar-evaluation-harness.ts` | Closed Q1–Q14 dispatcher + suite aggregation |
| `test/northstar-evaluation.test.ts` | Architectural proof tests |
| `examples/northstar-evaluation.ts` | Developer-facing structured demo |

Human prose in the example is explanatory only. Correctness derives from structured results.
