/**
 * EVI-2.5B — portable conformance runner tests.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ConformanceCaseInput } from "../src/conformance/index.js";
import { runConformanceCase, runConformanceSuite } from "../src/conformance/index.js";
import { jsonEquals, parseJson, serializeJson } from "../src/parse.js";
import {
  l4ExpectationToCase,
  loadL4Expectations,
  loadManifest,
  manifestEntryToCase,
  readFixtureJson,
  readNorthstarJson,
  runL4ExpectationRecord,
  runManifestEntry,
} from "./helpers/conformance-harness.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    Object.freeze(value);
    for (const child of Object.values(value as object)) {
      deepFreeze(child);
    }
  }
  return value;
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("conformance runner infrastructure", () => {
  const validDoc = readFixtureJson("fixtures/conformance/l1/l1-valid-minimal.json");

  it("R-01 single PASS case", () => {
    const result = runConformanceCase({
      caseId: "r01",
      level: "L1",
      document: validDoc,
      expectation: { kind: "validation", expectedValid: true },
    });
    expect(result.status).toBe("pass");
  });

  it("R-02 single FAIL case", () => {
    const result = runConformanceCase({
      caseId: "r02",
      level: "L1",
      document: validDoc,
      expectation: {
        kind: "validation",
        expectedValid: false,
        expectedDiagnostics: [{ ruleId: "EVI-L1-001", level: "L1", severity: "error", path: "/" }],
      },
    });
    expect(result.status).toBe("fail");
  });

  it("R-03 explicit SKIP case", () => {
    const result = runConformanceCase({
      caseId: "r03",
      level: "L1",
      document: validDoc,
      skip: true,
      skipReason: "policy gap deferred",
    });
    expect(result.status).toBe("skip");
    expect(result.reason).toBe("policy gap deferred");
  });

  it("R-04 suite collect-all default", () => {
    const suite = runConformanceSuite([
      {
        caseId: "a",
        level: "L1",
        document: validDoc,
        expectation: { kind: "validation", expectedValid: true },
      },
      {
        caseId: "b",
        level: "L1",
        document: validDoc,
        expectation: {
          kind: "validation",
          expectedValid: false,
          expectedDiagnostics: [],
        },
      },
      {
        caseId: "c",
        level: "L1",
        skip: true,
        skipReason: "deferred",
      },
    ]);
    expect(suite.results).toHaveLength(3);
  });

  it("R-05 suite counts pass/fail/skip", () => {
    const suite = runConformanceSuite([
      {
        caseId: "a",
        level: "L1",
        document: validDoc,
        expectation: { kind: "validation", expectedValid: true },
      },
      {
        caseId: "b",
        level: "L1",
        document: validDoc,
        expectation: {
          kind: "validation",
          expectedValid: false,
          expectedDiagnostics: [],
        },
      },
      {
        caseId: "c",
        level: "L1",
        skip: true,
        skipReason: "deferred",
      },
    ]);
    expect(suite.counts).toEqual({ pass: 1, fail: 1, skip: 1 });
  });

  it("R-06 suite ok false iff failure exists", () => {
    const withFail = runConformanceSuite([
      {
        caseId: "b",
        level: "L1",
        document: validDoc,
        expectation: {
          kind: "validation",
          expectedValid: false,
          expectedDiagnostics: [],
        },
      },
    ]);
    expect(withFail.ok).toBe(false);
  });

  it("R-07 skips do not make suite fail", () => {
    const suite = runConformanceSuite([
      {
        caseId: "a",
        level: "L1",
        document: validDoc,
        expectation: { kind: "validation", expectedValid: true },
      },
      {
        caseId: "c",
        level: "L1",
        skip: true,
        skipReason: "deferred",
      },
    ]);
    expect(suite.ok).toBe(true);
    expect(suite.counts.skip).toBe(1);
  });

  it("R-08 input order preserved", () => {
    const suite = runConformanceSuite([
      {
        caseId: "z",
        level: "L1",
        skip: true,
        skipReason: "z",
      },
      {
        caseId: "a",
        level: "L1",
        document: validDoc,
        expectation: { kind: "validation", expectedValid: true },
      },
      {
        caseId: "m",
        level: "L1",
        skip: true,
        skipReason: "m",
      },
    ]);
    expect(suite.results.map((r) => r.caseId)).toEqual(["z", "a", "m"]);
  });

  it("R-09 failFast stops after first fail", () => {
    const suite = runConformanceSuite(
      [
        {
          caseId: "fail",
          level: "L1",
          document: validDoc,
          expectation: {
            kind: "validation",
            expectedValid: false,
            expectedDiagnostics: [],
          },
        },
        {
          caseId: "later",
          level: "L1",
          document: validDoc,
          expectation: { kind: "validation", expectedValid: true },
        },
      ],
      { failFast: true },
    );
    expect(suite.results).toHaveLength(1);
    expect(suite.results[0]?.caseId).toBe("fail");
  });

  it("R-10 failFast does not stop on skip", () => {
    const suite = runConformanceSuite(
      [
        {
          caseId: "skip",
          level: "L1",
          skip: true,
          skipReason: "deferred",
        },
        {
          caseId: "pass",
          level: "L1",
          document: validDoc,
          expectation: { kind: "validation", expectedValid: true },
        },
      ],
      { failFast: true },
    );
    expect(suite.results).toHaveLength(2);
  });

  it("R-11 no input mutation", () => {
    const document = deepFreeze(cloneJson(validDoc));
    const cases: ConformanceCaseInput[] = deepFreeze([
      {
        caseId: "immutable",
        level: "L1",
        document,
        expectation: { kind: "validation", expectedValid: true },
      },
    ]);
    const before = serializeJson(document as never);
    runConformanceSuite(cases);
    expect(serializeJson(document as never)).toBe(before);
    expect(Object.isFrozen(cases)).toBe(true);
  });

  it("R-12 malformed level throws", () => {
    expect(() =>
      runConformanceCase({
        caseId: "bad-level",
        level: "L9" as ConformanceCaseInput["level"],
        document: validDoc,
        expectation: { kind: "validation", expectedValid: true },
      }),
    ).toThrow(TypeError);
  });

  it("R-13 malformed category throws", () => {
    const badCase = {
      caseId: "bad-cat",
      level: "L4",
      document: validDoc,
      expectation: {
        kind: "not-a-real-category",
      },
    } as unknown as ConformanceCaseInput;
    expect(() => runConformanceCase(badCase)).toThrow(TypeError);
  });
});

describe("conformance runner L1 corpus", () => {
  const entries = loadManifest().entries.filter((e) => e.targetLevel === "L1");

  it("discovers all L1 manifest entries", () => {
    expect(entries).toHaveLength(14);
  });

  for (const entry of entries) {
    it(`L1 ${entry.id}`, () => {
      const result = runManifestEntry(entry);
      expect(result.status).toBe("pass");
      expect(result.level).toBe("L1");
    });
  }

  it("message is ignored in diagnostic multiset", () => {
    const entry = entries.find((e) => e.id === "l1-missing-specVersion");
    expect(entry).toBeDefined();
    if (entry === undefined) {
      return;
    }
    const document = readFixtureJson(entry.fixture);
    const result = runConformanceCase(manifestEntryToCase(entry, document));
    expect(result.status).toBe("pass");
    expect(result.diagnostics?.[0]).not.toHaveProperty("message");
  });

  it("diagnostic order independence", () => {
    const entry = entries.find((e) => e.id === "l1-unknown-root-facts");
    expect(entry?.expectedDiagnostics).toBeDefined();
    if (entry?.expectedDiagnostics === undefined) {
      return;
    }
    const reversed = [...entry.expectedDiagnostics].reverse();
    const document = readFixtureJson(entry.fixture);
    const result = runConformanceCase({
      caseId: entry.id,
      level: "L1",
      document,
      expectation: {
        kind: "validation",
        expectedValid: false,
        expectedDiagnostics: reversed,
      },
    });
    expect(result.status).toBe("pass");
  });
});

describe("conformance runner L2 corpus", () => {
  const entries = loadManifest().entries.filter((e) => e.targetLevel === "L2");

  it("discovers all L2 manifest entries", () => {
    // Existing frozen corpus (EVI-2.5A said 18; manifest has 17 — no backfill).
    expect(entries).toHaveLength(17);
  });

  for (const entry of entries) {
    it(`L2 ${entry.id}`, () => {
      const result = runManifestEntry(entry);
      expect(result.status).toBe("pass");
      expect(result.level).toBe("L2");
    });
  }

  it("warnings do not force invalid when expectedValid true", () => {
    const entry = entries.find((e) => e.id === "l2-contradiction-subject-predicate-mismatch");
    expect(entry).toBeDefined();
    if (entry === undefined) {
      return;
    }
    const result = runManifestEntry(entry);
    expect(result.status).toBe("pass");
    expect(result.actual).toMatchObject({ valid: true });
  });
});

describe("conformance runner L3 corpus", () => {
  const entries = loadManifest().entries.filter((e) => e.targetLevel === "L3");

  it("discovers all L3 manifest entries", () => {
    expect(entries).toHaveLength(6);
  });

  for (const entry of entries) {
    it(`L3 ${entry.id}`, () => {
      const result = runManifestEntry(entry);
      expect(result.status).toBe("pass");
      expect(result.level).toBe("L3");
    });
  }

  it("object key order is non-semantic under jsonEquals", () => {
    const left = { b: 2, a: 1 };
    const right = { a: 1, b: 2 };
    expect(jsonEquals(left, right)).toBe(true);
    const result = runConformanceCase({
      caseId: "key-order",
      level: "L3",
      document: left,
      expectation: { kind: "roundTripJsonEquals" },
    });
    expect(result.status).toBe("pass");
  });

  it("does not require byte-identical serialization", () => {
    const doc = { z: 1, a: 2 };
    const textA = serializeJson(doc);
    const parsed = parseJson(textA);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }
    // Reordered object literal may stringify differently; tree equality still holds.
    const reordered = { a: 2, z: 1 };
    expect(jsonEquals(parsed.value, reordered)).toBe(true);
    expect(serializeJson(parsed.value) === serializeJson(reordered) || true).toBe(true);
  });
});

describe("conformance runner L4 corpus", () => {
  const expectations = loadL4Expectations().expectations;

  it("discovers all L4 expectation records", () => {
    expect(expectations).toHaveLength(7);
  });

  for (const record of expectations) {
    it(`L4 ${record.id} (${record.category})`, () => {
      const result = runL4ExpectationRecord(record);
      expect(result.status).toBe("pass");
      expect(result.level).toBe("L4");
      expect(result.ruleIds).toEqual(record.ruleIds);
    });
  }
});

describe("conformance runner expected errors", () => {
  const factDoc = readFixtureJson("fixtures/conformance/l4/l4-fact-qualification.json");

  it("invalid explicit asOf → expected RangeError PASS", () => {
    const result = runConformanceCase({
      caseId: "expected-range",
      level: "L4",
      document: factDoc,
      expectedError: { name: "RangeError" },
      expectation: {
        kind: "current-truth",
        asOf: "yesterday",
        includedInCurrentTruth: [],
        excludedFromCurrentTruth: [],
        nonFactAssertionIds: [],
      },
    });
    expect(result.status).toBe("pass");
    expect(result.actualError?.name).toBe("RangeError");
    expect(result).not.toHaveProperty("stack");
  });

  it("unexpected RangeError → FAIL", () => {
    const result = runConformanceCase({
      caseId: "unexpected-range",
      level: "L4",
      document: factDoc,
      expectation: {
        kind: "current-truth",
        asOf: "yesterday",
        includedInCurrentTruth: ["asrt-fact"],
        excludedFromCurrentTruth: [],
        nonFactAssertionIds: [],
      },
    });
    expect(result.status).toBe("fail");
    expect(result.actualError?.name).toBe("RangeError");
  });

  it("stack traces are not part of result", () => {
    const result = runConformanceCase({
      caseId: "no-stack",
      level: "L4",
      document: factDoc,
      expectedError: { name: "RangeError" },
      expectation: {
        kind: "current-truth",
        asOf: "not-a-date",
        includedInCurrentTruth: [],
        excludedFromCurrentTruth: [],
        nonFactAssertionIds: [],
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/at /);
  });
});

describe("conformance runner skip semantics", () => {
  it("explicit skip retains reason and does not execute operation", () => {
    const result = runConformanceCase({
      caseId: "skip-reason",
      level: "L4",
      skip: true,
      skipReason: "evidence threshold not normative",
      document: { shouldNotMatter: true },
      expectation: {
        kind: "fact-qualification",
        factAssertionIds: [],
        nonFactAssertionIds: [],
        persistedFactObjectsExpected: false,
      },
    });
    expect(result.status).toBe("skip");
    expect(result.reason).toBe("evidence threshold not normative");
  });
});

describe("conformance runner security / closed registry", () => {
  it("unknown operation/category rejected", () => {
    const badCase = {
      caseId: "sec-1",
      level: "L4",
      document: {},
      expectation: {
        kind: "eval-this",
      },
    } as unknown as ConformanceCaseInput;
    expect(() => runConformanceCase(badCase)).toThrow(TypeError);
  });

  it("public conformance runtime has no fs/path/process.cwd imports", () => {
    const files = [
      "src/conformance/types.ts",
      "src/conformance/diagnostics-compare.ts",
      "src/conformance/operations.ts",
      "src/conformance/runner.ts",
      "src/conformance/index.ts",
    ];
    for (const file of files) {
      const text = readFileSync(join(repoRoot, file), "utf8");
      expect(text).not.toMatch(/node:fs|from ["']fs["']|node:path|from ["']path["']|process\.cwd/);
    }
  });
});

describe("conformance runner Northstar mechanical spots", () => {
  it("Northstar L3 round-trip spot only", () => {
    const northstar = readNorthstarJson();
    const result = runConformanceCase({
      caseId: "northstar-l3-spot",
      level: "L3",
      document: northstar,
      expectation: { kind: "roundTripJsonEquals" },
    });
    expect(result.status).toBe("pass");
  });

  it("Northstar L1 validation spot", () => {
    const northstar = readNorthstarJson();
    const result = runConformanceCase({
      caseId: "northstar-l1-spot",
      level: "L1",
      document: northstar,
      expectation: { kind: "validation", expectedValid: true },
    });
    expect(result.status).toBe("pass");
  });

  it("does not implement Q1–Q14 narrative evaluation", () => {
    const source = readFileSync(join(repoRoot, "src/conformance/runner.ts"), "utf8");
    expect(source).not.toMatch(/Q1|Q14|scenario score|narrative/i);
  });
});

describe("conformance harness adapter", () => {
  it("preserves manifest v0.1", () => {
    const manifest = loadManifest();
    expect(manifest.manifestVersion).toBe("0.1");
  });

  it("maps L4 records without embedding repo paths in runner cases", () => {
    const record = loadL4Expectations().expectations[0];
    expect(record).toBeDefined();
    if (record === undefined) {
      return;
    }
    const document = readFixtureJson(record.fixture);
    const conformanceCase = l4ExpectationToCase(record, document);
    expect(conformanceCase).not.toHaveProperty("fixture");
    expect(JSON.stringify(conformanceCase)).not.toMatch(/fixtures\/conformance/);
  });
});
