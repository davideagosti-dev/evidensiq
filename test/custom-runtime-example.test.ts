import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function runCustomRuntimeExample(): string {
  return execFileSync(
    process.execPath,
    ["./node_modules/tsx/dist/cli.mjs", "examples/custom-runtime-consumption.ts"],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );
}

describe("custom runtime example (EVI-3.4)", () => {
  it("exports a repository-owned runnable script", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.["demo:custom-runtime"]).toBe("tsx examples/custom-runtime-consumption.ts");
  });

  it("produces deterministic structured runtime handoff output", () => {
    const output = runCustomRuntimeExample();
    const parsed = JSON.parse(output) as {
      example: string;
      ok: boolean;
      envelope: {
        boundary: {
          dataNotInstruction: boolean;
          consumerRules: string[];
        };
        runtimeInput: {
          contextData: {
            projectionTrace: {
              kind: string;
              sourceIds: string[];
            };
            recommendationTrace: {
              found: boolean;
              kind: string;
              recommendationId: string;
            };
          };
        };
      };
      runtimeResult: {
        runtime: string;
        handoffSummary: {
          recommendationStatus: string | null;
        };
      };
    };

    expect(parsed.example).toBe("custom-runtime-consumption");
    expect(parsed.ok).toBe(true);
    expect(parsed.envelope.boundary.dataNotInstruction).toBe(true);
    expect(parsed.envelope.boundary.consumerRules.length).toBeGreaterThan(0);
    expect(parsed.envelope.runtimeInput.contextData.projectionTrace.kind).toBe("projection");
    expect(
      parsed.envelope.runtimeInput.contextData.projectionTrace.sourceIds.length,
    ).toBeGreaterThan(0);
    expect(parsed.envelope.runtimeInput.contextData.recommendationTrace.found).toBe(true);
    expect(parsed.envelope.runtimeInput.contextData.recommendationTrace.kind).toBe(
      "recommendation",
    );
    expect(parsed.envelope.runtimeInput.contextData.recommendationTrace.recommendationId).toBe(
      "rec-defer-product-b-acquisition-spend",
    );
    expect(parsed.runtimeResult.runtime).toBe("custom-runtime-reference");
    expect(parsed.runtimeResult.handoffSummary.recommendationStatus).toBe("supported");
  });
});
