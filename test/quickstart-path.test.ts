/**
 * Readiness regression: documented TypeScript quickstart path executes
 * against the current public API (EVI-2.7B).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  parseJson,
  selectCurrentFactAssertions,
  serializeJson,
  validateBusinessContext,
} from "../src/index.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const ASOF = "2026-06-30T00:00:00Z";

const quickstartDocument = {
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

describe("typescript quickstart path", () => {
  it("parse → validate → selectCurrentFactAssertions", () => {
    const parsed = parseJson(serializeJson(quickstartDocument));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) {
      return;
    }

    const validated = validateBusinessContext(parsed.value);
    expect(validated.valid).toBe(true);
    if (!validated.valid) {
      return;
    }

    const facts = selectCurrentFactAssertions(validated.document, ASOF);
    expect(facts.map((a) => a.id)).toEqual(["asrt-1"]);
  });

  it("examples/minimal-validate.ts uses only public index imports", () => {
    const source = readFileSync(join(repoRoot, "examples/minimal-validate.ts"), "utf8");
    expect(source).toMatch(/from ["']\.\.\/src\/index\.js["']/);
    expect(source).not.toMatch(/test\/helpers/);
    expect(source).not.toMatch(/node:fs|from ["']fs["']/);
    expect(source).toMatch(/parseJson/);
    expect(source).toMatch(/validateBusinessContext/);
    expect(source).toMatch(/selectCurrentFactAssertions/);
  });
});
