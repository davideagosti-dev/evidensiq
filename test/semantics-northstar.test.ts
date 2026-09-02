import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Assertion, BusinessContextDocument, Conflict } from "../src/model.js";
import {
  evaluateContradictionPreconditions,
  isAssertionActiveAt,
  isFactQualified,
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
