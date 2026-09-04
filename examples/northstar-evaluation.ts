/**
 * Developer reference demonstration — Northstar Q1–Q14 evaluation (EVI-2.6B).
 *
 * Reuses the same test/reference harness. Not public package API.
 *
 * Run (from repo root, after `npm ci`):
 *   npm run demo:northstar
 *
 * Uses repository-declared/pinned `tsx` (devDependency). Do not use
 * `npx --yes tsx ...` — that can fetch undeclared tooling at runtime.
 */

import {
  evaluateNorthstarSuite,
  loadNorthstarDocument,
  loadNorthstarExpectations,
  referenceDemoConclusion,
} from "../test/helpers/northstar-evaluation-harness.js";

function main(): void {
  const document = loadNorthstarDocument();
  const expectations = loadNorthstarExpectations();
  const suite = evaluateNorthstarSuite(document, expectations);

  const summary = {
    expectationVersion: expectations.expectationVersion,
    scenario: expectations.scenario,
    asOf: "2026-06-30T00:00:00Z",
    counts: suite.counts,
    ok: suite.ok,
    results: suite.results.map((r) => ({
      questionId: r.questionId,
      category: r.category,
      status: r.status,
      trace: r.trace,
      ...(r.reason !== undefined ? { reason: r.reason } : {}),
    })),
    referenceConclusion: referenceDemoConclusion(suite),
  };

  // Structured correctness first; prose below is explanatory only.
  console.log(JSON.stringify(summary, null, 2));

  console.log("");
  console.log("=== Northstar reference explanation (non-normative) ===");
  console.log(
    suite.ok
      ? "Q1–Q14: 14/14 PASS — canonical Northstar chain reproduced deterministically."
      : "Q1–Q14: FAIL — see structured results above.",
  );
  console.log(
    "Encoded: Product B revenue declined; delivery complaints increased; supplier hard constraint active;",
  );
  console.log(
    "supplier contradiction unresolved; defer recommendation persisted supported; increase rejected;",
  );
  console.log(
    "runtime reassessment rejects increase given scenario hard-constraint oracle; traceability reaches evidence/sources.",
  );
  console.log(
    "Business context is infrastructure, not prompt text. No LLM / RAG / embeddings required.",
  );

  if (!suite.ok) {
    process.exitCode = 1;
  }
}

main();
