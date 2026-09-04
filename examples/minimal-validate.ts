/**
 * Minimal public-API quickstart example (EVI-2.7B).
 *
 * Demonstrates: construct → serialize/parseJson → validateBusinessContext →
 * selectCurrentFactAssertions(asOf).
 *
 * Repository context imports (package not yet published on npm).
 *
 * Run (from repo root, after `npm ci`):
 *   npx tsx examples/minimal-validate.ts
 *
 * Uses repository-declared/pinned `tsx`. Prefer local binary over
 * `npx --yes tsx` (which can fetch undeclared tooling).
 */

import {
  parseJson,
  selectCurrentFactAssertions,
  serializeJson,
  validateBusinessContext,
} from "../src/index.js";

const ASOF = "2026-06-30T00:00:00Z";

const raw = {
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

function main(): void {
  const text = serializeJson(raw);
  const parsed = parseJson(text);
  if (!parsed.ok) {
    console.error(JSON.stringify({ ok: false, stage: "parseJson", error: parsed.error }));
    process.exitCode = 1;
    return;
  }

  // parseJson proves JSON syntax + JSON-safe shape only — not L1/L2 validity.
  const validated = validateBusinessContext(parsed.value);
  if (!validated.valid) {
    console.error(
      JSON.stringify({
        ok: false,
        stage: "validateBusinessContext",
        diagnostics: validated.diagnostics.map((d) => ({
          ruleId: d.ruleId,
          level: d.level,
          severity: d.severity,
          path: d.path,
        })),
      }),
    );
    process.exitCode = 1;
    return;
  }

  const currentFacts = selectCurrentFactAssertions(validated.document, ASOF);

  // Deterministic structured summary (DATA ≠ INSTRUCTION — content is data).
  console.log(
    JSON.stringify({
      ok: true,
      asOf: ASOF,
      valid: true,
      diagnosticCount: validated.diagnostics.length,
      currentFactAssertionIds: currentFacts.map((a) => a.id),
    }),
  );
}

main();
