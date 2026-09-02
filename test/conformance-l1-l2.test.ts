import { describe, expect, it } from "vitest";
import {
  expectDiagnosticMultiset,
  loadManifest,
  runManifestEntry,
} from "./helpers/conformance-harness.js";

describe("L1/L2 conformance fixture harness", () => {
  const manifest = loadManifest();
  const entries = manifest.entries.filter((e) => e.targetLevel === "L1" || e.targetLevel === "L2");

  it("discovers L1 and L2 manifest entries", () => {
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e) => e.targetLevel === "L1" || e.targetLevel === "L2")).toBe(true);
  });

  for (const entry of entries) {
    it(`${entry.id} (targetLevel=${entry.targetLevel})`, () => {
      const result = runManifestEntry(entry);
      expect(result.valid).toBe(entry.expectedValid);
      if (entry.expectedDiagnostics !== undefined) {
        expectDiagnosticMultiset(result.diagnostics, entry.expectedDiagnostics);
      } else if (entry.expectedValid) {
        const errors = result.diagnostics.filter((d) => d.severity === "error");
        expect(errors).toEqual([]);
      }
    });
  }
});
