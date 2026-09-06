import { describe, expect, it } from "vitest";
import { buildProjectionTrace, buildRecommendationTrace } from "../src/semantics/trace.js";
import { projectBusinessContext } from "../src/semantics/projection.js";
import {
  ASOF,
  EVIDENCE_ID,
  ORG_ID,
  SOURCE_ID,
  SUBJECT_ID,
  classifiedAssertion,
  contextDocument,
  contradictionConflict,
  entity,
  evidence,
  hardConstraint,
  inference,
  recommendation,
  relation,
  signal,
  validatedFact,
} from "./helpers/projection-fixtures.js";

describe("buildProjectionTrace", () => {
  it("T-01 surfaces projection ids in document order", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID), entity("other")],
      relations: [relation("rel-1", SUBJECT_ID, "other")],
      evidence: [evidence("ev-1"), evidence("ev-2", "source-2")],
      sources: [
        {
          id: SOURCE_ID,
          type: "Source",
          provenance: {
            originScope: "internal",
            acquisitionMethod: "imported",
            trustAssessment: "trusted",
          },
        },
        {
          id: "source-2",
          type: "Source",
          provenance: {
            originScope: "internal",
            acquisitionMethod: "user-provided",
            trustAssessment: "trusted",
          },
        },
      ],
      assertions: [validatedFact("asrt-1", { subject: SUBJECT_ID, evidenceIds: ["ev-1"] })],
      signals: [signal("sig-1", ["ev-1"])],
      inferences: [inference("inf-1", ["sig-1"])],
      recommendations: [recommendation("rec-1", { status: "candidate", inferenceIds: ["inf-1"] })],
    });

    const result = projectBusinessContext(
      doc,
      { entityIds: [SUBJECT_ID], relationTraversal: { maxDepth: 1 }, asOf: ASOF },
      { projectedAt: "2026-06-30T14:00:00Z" },
    );
    const trace = buildProjectionTrace(result);

    expect(trace).toEqual({
      kind: "projection",
      projectedAt: "2026-06-30T14:00:00Z",
      asOf: ASOF,
      entityIds: [SUBJECT_ID, "other"],
      relationIds: ["rel-1"],
      assertionIds: ["asrt-1"],
      signalIds: ["sig-1"],
      inferenceIds: ["inf-1"],
      recommendationIds: ["rec-1"],
      conflictIds: [],
      evidenceIds: ["ev-1"],
      sourceIds: [SOURCE_ID],
    });
  });

  it("T-02 empty collections remain empty arrays", () => {
    const trace = buildProjectionTrace(projectBusinessContext(contextDocument(), {}));
    expect(trace.kind).toBe("projection");
    expect(trace.conflictIds).toEqual([]);
    expect(trace.sourceIds).toEqual([]);
  });
});

describe("buildRecommendationTrace", () => {
  function traceDoc() {
    return contextDocument({
      entities: [
        entity(ORG_ID, "Organization"),
        entity(SUBJECT_ID),
        entity("other"),
        hardConstraint("constraint-hard"),
      ],
      relations: [relation("rel-1", SUBJECT_ID, "other")],
      sources: [
        {
          id: "source-2",
          type: "Source",
          provenance: {
            originScope: "internal",
            acquisitionMethod: "user-provided",
            trustAssessment: "trusted",
          },
        },
        {
          id: SOURCE_ID,
          type: "Source",
          provenance: {
            originScope: "internal",
            acquisitionMethod: "imported",
            trustAssessment: "trusted",
          },
        },
      ],
      evidence: [evidence("ev-signal", "source-2"), evidence(EVIDENCE_ID), evidence("ev-rec")],
      assertions: [
        validatedFact("asrt-support", { subject: SUBJECT_ID, evidenceIds: [EVIDENCE_ID] }),
        classifiedAssertion("asrt-peer", "asserted", {
          subject: SUBJECT_ID,
          predicate: "status",
          value: "peer",
          evidenceIds: [EVIDENCE_ID],
        }),
      ],
      signals: [signal("sig-1", ["ev-signal"])],
      inferences: [inference("inf-1", ["sig-1", "asrt-support"])],
      recommendations: [
        recommendation("rec-main", {
          status: "supported",
          inferenceIds: ["inf-1"],
          evidenceIds: ["ev-rec"],
          constraintIds: ["constraint-hard"],
          assessment: {
            evaluatedAt: "2026-06-30T14:00:00Z",
            policyId: "evidensiq.default-recommendation-v0.1",
            results: [
              { check: "constraint-compliance", outcome: "pass" },
              { check: "conflict-impact", outcome: "warning" },
            ],
          },
        }),
      ],
      conflicts: [contradictionConflict("conflict-1", ["asrt-support", "asrt-peer"], "unresolved")],
    });
  }

  it("T-03 returns bounded deterministic support, source, and conflict ids", () => {
    const trace = buildRecommendationTrace(traceDoc(), "rec-main", {
      asOf: ASOF,
      evaluatedAt: "2026-06-30T14:00:00Z",
      constraintEvaluations: [{ constraintId: "constraint-hard", violated: false }],
    });

    expect(trace.found).toBe(true);
    if (!trace.found) return;

    expect(trace.kind).toBe("recommendation");
    expect(trace.status).toBe("supported");
    expect(trace.support).toEqual({
      constraintIds: ["constraint-hard"],
      inferenceIds: ["inf-1"],
      signalIds: ["sig-1"],
      assertionIds: ["asrt-support"],
      evidenceIds: ["ev-signal", EVIDENCE_ID, "ev-rec"],
      sourceIds: ["source-2", SOURCE_ID],
      conflictIds: ["conflict-1"],
    });
    expect(trace.persistedAssessment).toEqual({
      policyId: "evidensiq.default-recommendation-v0.1",
      evaluatedAt: "2026-06-30T14:00:00Z",
      results: [
        { check: "constraint-compliance", outcome: "pass" },
        { check: "conflict-impact", outcome: "warning" },
      ],
    });
    expect(trace.runtimeAssessment).toMatchObject({
      policyId: "evidensiq.default-recommendation-v0.1",
      asOf: ASOF,
      evaluatedAt: "2026-06-30T14:00:00Z",
    });
    expect(trace.runtimeAssessment.warningChecks).toEqual([
      { check: "conflict-impact", outcome: "warning" },
    ]);
  });

  it("T-04 missing recommendation is structured normal result", () => {
    expect(buildRecommendationTrace(traceDoc(), "missing")).toEqual({
      found: false,
      kind: "recommendation",
      recommendationId: "missing",
    });
  });

  it("T-05 hard constraint violation yields rejected derived status without hidden reasoning", () => {
    const trace = buildRecommendationTrace(traceDoc(), "rec-main", {
      constraintEvaluations: [{ constraintId: "constraint-hard", violated: true }],
    });
    expect(trace.found).toBe(true);
    if (!trace.found) return;
    expect(trace.runtimeAssessment.derivedStatus).toBe("rejected");
    expect(trace.runtimeAssessment.evaluatedChecks).toContainEqual({
      check: "constraint-compliance",
      outcome: "fail",
      constraintId: "constraint-hard",
    });
  });

  it("T-06 repeated identical inputs are deterministic", () => {
    const doc = traceDoc();
    const options = {
      asOf: ASOF,
      evaluatedAt: "2026-06-30T14:00:00Z",
      constraintEvaluations: [{ constraintId: "constraint-hard" as const, violated: false }],
    };
    expect(buildRecommendationTrace(doc, "rec-main", options)).toEqual(
      buildRecommendationTrace(doc, "rec-main", options),
    );
  });
});
