import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Assertion, BusinessContextDocument, Conflict } from "../src/model.js";
import {
  assessRecommendation,
  buildRecommendationSupportGraph,
  evaluateContradictionPreconditions,
  isAssertionActiveAt,
  isFactQualified,
  projectBusinessContext,
  selectCurrentFactAssertions,
} from "../src/index.js";
import { validateBusinessContext } from "../src/validate.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadNorthstar(): BusinessContextDocument {
  const raw = JSON.parse(
    readFileSync(join(repoRoot, "fixtures/northstar-manufacturing.json"), "utf8"),
  ) as unknown;
  const result = validateBusinessContext(raw);
  expect(result.valid).toBe(true);
  if (!result.valid) {
    throw new Error("Northstar must remain L1+L2 valid");
  }
  return result.document;
}

function assertionById(doc: BusinessContextDocument, id: string): Assertion {
  const found = (doc.assertions ?? []).find((a) => a.id === id);
  if (found === undefined) {
    throw new Error(`Missing assertion ${id}`);
  }
  return found;
}

describe("Northstar spot checks (EVI-2.3 regression — not Q1–Q14 harness)", () => {
  it("41–43. Northstar remains L1+L2 PASS", () => {
    loadNorthstar();
  });

  it("Q11 intent — Q2 revenue active, Q1 revenue inactive at asOf", () => {
    const doc = loadNorthstar();
    const asOf = "2026-06-30T00:00:00Z";
    expect(isAssertionActiveAt(assertionById(doc, "asrt-product-b-revenue-q2-2026"), asOf)).toBe(
      true,
    );
    expect(isAssertionActiveAt(assertionById(doc, "asrt-product-b-revenue-q1-2026"), asOf)).toBe(
      false,
    );
  });

  it("Q7/Q12 intent — superseded preliminary not Fact; corrected margin is current Fact", () => {
    const doc = loadNorthstar();
    const asOf = "2026-06-30T00:00:00Z";
    const preliminary = assertionById(doc, "asrt-product-b-margin-preliminary");
    const corrected = assertionById(doc, "asrt-product-b-margin");
    expect(isFactQualified(preliminary)).toBe(false);
    expect(isFactQualified(corrected)).toBe(true);
    const facts = selectCurrentFactAssertions(doc, asOf);
    const ids = facts.map((a) => a.id);
    expect(ids).toContain("asrt-product-b-margin");
    expect(ids).not.toContain("asrt-product-b-margin-preliminary");
  });

  it("Q6 intent — unresolved conflict remains; does not invent winner on Facts", () => {
    const doc = loadNorthstar();
    const conflict = (doc.conflicts ?? []).find(
      (c) => c.id === "conflict-supplier-capacity-status",
    ) as Conflict;
    expect(conflict).toBeDefined();
    expect(conflict.status).toBe("unresolved");
    const result = evaluateContradictionPreconditions(doc, conflict);
    expect(result.contradictionPreconditionsMetExceptValue).toBe(true);
    expect(result.valueIncompatibilityEvaluated).toBe(false);

    const facts = selectCurrentFactAssertions(doc, "2026-06-30T00:00:00Z");
    const ids = facts.map((a) => a.id);
    expect(ids).toContain("asrt-supplier-capacity-constrained");
    expect(ids).not.toContain("asrt-supplier-capacity-normal");
    expect(isFactQualified(assertionById(doc, "asrt-supplier-capacity-normal"))).toBe(false);
  });
});

describe("Northstar spot checks (EVI-2.4 — not Q1–Q14 harness)", () => {
  const asOf = "2026-06-30T00:00:00Z";

  const northstarProjectionRequest = {
    objective: "Evaluate whether Product B direct-sales acquisition investment should increase",
    entityIds: [
      "product-b",
      "channel-direct-sales",
      "process-fulfilment",
      "constraint-supplier-capacity",
      "goal-grow-product-b-revenue",
      "metric-product-b-revenue",
      "metric-delivery-complaint-rate",
    ],
    relationTraversal: { maxDepth: 2 },
    asOf,
    includeConflicts: true,
    sizeLimit: { maxItems: 200 },
  } as const;

  it("N-01 canonical asOf projection retains expected active Assertions", () => {
    const doc = loadNorthstar();
    const result = projectBusinessContext(doc, northstarProjectionRequest);
    const ids = (result.assertions ?? []).map((a) => a.id);
    expect(ids).toContain("asrt-product-b-revenue-q2-2026");
    expect(ids).toContain("asrt-delivery-complaint-rate-q2-2026");
    expect(ids).toContain("asrt-product-b-margin");
    expect(ids).toContain("asrt-supplier-capacity-constrained");
    expect(ids).not.toContain("asrt-product-b-revenue-q1-2026");
  });

  it("N-02 preliminary superseded margin is not a current Fact", () => {
    const doc = loadNorthstar();
    expect(isFactQualified(assertionById(doc, "asrt-product-b-margin-preliminary"))).toBe(false);
    const facts = selectCurrentFactAssertions(doc, asOf);
    expect(facts.map((a) => a.id)).not.toContain("asrt-product-b-margin-preliminary");
  });

  it("N-03 corrected replacement remains current Fact when qualified", () => {
    const doc = loadNorthstar();
    expect(isFactQualified(assertionById(doc, "asrt-product-b-margin"))).toBe(true);
    expect(selectCurrentFactAssertions(doc, asOf).map((a) => a.id)).toContain(
      "asrt-product-b-margin",
    );
  });

  it("N-04 includeConflicts true exposes relevant unresolved supplier conflict", () => {
    const doc = loadNorthstar();
    const result = projectBusinessContext(doc, northstarProjectionRequest);
    expect((result.conflicts ?? []).map((c) => c.id)).toContain(
      "conflict-supplier-capacity-status",
    );
  });

  it("N-05 no conflict winner invented", () => {
    const doc = loadNorthstar();
    const result = projectBusinessContext(doc, northstarProjectionRequest);
    const ids = (result.assertions ?? []).map((a) => a.id);
    expect(ids).toContain("asrt-supplier-capacity-constrained");
    expect(ids).toContain("asrt-supplier-capacity-normal");
  });

  it("N-06 recommendation support graph reaches expected Inferences", () => {
    const doc = loadNorthstar();
    const result = buildRecommendationSupportGraph(doc, "rec-defer-product-b-acquisition-spend");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.inferences.map((i) => i.id)).toEqual([
      "inference-acquisition-amplifies-delivery-risk",
      "inference-product-b-growth-opportunity-post-constraint",
    ]);
  });

  it("N-07 support graph reaches Signals / Assertions / Evidence", () => {
    const doc = loadNorthstar();
    const result = buildRecommendationSupportGraph(doc, "rec-defer-product-b-acquisition-spend");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.signals.map((s) => s.id)).toContain("signal-supplier-constraint-active");
    expect(result.assertions.map((a) => a.id)).toContain("asrt-supplier-capacity-constrained");
    expect(result.evidence.map((e) => e.id)).toContain("ev-ops-supplier-bottleneck");
  });

  it("N-08 Source reachability remains through original document", () => {
    const doc = loadNorthstar();
    const result = buildRecommendationSupportGraph(doc, "rec-defer-product-b-acquisition-spend");
    expect(result.found).toBe(true);
    if (!result.found) return;
    for (const ev of result.evidence) {
      expect((doc.sources ?? []).some((s) => s.id === ev.sourceId)).toBe(true);
    }
  });

  it("N-09 hard Constraint entity is recognized via enforcement convention", () => {
    const doc = loadNorthstar();
    const constraint = (doc.entities ?? []).find((e) => e.id === "constraint-supplier-capacity");
    expect(constraint?.type).toBe("Constraint");
    expect(constraint?.properties?.enforcement).toBe("hard");
  });

  it("N-10 caller evaluation for rec-increase hard violation deterministically derives rejected", () => {
    const doc = loadNorthstar();
    const result = assessRecommendation(doc, "rec-increase-product-b-acquisition-spend", {
      constraintEvaluations: [{ constraintId: "constraint-supplier-capacity", violated: true }],
    });
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.derivedStatus).toBe("rejected");
    expect(
      result.evaluatedChecks.some(
        (c) => c.check === "constraint-compliance" && c.outcome === "fail",
      ),
    ).toBe(true);
  });

  it("N-11 rec-defer non-violation does NOT cause core to invent supported", () => {
    const doc = loadNorthstar();
    const result = assessRecommendation(doc, "rec-defer-product-b-acquisition-spend", {
      constraintEvaluations: [{ constraintId: "constraint-supplier-capacity", violated: false }],
    });
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.derivedStatus).toBeUndefined();
    expect(result.derivedStatus).not.toBe("supported");
  });

  it("N-12 persisted Northstar assessments remain unchanged; core does not mutate them", () => {
    const doc = loadNorthstar();
    const before = structuredClone(doc.recommendations);
    assessRecommendation(doc, "rec-increase-product-b-acquisition-spend", {
      constraintEvaluations: [{ constraintId: "constraint-supplier-capacity", violated: true }],
    });
    assessRecommendation(doc, "rec-defer-product-b-acquisition-spend", {
      constraintEvaluations: [{ constraintId: "constraint-supplier-capacity", violated: false }],
    });
    expect(doc.recommendations).toEqual(before);
  });
});
