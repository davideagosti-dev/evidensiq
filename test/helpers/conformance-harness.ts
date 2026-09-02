/**
 * Test-only L1/L2 conformance harness over fixtures/conformance/manifest.json.
 * Not part of the public package API (EVI-2.5 owns the public runner).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "vitest";
import type { Diagnostic } from "../../src/validate.js";
import { validateBusinessContext, validateL1 } from "../../src/validate.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

export type ExpectedDiagnostic = {
  readonly ruleId: string;
  readonly level: string;
  readonly severity: string;
  readonly path: string;
};

export type ManifestEntry = {
  readonly id: string;
  readonly fixture: string;
  readonly targetLevel: "L1" | "L2" | "L3" | "L4";
  readonly expectedValid: boolean;
  readonly expectedDiagnostics?: readonly ExpectedDiagnostic[];
  readonly notes?: string;
};

export type Manifest = {
  readonly manifestVersion: string;
  readonly entries: readonly ManifestEntry[];
};

export function loadManifest(): Manifest {
  const text = readFileSync(join(repoRoot, "fixtures/conformance/manifest.json"), "utf8");
  return JSON.parse(text) as Manifest;
}

export function readFixtureJson(relativePath: string): unknown {
  const text = readFileSync(join(repoRoot, relativePath), "utf8");
  return JSON.parse(text) as unknown;
}

function diagnosticKey(d: {
  ruleId: string;
  level: string;
  severity: string;
  path: string;
}): string {
  return `${d.ruleId}\0${d.level}\0${d.severity}\0${d.path}`;
}

/** Multiset equality on (ruleId, level, severity, path). Message ignored. */
export function expectDiagnosticMultiset(
  actual: readonly Diagnostic[],
  expected: readonly ExpectedDiagnostic[] | undefined,
): void {
  const expectedList = expected ?? [];
  const actualKeys = actual.map((d) =>
    diagnosticKey({
      ruleId: d.ruleId,
      level: d.level,
      severity: d.severity,
      path: d.path,
    }),
  );
  const expectedKeys = expectedList.map((d) => diagnosticKey(d));
  expect(actualKeys.slice().sort()).toEqual(expectedKeys.slice().sort());
}

export function runManifestEntry(entry: ManifestEntry): {
  valid: boolean;
  diagnostics: readonly Diagnostic[];
} {
  const input = readFixtureJson(entry.fixture);
  if (entry.targetLevel === "L1") {
    const result = validateL1(input);
    return { valid: result.valid, diagnostics: result.diagnostics };
  }
  if (entry.targetLevel === "L2") {
    const result = validateBusinessContext(input);
    return { valid: result.valid, diagnostics: result.diagnostics };
  }
  throw new Error(`Harness does not execute targetLevel ${entry.targetLevel}`);
}
