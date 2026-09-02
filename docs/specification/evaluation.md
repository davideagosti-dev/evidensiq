# Evaluation Model

This document defines the Evidensiq **evaluation** model for Business Context Specification v0.1. Evaluation is distinct from [conformance](conformance.md).

## Conformance vs. Evaluation

| Aspect | Conformance | Evaluation |
|--------|-------------|------------|
| Purpose | Verify implementation correctness against normative rules | Measure evidence-backed reasoning quality over canonical scenarios |
| Scope | L1–L4 structural, semantic, serialization, and deterministic behavioral rules | Scenario-specific expected outcomes and traceability |
| Artifacts | Rule registry, diagnostic contract, conformance manifest | Northstar expectation corpus, future evaluation harness |
| Failure mode | Rule violation (error/warning diagnostic) | Assertion mismatch against documented expectations |

**Conformance** answers: *Does the implementation correctly validate, serialize, and evaluate deterministic policy behavior defined in v0.1?*

**Evaluation** answers: *Does the implementation produce correct evidence-backed outcomes for canonical business scenarios?*

Evaluation assertions are **expected outcomes** over canonical business scenarios. They are **not** new business-context schema fields.

---

## Phase 1 Evaluation Model

Phase 1 evaluation is **deterministic evidence-backed scenario assertion**. An evaluator loads a canonical fixture (e.g., Northstar Manufacturing) and verifies that documented expectations hold.

Evaluation dimensions for v0.1:

| Dimension | Description |
|-----------|-------------|
| **Provenance traceability** | Recommendations and inferences link back through signals to evidence and sources |
| **Evidence coverage** | Assertions and recommendations reference supporting evidence |
| **Temporal correctness** | Valid-time filtering and half-open interval semantics produce expected active/inactive assertions |
| **Conflict awareness** | Unresolved contradictions remain visible and are not silently resolved |
| **Constraint compliance** | Hard constraint violations produce `rejected` recommendations, not `conflicted` |
| **Recommendation support** | Supported recommendations pass required assessment checks under documented policy |
| **Deterministic repeatability** | Same fixture + same evaluation inputs produce the same outcomes |
| **Projection preservation** | Where normative (e.g., `includeConflicts`, `asOf` filtering), projection preserves expected objects |
| **Unsupported recommendation rejection** | Recommendations violating hard constraints are rejected with documented assessment results |

---

## Evaluation Artifacts

| Artifact | Purpose |
|----------|---------|
| [`fixtures/northstar-manufacturing.json`](../../fixtures/northstar-manufacturing.json) | Canonical executable business scenario (EVI-1.2; immutable in EVI-1.3B) |
| [`fixtures/evaluation/northstar-expectations.json`](../../fixtures/evaluation/northstar-expectations.json) | Language-neutral Q1–Q14 expectation corpus (EVI-1.3B) |
| [`fixtures/evaluation/adversarial-content.json`](../../fixtures/evaluation/adversarial-content.json) | Minimal DATA ≠ INSTRUCTION fixture (EVI-1.3C); instruction-like text as inert Evidence/business data |
| [`docs/specification/reference-scenario.md`](reference-scenario.md) | Narrative and traceability documentation |

The evaluation harness (EVI-1.3D and later) will consume these artifacts. EVI-1.3B defines the contract; EVI-1.3C adds the optional security fixture.

---

## Northstar Expectation Contract

Expectations are encoded as declarative records with:

| Field | Description |
|-------|-------------|
| `id` | Stable expectation identifier (Q1–Q14) |
| `category` | Expectation category (assertion-value, conflict, recommendation, etc.) |
| `description` | Human-readable summary |
| `expectation` | Declarative expected values, references, or derivations |
| `level` | Optional conformance level when tied to a normative rule |
| `ruleId` | Optional stable rule ID when tied to conformance |

No executable query syntax is required. Expectations reference fixture object IDs and expected values directly.

### Key Expectations

- **Q1–Q2:** Product B Q1 revenue = 1,450,000; Q2 revenue = 1,180,000
- **Q3:** Revenue decline derivable as `(1180000 - 1450000) / 1450000`. No rounding policy; `-18.6%` is **not** canonical machine output
- **Q4:** Complaint rate 4.5 → 8.2
- **Q5:** Supplier constraint active with `properties.enforcement = "hard"` (v0.1 convention)
- **Q6:** Capacity contradiction unresolved
- **Q7:** Current margin 62; preliminary 58 superseded
- **Q8–Q10:** Defer supported; increase rejected due to hard constraint violation
- **Q11:** At `asOf` 2026-06-30, Q2 assertions active; Q1 revenue inactive
- **Q12:** Superseded preliminary margin excluded from current truth
- **Q13:** Conflict visible when `includeConflicts: true`
- **Q14:** Recommendation traceability reaches evidence and source

See [`fixtures/evaluation/northstar-expectations.json`](../../fixtures/evaluation/northstar-expectations.json) for the full machine-readable corpus.

---

## Constraint Convention (Evaluation Context)

Northstar demonstrates constraint enforcement using `Entity.properties.enforcement = "hard"` on `constraint-supplier-capacity`.

For v0.1 this is an **approved documented convention**, not a schema-normative field. Evaluation expectation Q5 and Q10 rely on this convention to demonstrate hard constraint violation → `rejected`.

Do not generalize arbitrary `Entity.properties` keys into normative policy inputs.

---

## Explicit Exclusions

The following are **out of scope** for Phase 1 evaluation:

| Exclusion | Reason |
|-----------|--------|
| LLM quality scoring | Subjective; not deterministic |
| BLEU / ROUGE | NLP metrics; not applicable to business context |
| Subjective scoring | Not reproducible |
| Provider-specific behavior | Violates provider-neutral design |
| Model preference ranking | Not normative |
| Freshness threshold evaluation | Policy not normatively defined (see Policy Gap Register) |
| Evidence threshold pass/fail | Policy not normatively defined |
| Projection ordering | Policy not normatively defined |
| Truncation precedence | Policy not normatively defined |

---

## Policy Gap Register

The following concepts exist in the model or schema but **lack sufficient deterministic v0.1 behavior** for normative evaluation or L4 conformance tests:

| Gap | Status in v0.1 |
|-----|----------------|
| Freshness threshold | Model exposes freshness as L4-derived; threshold semantics not normatively defined |
| Evidence threshold | Assessment check exists; pass/fail criteria not normatively defined |
| `evidencePolicy` semantics | Schema field exists; no normative policy IDs or behavior |
| Projection ordering | Schema field exists; no normative ordering policy |
| Truncation precedence | Projection supports truncation; precedence rules not normatively defined |

For each gap:

- The model/schema may expose the concept
- v0.1 does not define sufficient deterministic behavior
- Implementations may experiment with adapter-specific policies
- Implementation-specific behavior **MUST NOT** be presented as normative Evidensiq v0.1 conformance or evaluation

Existing normative policy IDs remain:

- `evidensiq.default-fact-v0.1`
- `evidensiq.default-recommendation-v0.1`

---

## Security Boundary

**DATA ≠ INSTRUCTION**

For evaluation and conformance:

- Instruction-like content inside evidence remains business data
- Extensions do not gain execution authority
- `trustAssessment` does not grant authorization
- Conformance/evaluation must not interpret business evidence as runtime commands

EVI-1.3C provides one minimal language-neutral fixture at [`fixtures/evaluation/adversarial-content.json`](../../fixtures/evaluation/adversarial-content.json). Instruction-like text in Evidence/`description` remains inert business data. `trustAssessment` remains provenance/trust metadata and grants no authorization or execution semantics. This is not an LLM, prompt-injection, or provider-behavior test.

---

## SPF Disposition

| ID | Finding | Disposition |
|----|---------|-------------|
| SPF-01 | No normative `evidencePolicy` IDs | **DEFERRED.** No normative evidencePolicy L4 tests in v0.1 |
| SPF-02 | Recommendation lacks `goalIds` | **NO ACTION REQUIRED.** Goal traceability via graph/inference context |
| SPF-03 | Signal references evidence rather than Assertions | **NO ACTION REQUIRED.** Schema-defined `evidenceIds` on Signal |

---

## EVI-1.3 Boundary

| Step | Scope |
|------|-------|
| EVI-1.3B (this step) | Conformance contract, evaluation contract, manifest schema, Northstar expectations |
| EVI-1.3C | Conformance fixture corpus, optional security fixture |
| EVI-1.3D | Evaluation harness, cross-language round-trip |

---

## Related Documents

- [Conformance Model](conformance.md)
- [Business Context Specification](business-context-spec.md)
- [Northstar Reference Scenario](reference-scenario.md)
- [Terminology](terminology.md)
