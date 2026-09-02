/**
 * Test-only adapter: repository fixture I/O → public conformance runner.
 * Execution/comparison semantics live in @evidensiq/core (EVI-2.5).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type {
  ConformanceCaseInput,
  ConformanceCaseResult,
  DiagnosticIdentity,
  L4CategoryExpectation,
} from "../../src/conformance/index.js";
import { runConformanceCase } from "../../src/conformance/index.js";
import type { ConstraintEvaluation } from "../../src/semantics/recommendation.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** Default asOf for current-truth L4 fixtures (from fixture notes / corpus). */
const DEFAULT_L4_ASOF = "2026-06-30T00:00:00Z";

export type ExpectedDiagnostic = DiagnosticIdentity;

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

export type L4ExpectationRecord = {
  readonly id: string;
  readonly fixtureId: string;
  readonly fixture: string;
  readonly ruleIds: readonly string[];
  readonly category: string;
  readonly expectation: Record<string, unknown>;
  readonly notes?: string;
};

export type L4ExpectationsFile = {
  readonly expectationVersion: string;
  readonly expectations: readonly L4ExpectationRecord[];
};

export function loadManifest(): Manifest {
  const text = readFileSync(join(repoRoot, "fixtures/conformance/manifest.json"), "utf8");
  return JSON.parse(text) as Manifest;
}

export function loadL4Expectations(): L4ExpectationsFile {
  const text = readFileSync(join(repoRoot, "fixtures/conformance/l4-expectations.json"), "utf8");
  return JSON.parse(text) as L4ExpectationsFile;
}

export function readFixtureJson(relativePath: string): unknown {
  const text = readFileSync(join(repoRoot, relativePath), "utf8");
  return JSON.parse(text) as unknown;
}

export function readNorthstarJson(): unknown {
  return readFixtureJson("fixtures/northstar-manufacturing.json");
}

/** Map a manifest L1/L2/L3 entry + loaded document into a public runner case. */
export function manifestEntryToCase(entry: ManifestEntry, document: unknown): ConformanceCaseInput {
  if (entry.targetLevel === "L1" || entry.targetLevel === "L2") {
    const expectation: ConformanceCaseInput["expectation"] = {
      kind: "validation",
      expectedValid: entry.expectedValid,
      ...(entry.expectedDiagnostics !== undefined
        ? { expectedDiagnostics: entry.expectedDiagnostics }
        : {}),
    };
    return {
      caseId: entry.id,
      level: entry.targetLevel,
      document,
      expectation,
      ...(entry.notes !== undefined ? { notes: entry.notes } : {}),
    };
  }

  if (entry.targetLevel === "L3") {
    return {
      caseId: entry.id,
      level: "L3",
      document,
      expectation: { kind: "roundTripJsonEquals" },
      ...(entry.notes !== undefined ? { notes: entry.notes } : {}),
    };
  }

  throw new TypeError(
    `manifestEntryToCase does not map L4 alone; use l4ExpectationToCase (${entry.id})`,
  );
}

function constraintEvaluationsForPolicy(
  document: unknown,
  recommendationId: string,
): readonly ConstraintEvaluation[] {
  const doc = document as {
    readonly recommendations?: readonly {
      readonly id: string;
      readonly constraintIds?: readonly string[];
    }[];
  };
  const rec = (doc.recommendations ?? []).find((r) => r.id === recommendationId);
  const ids = rec?.constraintIds ?? [];
  return ids.map((constraintId) => ({ constraintId, violated: true }));
}

/** Map an l4-expectations.json record + document into a public runner case. */
export function l4ExpectationToCase(
  record: L4ExpectationRecord,
  document: unknown,
): ConformanceCaseInput {
  const category = record.category;
  const raw = record.expectation;
  let expectation: L4CategoryExpectation;

  switch (category) {
    case "fact-qualification":
      expectation = {
        kind: "fact-qualification",
        factAssertionIds: raw.factAssertionIds as readonly string[],
        nonFactAssertionIds: raw.nonFactAssertionIds as readonly string[],
        persistedFactObjectsExpected: false,
      };
      break;
    case "current-truth":
      expectation = {
        kind: "current-truth",
        asOf: DEFAULT_L4_ASOF,
        includedInCurrentTruth: raw.includedInCurrentTruth as readonly string[],
        excludedFromCurrentTruth: raw.excludedFromCurrentTruth as readonly string[],
        nonFactAssertionIds: raw.nonFactAssertionIds as readonly string[],
      };
      break;
    case "historical-change":
      expectation = {
        kind: "historical-change",
        assertionIds: raw.assertionIds as readonly string[],
        historicalChange: true,
        conflictExpected: false,
        inferredSupersessionExpected: false,
      };
      break;
    case "contradiction":
      expectation = {
        kind: "contradiction",
        assertionIds: raw.assertionIds as readonly string[],
        contradictionExpected: true,
        conflictId: raw.conflictId as string,
        preservedAssertionIds: raw.preservedAssertionIds as readonly string[],
        preservedEvidenceIds: raw.preservedEvidenceIds as readonly string[],
      };
      break;
    case "recommendation-assessment":
      expectation = {
        kind: "recommendation-assessment",
        assessmentRequiredRecommendationIds:
          raw.assessmentRequiredRecommendationIds as readonly string[],
        assessmentExpected: true,
        ...(raw.assessmentOptionalRecommendationIds !== undefined
          ? {
              assessmentOptionalRecommendationIds:
                raw.assessmentOptionalRecommendationIds as readonly string[],
            }
          : {}),
      };
      break;
    case "recommendation-policy": {
      const recommendationId = raw.recommendationId as string;
      expectation = {
        kind: "recommendation-policy",
        recommendationId,
        expectedStatus: "rejected",
        expectedAssessmentCheck: {
          name: "constraint-compliance",
          result: "fail",
        },
        conflictedExpected: false,
        constraintEvaluations: constraintEvaluationsForPolicy(document, recommendationId),
      };
      break;
    }
    case "temporal-projection": {
      const projectionRequest = raw.projectionRequest as {
        readonly asOf: string;
        readonly includeConflicts: boolean;
      };
      const expected = raw.expected as {
        readonly activeAssertionIds: readonly string[];
        readonly inactiveAssertionIds: readonly string[];
        readonly visibleConflictIds: readonly string[];
      };
      expectation = {
        kind: "temporal-projection",
        projectionRequest: {
          asOf: projectionRequest.asOf,
          includeConflicts: projectionRequest.includeConflicts,
        },
        expected: {
          activeAssertionIds: expected.activeAssertionIds,
          inactiveAssertionIds: expected.inactiveAssertionIds,
          visibleConflictIds: expected.visibleConflictIds,
        },
      };
      break;
    }
    default:
      throw new TypeError(`Unknown L4 category in fixture oracle: ${category}`);
  }

  return {
    caseId: record.id,
    level: "L4",
    ruleIds: record.ruleIds,
    document,
    expectation,
    ...(record.notes !== undefined ? { notes: record.notes } : {}),
  };
}

/** Run a manifest L1/L2/L3 entry through the public runner. */
export function runManifestEntry(entry: ManifestEntry): ConformanceCaseResult {
  const document = readFixtureJson(entry.fixture);
  if (entry.targetLevel === "L4") {
    throw new TypeError(`Use runL4ExpectationRecord for L4 entry ${entry.id}`);
  }
  return runConformanceCase(manifestEntryToCase(entry, document));
}

/** Run an L4 expectation record through the public runner. */
export function runL4ExpectationRecord(record: L4ExpectationRecord): ConformanceCaseResult {
  const document = readFixtureJson(record.fixture);
  return runConformanceCase(l4ExpectationToCase(record, document));
}
