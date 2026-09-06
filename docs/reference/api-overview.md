# Public API Overview

Concise, task-oriented map of the existing `@evidensiq/core` public surface.

This is **not** generated API documentation. It does **not** add exports.

**Package:** `@evidensiq/core@0.1.0` (current public stable baseline; Phase 3 Portable Context Consumption under development).

Normative rules: [Business Context Specification](../specification/business-context-spec.md), [Conformance](../specification/conformance.md).

---

## model / types

**Purpose:** Portable TypeScript types for Business Context documents and related objects.

**Key types:** `BusinessContextDocument`, `Entity`, `Relation`, `Source`, `Evidence`, `Assertion`, `Signal`, `Inference`, `Recommendation`, `Conflict`, `Metadata`, assessment/provenance types.

**Caveat:** **Fact is not a persisted wire type.** Fact is a semantic classification over validated Assertions (`selectCurrentFactAssertions` / `isFactQualified`).

**Spec:** [Terminology](../specification/terminology.md), [Business Context Spec](../specification/business-context-spec.md).

---

## constants

**Purpose:** Stable identifiers and closed vocabularies used by the reference.

**Key exports:** `SPEC_VERSION`, `CORE_RELATION_TYPES`, `KNOWN_ENTITY_TYPES`, `DEFAULT_FACT_POLICY_ID`, `DEFAULT_RECOMMENDATION_POLICY_ID`.

---

## parsing / serialization

**Purpose:** JSON syntax boundary and JSON-safe tree helpers.

**Key exports:** `parseJson`, `serializeJson`, `isJsonValue`, `jsonEquals`; types `JsonValue`, `JsonObject`, `JsonParseResult`, …

**Caveat:** `parseJson` success means syntax + JSON-safe shape only. It does **not** prove L1/L2/L3/L4 validity.

**Spec:** Serialization / L3 rules in [Conformance](../specification/conformance.md).

---

## validation

**Purpose:** Structural (L1) and semantic (L2) validation.

**Key exports:** `validateBusinessContext`, `validateL1`, `validateL2`; types `Diagnostic`, `BusinessContextValidationResult`, …

**Caveat:** Combined validation runs L1 then L2; structure-dependent L2 is skipped when L1 fails. Diagnostics include human `message` text that is not a stable oracle identity.

**Spec:** L1/L2 in [Conformance](../specification/conformance.md).

---

## temporal semantics

**Purpose:** Explicit valid-time activity and interval overlap.

**Key exports:** `isAssertionActiveAt`, `validityIntervalsOverlap`; type `ValidityBounds`.

**Caveat:** Callers must supply explicit instants — no `Date.now` / implicit clock in the core.

**Spec:** Temporal validity in the Business Context Spec.

---

## Fact / current truth

**Purpose:** Fact qualification and current-Fact selection at an explicit `asOf`.

**Key exports:** `isFactQualified`, `selectCurrentFactAssertions`.

**Caveat:** Returns Fact-qualified Assertions active at `asOf` in document order. No winner selection, conflict filtering, or preferredAssertionId policy. Document is assumed L1+L2-valid (caller responsibility).

**Spec:** Fact model in the Business Context Spec / Terminology.

---

## conflict semantics

**Purpose:** Evaluate mechanically decidable preconditions of an **existing** explicit `Conflict`.

**Key exports:** `evaluateContradictionPreconditions`; type `ContradictionPreconditionResult`.

**Caveats:**

- Does **not** infer universal value incompatibility (`valueIncompatibilityEvaluated` is always `false`).
- No automatic conflict discovery.
- For contradiction with >2 assertions, temporal precondition uses non-empty common intersection of validity intervals — this is **TypeScript reference implementation behavior / reference interpretation** under frozen overlap semantics, **not** a newly normative Phase 1 rule.

**Spec:** Conflict representation in the Business Context Spec.

---

## projection

**Purpose:** Deterministic context projection for a request, including Evidence → Source provenance closure.

**Key exports:** `projectBusinessContext`; types `ProjectionOptions`, projection request/result model types (`BusinessContextProjectionResult.sources` when Evidence qualifies).

**Caveats:**

- Reference projection behavior must not be confused with universal domain ranking, normative truncation precedence, or ordering policy where Phase 1 left gaps.
- Reserved request fields (`objective`, `domains`, `evidencePolicy`, `ordering`, `sizeLimit`) remain non-operative.
- Context Query and Fact consumption are documented compositions of existing primitives — not a query DSL or Fact-only projection mode.
- Current public stable baseline remains `@evidensiq/core@0.1.0` while Phase 3 (Portable Context Consumption) develops.

**Spec:** Context projection contract in the Business Context Spec; policy gaps in [Evaluation](../specification/evaluation.md).

---

## recommendation

**Purpose:** Bounded recommendation assessment and support-graph construction.

**Key exports:** `assessRecommendation`, `buildRecommendationSupportGraph`; related assessment option/result types.

**Caveats:**

- Assessment is **bounded**.
- Absence of a hard violation does **not** imply `supported`.
- Scenario constraint inputs used by Northstar (Q9/Q10) are test/reference metadata, not Business Context wire data.

**Spec:** Recommendation assessment in the Business Context Spec / Evaluation model.

---

## conformance

**Purpose:** Portable in-memory L1–L4 conformance case and suite runner.

**Key exports:** `runConformanceCase`, `runConformanceSuite`; case/suite input and result types.

**Caveats:**

- No `fs` / `path` in public core — callers supply in-memory documents and expectations.
- Repository test loaders under `test/helpers/` are **not** portable public runtime APIs.
- **Northstar harness is not public package API.**

**Guide:** [Conformance Runner](conformance-runner.md). **Spec:** [Conformance](../specification/conformance.md).

---

## Explicit non-exports

The following are repository tooling only and are **not** part of the published public surface:

- Northstar evaluation harness (`test/helpers/northstar-evaluation-harness.ts`, `examples/northstar-evaluation.ts`)
- Conformance fixture loaders (`test/helpers/conformance-harness.ts`)
- Any filesystem-based suite discovery

Do not invent missing APIs. If documentation appears to require an export that does not exist, stop and escalate to Product Owner.
