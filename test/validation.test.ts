import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { BusinessContextDocument } from "../src/model.js";
import { validateBusinessContext, validateL1, validateL2 } from "../src/validate.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(relativePath: string): unknown {
  return JSON.parse(readFileSync(join(repoRoot, relativePath), "utf8")) as unknown;
}

function minimalOrgDoc(overrides: Record<string, unknown> = {}): unknown {
  return {
    specVersion: "0.1",
    organizationId: "org-1",
    entities: [{ id: "org-1", type: "Organization", name: "Org" }],
    ...overrides,
  };
}

describe("L1 unit coverage gaps", () => {
  it("EVI-L1-004 Entity shape — missing type", () => {
    const result = validateL1(
      minimalOrgDoc({
        entities: [{ id: "org-1" }],
      }),
    );
    expect(result.valid).toBe(false);
    expect(
      result.diagnostics.some((d) => d.ruleId === "EVI-L1-004" && d.path === "/entities/0"),
    ).toBe(true);
  });

  it("EVI-L1-007 Assertion required shape — missing predicate", () => {
    const result = validateL1(
      minimalOrgDoc({
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
            subject: "org-1",
            value: true,
            evidenceIds: ["ev-1"],
            observedAt: "2026-01-01T00:00:00Z",
            classification: "asserted",
          },
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(
      result.diagnostics.some((d) => d.ruleId === "EVI-L1-007" && d.path === "/assertions/0"),
    ).toBe(true);
  });

  it("EVI-L1-011 Classification enum", () => {
    const result = validateL1(
      minimalOrgDoc({
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
            subject: "org-1",
            predicate: "active",
            value: true,
            evidenceIds: ["ev-1"],
            observedAt: "2026-01-01T00:00:00Z",
            classification: "confirmed",
          },
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(
      result.diagnostics.some(
        (d) => d.ruleId === "EVI-L1-011" && d.path === "/assertions/0/classification",
      ),
    ).toBe(true);
  });

  it("EVI-L1-013 Extension namespace keys", () => {
    const result = validateL1(
      minimalOrgDoc({
        entities: [
          {
            id: "org-1",
            type: "Organization",
            extensions: { NotANamespace: true },
          },
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(result.diagnostics.some((d) => d.ruleId === "EVI-L1-013")).toBe(true);
  });

  it("EVI-L1-014 Conflict structure — missing conflictKind", () => {
    const result = validateL1(
      minimalOrgDoc({
        conflicts: [
          {
            id: "conflict-1",
            assertionIds: ["a", "b"],
            status: "unresolved",
          },
        ],
      }),
    );
    expect(result.valid).toBe(false);
    expect(
      result.diagnostics.some((d) => d.ruleId === "EVI-L1-014" && d.path === "/conflicts/0"),
    ).toBe(true);
  });
});

describe("L2 unit coverage gaps", () => {
  it("EVI-L2-015 Signal evidenceIds must resolve to Evidence", () => {
    const l1 = validateL1(
      minimalOrgDoc({
        signals: [
          {
            id: "signal-1",
            type: "Signal",
            evidenceIds: ["missing-evidence"],
          },
        ],
      }),
    );
    expect(l1.valid).toBe(true);
    if (!l1.valid) {
      return;
    }
    const l2 = validateL2(l1.document);
    expect(l2.valid).toBe(false);
    expect(
      l2.diagnostics.some(
        (d) => d.ruleId === "EVI-L2-015" && d.path === "/signals/0/evidenceIds/0",
      ),
    ).toBe(true);
  });

  it("EVI-L2-017 externalIds values never resolve internal references", () => {
    const input = minimalOrgDoc({
      entities: [
        {
          id: "org-1",
          type: "Organization",
          externalIds: { "com.example.erp": "product-ext" },
        },
        {
          id: "product-1",
          type: "Product",
          externalIds: { "com.example.erp": "org-ext" },
        },
      ],
      relations: [
        {
          id: "rel-1",
          from: "product-ext",
          to: "org-1",
          type: "partOf",
        },
      ],
    });
    const result = validateBusinessContext(input);
    expect(result.valid).toBe(false);
    expect(
      result.diagnostics.some((d) => d.ruleId === "EVI-L2-004" && d.path === "/relations/0/from"),
    ).toBe(true);
  });

  it("EVI-L2-002 case-sensitive IDs remain distinct", () => {
    const result = validateBusinessContext(
      readJson("fixtures/conformance/l2/l2-case-sensitive-ids.json"),
    );
    expect(result.valid).toBe(true);
  });

  it("EVI-L2-019 warns for Product→targets→Metric and not for valid advisory pairs", () => {
    const mismatch = validateBusinessContext(
      readJson("fixtures/conformance/l2/l2-relation-endpoint-type-mismatch.json"),
    );
    expect(mismatch.valid).toBe(true);
    expect(
      mismatch.diagnostics.some(
        (d) => d.ruleId === "EVI-L2-019" && d.severity === "warning" && d.path === "/relations/0",
      ),
    ).toBe(true);

    const okTargets = validateBusinessContext(
      minimalOrgDoc({
        entities: [
          { id: "org-1", type: "Organization" },
          { id: "product-1", type: "Product" },
          { id: "segment-1", type: "CustomerSegment" },
        ],
        relations: [
          {
            id: "rel-1",
            from: "product-1",
            to: "segment-1",
            type: "targets",
          },
        ],
      }),
    );
    expect(okTargets.valid).toBe(true);
    expect(okTargets.diagnostics.some((d) => d.ruleId === "EVI-L2-019")).toBe(false);
  });

  it("EVI-L2-019 does not warn for extension relation types", () => {
    const result = validateBusinessContext(
      minimalOrgDoc({
        entities: [
          { id: "org-1", type: "Organization" },
          { id: "product-1", type: "Product" },
          { id: "metric-1", type: "Metric" },
        ],
        relations: [
          {
            id: "rel-1",
            from: "product-1",
            to: "metric-1",
            type: "com.example.customrel",
          },
        ],
      }),
    );
    expect(result.valid).toBe(true);
    expect(result.diagnostics.some((d) => d.ruleId === "EVI-L2-019")).toBe(false);
  });

  it("self-supersession fails EVI-L2-009", () => {
    const l1 = validateL1(
      minimalOrgDoc({
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
            subject: "org-1",
            predicate: "active",
            value: true,
            evidenceIds: ["ev-1"],
            observedAt: "2026-01-01T00:00:00Z",
            classification: "superseded",
            supersededBy: "asrt-1",
          },
        ],
      }),
    );
    expect(l1.valid).toBe(true);
    if (!l1.valid) {
      return;
    }
    const l2 = validateL2(l1.document);
    expect(l2.valid).toBe(false);
    expect(
      l2.diagnostics.some(
        (d) => d.ruleId === "EVI-L2-009" && d.path === "/assertions/0/supersededBy",
      ),
    ).toBe(true);
  });
});

describe("Northstar L1/L2 regression", () => {
  it("fixtures/northstar-manufacturing.json passes L1 and L2 without spurious L2-019", () => {
    const input = readJson("fixtures/northstar-manufacturing.json");
    const l1 = validateL1(input);
    expect(l1.valid).toBe(true);
    if (!l1.valid) {
      return;
    }
    const document: BusinessContextDocument = l1.document;
    const l2 = validateL2(document);
    expect(l2.valid).toBe(true);
    expect(l2.diagnostics.filter((d) => d.ruleId === "EVI-L2-019")).toEqual([]);
    const combined = validateBusinessContext(input);
    expect(combined.valid).toBe(true);
  });
});

describe("validation pipeline boundaries", () => {
  it("combined validation skips L2 when L1 fails", () => {
    const result = validateBusinessContext({ organizationId: "org-1" });
    expect(result.valid).toBe(false);
    expect(result.diagnostics.every((d) => d.level === "L1")).toBe(true);
    expect(result.diagnostics.some((d) => d.level === "L2")).toBe(false);
  });

  it("does not expose Ajv concepts in diagnostics", () => {
    const result = validateL1({
      specVersion: "0.1",
      organizationId: "org-1",
      facts: [],
    });
    expect(result.valid).toBe(false);
    for (const d of result.diagnostics) {
      expect(d).toHaveProperty("ruleId");
      expect(d).toHaveProperty("level");
      expect(d).toHaveProperty("severity");
      expect(d).toHaveProperty("path");
      expect(d).toHaveProperty("message");
      expect(d).not.toHaveProperty("keyword");
      expect(d).not.toHaveProperty("schemaPath");
      expect(d).not.toHaveProperty("params");
    }
  });
});
