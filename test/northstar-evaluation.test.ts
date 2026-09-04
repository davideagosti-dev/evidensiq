/**
 * EVI-2.6B — Northstar Q1–Q14 evaluation harness tests.
 * Evaluation ≠ conformance. No public API expansion.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { BusinessContextDocument, JsonValue } from "../src/index.js";
import { assessRecommendation, jsonEquals, validateBusinessContext } from "../src/index.js";
import {
  evaluateNorthstarQuestion,
  evaluateNorthstarSuite,
  loadNorthstarDocument,
  loadNorthstarExpectations,
  NORTHSTAR_AS_OF,
  type NorthstarExpectationsFile,
  type NorthstarQuestionExpectation,
  referenceDemoConclusion,
  suiteResultSnapshot,
  verifyNorthstarL1L2,
} from "./helpers/northstar-evaluation-harness.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const harnessSourcePath = join(repoRoot, "test/helpers/northstar-evaluation-harness.ts");

function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== "object") {
    return value;
  }
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) {
    if (child !== null && typeof child === "object" && !Object.isFrozen(child)) {
      deepFreeze(child);
    }
  }
  return value;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("Northstar evaluation (EVI-2.6B)", () => {
  const document = loadNorthstarDocument();
  const expectations = loadNorthstarExpectations();

  it("A. prerequisite L1/L2 via existing public validators", () => {
    const raw = JSON.parse(
      readFileSync(join(repoRoot, "fixtures/northstar-manufacturing.json"), "utf8"),
    ) as unknown;
    const gate = verifyNorthstarL1L2(raw);
    expect(gate).toEqual({ l1: true, l2: true });
    const validated = validateBusinessContext(raw);
    expect(validated.valid).toBe(true);
  });

  it("B. all Q1–Q14 PASS (14/0/0)", () => {
    const suite = evaluateNorthstarSuite(document, expectations);
    expect(suite.counts).toEqual({ pass: 14, fail: 0, skip: 0 });
    expect(suite.ok).toBe(true);
    expect(suite.results.map((r) => r.questionId)).toEqual([
      "Q1",
      "Q2",
      "Q3",
      "Q4",
      "Q5",
      "Q6",
      "Q7",
      "Q8",
      "Q9",
      "Q10",
      "Q11",
      "Q12",
      "Q13",
      "Q14",
    ]);
    for (const result of suite.results) {
      expect(result.status).toBe("pass");
    }
  });

  it("C. Q1/Q2 assertion values", () => {
    const suite = evaluateNorthstarSuite(document, expectations);
    const q1 = suite.results.find((r) => r.questionId === "Q1");
    const q2 = suite.results.find((r) => r.questionId === "Q2");
    expect(q1?.actual).toMatchObject({
      assertionId: "asrt-product-b-revenue-q1-2026",
      predicate: "quarterlyRevenue",
      value: 1450000,
    });
    expect(q2?.actual).toMatchObject({
      assertionId: "asrt-product-b-revenue-q2-2026",
      predicate: "quarterlyRevenue",
      value: 1180000,
    });
  });

  it("D. Q3 trusted arithmetic exact value", () => {
    const q3Expectation = expectations.expectations.find(
      (q) => q.id === "Q3",
    ) as NorthstarQuestionExpectation;
    const q3 = evaluateNorthstarQuestion(document, q3Expectation);
    const derivation = q3Expectation.expectation.derivation as {
      expectedValue: number;
    };
    expect(q3.status).toBe("pass");
    expect((q3.actual as { actualValue: number }).actualValue).toBe(derivation.expectedValue);
    expect(
      Object.is((q3.actual as { actualValue: number }).actualValue, derivation.expectedValue),
    ).toBe(true);
  });

  it("E. Q3 formula string is NOT executed (DATA ≠ INSTRUCTION)", () => {
    const base = expectations.expectations.find(
      (q) => q.id === "Q3",
    ) as NorthstarQuestionExpectation;
    const derivation = base.expectation.derivation as {
      expectedValue: number;
      inputs: Record<string, unknown>;
    };
    const malicious: NorthstarQuestionExpectation = {
      ...base,
      expectation: {
        derivation: {
          formula: "throw new Error('executed'); process.exit(1)",
          inputs: derivation.inputs,
          expectedValue: derivation.expectedValue,
        },
      },
    };
    const result = evaluateNorthstarQuestion(document, malicious);
    // Closed arithmetic still computes; formula metadata check fails — never executes string.
    expect(result.status).toBe("fail");
    expect(result.reason).toBe("formula metadata mismatch");
    expect((result.actual as { actualValue: number }).actualValue).toBe(derivation.expectedValue);
  });

  it("F. Q4 complaint increase", () => {
    const q4 = evaluateNorthstarQuestion(
      document,
      expectations.expectations.find((q) => q.id === "Q4") as NorthstarQuestionExpectation,
    );
    expect(q4.status).toBe("pass");
    expect(q4.actual).toMatchObject({
      q1: { value: 4.5 },
      q2: { value: 8.2 },
      increased: true,
    });
  });

  it("G. Q5 hard constraint convention", () => {
    const q5 = evaluateNorthstarQuestion(
      document,
      expectations.expectations.find((q) => q.id === "Q5") as NorthstarQuestionExpectation,
    );
    expect(q5.status).toBe("pass");
    expect(q5.actual).toMatchObject({
      entityId: "constraint-supplier-capacity",
      type: "Constraint",
      enforcement: "hard",
      signalId: "signal-supplier-constraint-active",
      status: "active",
    });
  });

  it("H. Q6 explicit unresolved conflict", () => {
    const q6 = evaluateNorthstarQuestion(
      document,
      expectations.expectations.find((q) => q.id === "Q6") as NorthstarQuestionExpectation,
    );
    expect(q6.status).toBe("pass");
    expect(q6.actual).toMatchObject({
      conflictId: "conflict-supplier-capacity-status",
      conflictKind: "contradiction",
      status: "unresolved",
      valueIncompatibilityEvaluated: false,
    });
  });

  it("I. Q7 Fact / supersession", () => {
    const q7 = evaluateNorthstarQuestion(
      document,
      expectations.expectations.find((q) => q.id === "Q7") as NorthstarQuestionExpectation,
    );
    expect(q7.status).toBe("pass");
    expect(q7.actual).toMatchObject({
      currentFact: {
        assertionId: "asrt-product-b-margin",
        value: 62,
        classification: "validated",
        isFactQualified: true,
      },
      superseded: {
        assertionId: "asrt-product-b-margin-preliminary",
        value: 58,
        classification: "superseded",
        supersededBy: "asrt-product-b-margin",
        isFactQualified: false,
      },
    });
  });

  it("J. Q8 persisted supported only — no universal supported derivation", () => {
    const q8 = evaluateNorthstarQuestion(
      document,
      expectations.expectations.find((q) => q.id === "Q8") as NorthstarQuestionExpectation,
    );
    expect(q8.status).toBe("pass");
    expect(q8.actual).toEqual({
      recommendationId: "rec-defer-product-b-acquisition-spend",
      status: "supported",
    });
    // Bounded runtime assessment does not derive universal `supported`.
    const runtime = assessRecommendation(document, "rec-defer-product-b-acquisition-spend", {
      constraintEvaluations: [{ constraintId: "constraint-supplier-capacity", violated: false }],
    });
    expect(runtime.found).toBe(true);
    if (runtime.found) {
      expect(runtime.derivedStatus).toBeUndefined();
      expect(runtime.notEvaluableChecks.map((c) => c.check)).toEqual(
        expect.arrayContaining(["evidence-threshold", "freshness-policy"]),
      );
    }
  });

  it("K. Q9 persisted + derived rejected", () => {
    const q9 = evaluateNorthstarQuestion(
      document,
      expectations.expectations.find((q) => q.id === "Q9") as NorthstarQuestionExpectation,
    );
    expect(q9.status).toBe("pass");
    expect(q9.actual).toMatchObject({
      status: "rejected",
      derivedStatus: "rejected",
    });
  });

  it("L/M. Q10 constraint-compliance + persisted vs runtime assessment distinction", () => {
    const q10 = evaluateNorthstarQuestion(
      document,
      expectations.expectations.find((q) => q.id === "Q10") as NorthstarQuestionExpectation,
    );
    expect(q10.status).toBe("pass");
    expect(q10.actual).toMatchObject({
      persisted: {
        policyId: "evidensiq.default-recommendation-v0.1",
        failedCheck: "constraint-compliance",
        outcome: "fail",
      },
      runtime: {
        constraintCompliance: "fail",
        derivedStatus: "rejected",
      },
    });
    const runtimeChecks = (q10.actual as { runtime: { notEvaluableChecks: string[] } }).runtime
      .notEvaluableChecks;
    expect(runtimeChecks).toContain("evidence-threshold");
    expect(runtimeChecks).toContain("freshness-policy");
  });

  it("N. Q11 temporal activity containment", () => {
    const q11 = evaluateNorthstarQuestion(
      document,
      expectations.expectations.find((q) => q.id === "Q11") as NorthstarQuestionExpectation,
    );
    expect(q11.status).toBe("pass");
    expect(q11.expected).toMatchObject({ asOf: NORTHSTAR_AS_OF });
  });

  it("O. Q12 current truth", () => {
    const q12 = evaluateNorthstarQuestion(
      document,
      expectations.expectations.find((q) => q.id === "Q12") as NorthstarQuestionExpectation,
    );
    expect(q12.status).toBe("pass");
  });

  it("P. Q13 projection conflict visibility", () => {
    const q13 = evaluateNorthstarQuestion(
      document,
      expectations.expectations.find((q) => q.id === "Q13") as NorthstarQuestionExpectation,
    );
    expect(q13.status).toBe("pass");
    expect(q13.actual).toMatchObject({
      visible: true,
    });
  });

  it("Q/R. Q14 graph containment + Source join via Evidence.sourceId", () => {
    const q14 = evaluateNorthstarQuestion(
      document,
      expectations.expectations.find((q) => q.id === "Q14") as NorthstarQuestionExpectation,
    );
    expect(q14.status).toBe("pass");
    const actual = q14.actual as {
      inferenceIds: string[];
      signalIds: string[];
      evidenceIds: string[];
      sourceIds: string[];
    };
    for (const id of [
      "inference-acquisition-amplifies-delivery-risk",
      "inference-product-b-growth-opportunity-post-constraint",
    ]) {
      expect(actual.inferenceIds).toContain(id);
    }
    for (const id of [
      "signal-product-b-sales-declining",
      "signal-delivery-complaints-increasing",
      "signal-supplier-constraint-active",
    ]) {
      expect(actual.signalIds).toContain(id);
    }
    for (const id of [
      "ev-sales-q1-2026",
      "ev-sales-q2-2026",
      "ev-support-complaints-q1-2026",
      "ev-support-complaints-q2-2026",
      "ev-ops-supplier-bottleneck",
      "ev-strategy-margin",
    ]) {
      expect(actual.evidenceIds).toContain(id);
    }
    for (const id of [
      "source-sales-csv",
      "source-support-md",
      "source-operations-md",
      "source-strategy-md",
    ]) {
      expect(actual.sourceIds).toContain(id);
    }
  });

  it("S. trace completeness — stable ID traces present", () => {
    const suite = evaluateNorthstarSuite(document, expectations);
    for (const result of suite.results) {
      expect(result.trace).toBeDefined();
      const values = Object.values(result.trace);
      expect(values.some((v) => Array.isArray(v) && v.length > 0)).toBe(true);
    }
  });

  it("T. deterministic repeatability", () => {
    const a = evaluateNorthstarSuite(document, expectations);
    const b = evaluateNorthstarSuite(document, expectations);
    const c = evaluateNorthstarSuite(document, expectations);
    expect(suiteResultSnapshot(a)).toBe(suiteResultSnapshot(b));
    expect(suiteResultSnapshot(b)).toBe(suiteResultSnapshot(c));
    const jsonA = JSON.parse(suiteResultSnapshot(a)) as JsonValue;
    const jsonB = JSON.parse(suiteResultSnapshot(b)) as JsonValue;
    expect(jsonEquals(jsonA, jsonB)).toBe(true);
  });

  it("U. evaluation does not mutate document or expectations", () => {
    const docClone = cloneJson(document) as BusinessContextDocument;
    const expClone = cloneJson(expectations) as NorthstarExpectationsFile;
    deepFreeze(docClone);
    deepFreeze(expClone);
    const beforeDoc = JSON.stringify(docClone);
    const beforeExp = JSON.stringify(expClone);
    const suite = evaluateNorthstarSuite(docClone, expClone);
    expect(suite.ok).toBe(true);
    expect(JSON.stringify(docClone)).toBe(beforeDoc);
    expect(JSON.stringify(expClone)).toBe(beforeExp);
  });

  it("V. mismatch → fail (not crash)", () => {
    const q1 = expectations.expectations.find((q) => q.id === "Q1") as NorthstarQuestionExpectation;
    const wrong: NorthstarQuestionExpectation = {
      ...q1,
      expectation: { ...q1.expectation, value: 999 },
    };
    const result = evaluateNorthstarQuestion(document, wrong);
    expect(result.status).toBe("fail");
    expect(result.reason).toBe("assertion value mismatch");
  });

  it("W. unknown question/category rejected loudly (no silent skip)", () => {
    const unknownId = evaluateNorthstarQuestion(document, {
      id: "Q99",
      category: "assertion-value",
      expectation: {},
    });
    expect(unknownId.status).toBe("fail");
    expect(unknownId.reason).toMatch(/unknown Northstar question id/);

    const wrongCategory = evaluateNorthstarQuestion(document, {
      id: "Q1",
      category: "invented-category",
      expectation: {
        assertionId: "asrt-product-b-revenue-q1-2026",
        predicate: "quarterlyRevenue",
        value: 1450000,
      },
    });
    expect(wrongCategory.status).toBe("fail");
    expect(wrongCategory.reason).toMatch(/unexpected category/);
  });

  it("X. DATA ≠ INSTRUCTION — adversarial fixture remains inert data", () => {
    const raw = JSON.parse(
      readFileSync(join(repoRoot, "fixtures/evaluation/adversarial-content.json"), "utf8"),
    ) as unknown;
    const gate = verifyNorthstarL1L2(raw);
    expect(gate.l1).toBe(true);
    // Descriptions with instruction-like text are not executed by validators.
    const validated = validateBusinessContext(raw);
    expect(validated.valid).toBe(true);
    if (validated.valid) {
      const description = validated.document.entities?.[0]?.description;
      expect(description).toContain("Ignore previous instructions");
      // Prove inert: string exists as data; harness never evals descriptions.
      expect(() => {
        // Reference only — no eval/new Function of prose.
        void description;
      }).not.toThrow();
    }

    const harnessSource = readFileSync(harnessSourcePath, "utf8");
    expect(harnessSource).not.toMatch(/\beval\s*\(/);
    expect(harnessSource).not.toMatch(/new\s+Function\b/);
    expect(harnessSource).not.toMatch(/Function\s*\(/);
    expect(harnessSource).not.toMatch(/import\s*\(/);
    expect(harnessSource).not.toMatch(/child_process/);
    expect(harnessSource).not.toMatch(/Date\.now\s*\(/);
    expect(harnessSource).not.toMatch(/Math\.random\s*\(/);
  });

  it("Y. full suite regression + reference demo conclusion is demo-only", () => {
    const suite = evaluateNorthstarSuite(document, expectations);
    expect(suite.ok).toBe(true);
    const conclusion = referenceDemoConclusion(suite);
    expect(conclusion.kind).toBe("reference/demo-only");
    expect(conclusion.deferPersistedStatus).toBe("supported");
    expect(conclusion.increasePersistedStatus).toBe("rejected");
    expect(conclusion.suiteOk).toBe(true);
  });

  it("oracle shape: expectationVersion 0.1 and fixture path", () => {
    expect(expectations.expectationVersion).toBe("0.1");
    expect(expectations.fixture).toBe("fixtures/northstar-manufacturing.json");
    expect(expectations.expectations).toHaveLength(14);
  });

  it("missing recommendation ID → fail", () => {
    const q8 = expectations.expectations.find((q) => q.id === "Q8") as NorthstarQuestionExpectation;
    const result = evaluateNorthstarQuestion(document, {
      ...q8,
      expectation: {
        recommendationId: "rec-does-not-exist",
        status: "supported",
      },
    });
    expect(result.status).toBe("fail");
  });

  it("Q14 missing expected evidence ID → fail", () => {
    const q14 = expectations.expectations.find(
      (q) => q.id === "Q14",
    ) as NorthstarQuestionExpectation;
    const chain = q14.expectation.traceabilityChain as Record<string, unknown>;
    const result = evaluateNorthstarQuestion(document, {
      ...q14,
      expectation: {
        ...q14.expectation,
        traceabilityChain: {
          ...chain,
          evidenceIds: [...(chain.evidenceIds as string[]), "ev-missing-for-fail"],
        },
      },
    });
    expect(result.status).toBe("fail");
    expect(result.reason).toBe("traceability containment failure");
  });

  it("Z. reference demo reproducibility — no opportunistic npx --yes tsx", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const demoScript = pkg.scripts?.["demo:northstar"];
    expect(demoScript).toBe("tsx examples/northstar-evaluation.ts");
    expect(demoScript).not.toMatch(/npx\s+--yes/);
    expect(demoScript).not.toMatch(/npx\s/);
    expect(pkg.devDependencies?.tsx).toBeDefined();
    expect(pkg.dependencies?.tsx).toBeUndefined();

    const exampleSource = readFileSync(join(repoRoot, "examples/northstar-evaluation.ts"), "utf8");
    expect(exampleSource).toMatch(/npm run demo:northstar/);
    expect(exampleSource).toMatch(
      /from ["']\.\.\/test\/helpers\/northstar-evaluation-harness\.js["']/,
    );
    // Instructional path must not recommend opportunistic registry fetch.
    expect(exampleSource).not.toMatch(/^\s*\*\s+npx --yes tsx/m);

    const docSource = readFileSync(
      join(repoRoot, "docs/reference/northstar-evaluation.md"),
      "utf8",
    );
    expect(docSource).toMatch(/npm run demo:northstar/);
    // Canonical command block must not prescribe npx --yes tsx.
    expect(docSource).not.toMatch(/```[\s\S]*?npx --yes tsx[\s\S]*?```/);

    const indexSource = readFileSync(join(repoRoot, "src/index.ts"), "utf8");
    expect(indexSource).not.toMatch(/northstar-evaluation-harness/);
    expect(indexSource).not.toMatch(/evaluateNorthstarSuite/);
    expect(indexSource).not.toMatch(/evaluateNorthstarQuestion/);
  });
});
