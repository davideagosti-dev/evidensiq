import { describe, expect, it } from "vitest";
import { DEFAULT_RECOMMENDATION_POLICY_ID } from "../src/constants.js";
import {
  assessRecommendation,
  buildRecommendationSupportGraph,
} from "../src/semantics/recommendation.js";
import {
  SUBJECT_ID,
  ORG_ID,
  EVIDENCE_ID,
  SOURCE_ID,
  classifiedAssertion,
  contradictionConflict,
  contextDocument,
  entity,
  evidence,
  hardConstraint,
  advisoryConstraint,
  inference,
  recommendation,
  signal,
  validatedFact,
} from "./helpers/projection-fixtures.js";

function supportDoc() {
  return contextDocument({
    entities: [
      entity(ORG_ID, "Organization"),
      entity(SUBJECT_ID),
      hardConstraint("constraint-hard"),
      entity("constraint-alias", "Product", {
        externalIds: { erp: "constraint-hard" },
      }),
    ],
    evidence: [evidence("ev-sig"), evidence("ev-asrt"), evidence("ev-rec"), evidence("ev-unused")],
    assertions: [
      validatedFact("asrt-support", {
        subject: SUBJECT_ID,
        evidenceIds: ["ev-asrt"],
      }),
      classifiedAssertion("asrt-asserted-only", "asserted", {
        subject: SUBJECT_ID,
        evidenceIds: ["ev-unused"],
      }),
    ],
    signals: [signal("sig-1", ["ev-sig"])],
    inferences: [
      inference("inf-leaf", ["sig-1", "asrt-support"]),
      inference("inf-root", ["inf-leaf"]),
      inference("inf-cycle-a", ["inf-cycle-b", "sig-1"]),
      inference("inf-cycle-b", ["inf-cycle-a"]),
    ],
    recommendations: [
      recommendation("rec-full", {
        status: "candidate",
        evidenceIds: ["ev-rec"],
        inferenceIds: ["inf-root"],
        constraintIds: ["constraint-hard"],
      }),
      recommendation("rec-cycle", {
        status: "candidate",
        inferenceIds: ["inf-cycle-a"],
      }),
    ],
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
    ],
  });
}

describe("buildRecommendationSupportGraph", () => {
  it("S-01 Recommendation direct Evidence refs resolve", () => {
    const result = buildRecommendationSupportGraph(supportDoc(), "rec-full");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.evidence.map((e) => e.id)).toContain("ev-rec");
  });

  it("S-02 Recommendation Inference refs resolve", () => {
    const result = buildRecommendationSupportGraph(supportDoc(), "rec-full");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.inferences.map((i) => i.id)).toContain("inf-root");
  });

  it("S-03 Inference → Signal resolves", () => {
    const result = buildRecommendationSupportGraph(supportDoc(), "rec-full");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.signals.map((s) => s.id)).toContain("sig-1");
  });

  it("S-04 Inference → validated Assertion resolves", () => {
    const result = buildRecommendationSupportGraph(supportDoc(), "rec-full");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.assertions.map((a) => a.id)).toContain("asrt-support");
    expect(result.assertions.map((a) => a.id)).not.toContain("asrt-asserted-only");
  });

  it("S-05 Inference → Inference transitive closure", () => {
    const result = buildRecommendationSupportGraph(supportDoc(), "rec-full");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.inferences.map((i) => i.id)).toEqual(["inf-leaf", "inf-root"]);
  });

  it("S-06 Signal → Evidence resolves", () => {
    const result = buildRecommendationSupportGraph(supportDoc(), "rec-full");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.evidence.map((e) => e.id)).toContain("ev-sig");
  });

  it("S-07 Assertion → Evidence resolves", () => {
    const result = buildRecommendationSupportGraph(supportDoc(), "rec-full");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.evidence.map((e) => e.id)).toContain("ev-asrt");
  });

  it("S-08 Recommendation → Constraint resolves", () => {
    const result = buildRecommendationSupportGraph(supportDoc(), "rec-full");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.constraints.map((c) => c.id)).toEqual(["constraint-hard"]);
  });

  it("S-09 Evidence sourceId preserved/traceable via original document", () => {
    const doc = supportDoc();
    const result = buildRecommendationSupportGraph(doc, "rec-full");
    expect(result.found).toBe(true);
    if (!result.found) return;
    for (const ev of result.evidence) {
      expect(ev.sourceId).toBe(SOURCE_ID);
      expect((doc.sources ?? []).some((s) => s.id === ev.sourceId)).toBe(true);
    }
  });

  it("S-10 cycles terminate", () => {
    const result = buildRecommendationSupportGraph(supportDoc(), "rec-cycle");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.inferences.map((i) => i.id).sort()).toEqual(["inf-cycle-a", "inf-cycle-b"]);
    expect(result.signals.map((s) => s.id)).toEqual(["sig-1"]);
  });

  it("S-11 document ordering preserved where applicable", () => {
    const result = buildRecommendationSupportGraph(supportDoc(), "rec-full");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.evidence.map((e) => e.id)).toEqual(["ev-sig", "ev-asrt", "ev-rec"]);
  });

  it("S-12 exact ID case sensitivity", () => {
    const doc = contextDocument({
      recommendations: [
        recommendation("Rec-A", { status: "candidate" }),
        recommendation("rec-a", { status: "candidate" }),
      ],
    });
    const result = buildRecommendationSupportGraph(doc, "Rec-A");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.recommendation.id).toBe("Rec-A");
  });

  it("S-13 externalIds ignored", () => {
    const doc = supportDoc();
    const byAlias = buildRecommendationSupportGraph(doc, "constraint-hard");
    expect(byAlias.found).toBe(false);
    const result = buildRecommendationSupportGraph(doc, "rec-full");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.constraints.map((c) => c.id)).toEqual(["constraint-hard"]);
    expect(result.constraints.map((c) => c.id)).not.toContain("constraint-alias");
  });

  it("S-14 missing recommendation returns structured normal result", () => {
    const result = buildRecommendationSupportGraph(supportDoc(), "missing-rec");
    expect(result).toEqual({ found: false, recommendationId: "missing-rec" });
  });

  it("S-15 source document not mutated", () => {
    const doc = supportDoc();
    const before = structuredClone(doc);
    buildRecommendationSupportGraph(doc, "rec-full");
    expect(doc).toEqual(before);
  });
});

describe("assessRecommendation — bounded assessment", () => {
  function assessmentDoc(
    extras: {
      readonly constraints?: ReturnType<typeof hardConstraint>[];
      readonly conflictStatus?: "unresolved" | "resolved";
      readonly preferred?: string;
    } = {},
  ) {
    const constraints = extras.constraints ?? [hardConstraint("constraint-hard")];
    return contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID), ...constraints],
      evidence: [evidence(EVIDENCE_ID)],
      assertions: [
        validatedFact("asrt-support", {
          subject: SUBJECT_ID,
          evidenceIds: [EVIDENCE_ID],
          predicate: "capacity",
          value: "constrained",
        }),
        classifiedAssertion("asrt-peer", "asserted", {
          subject: SUBJECT_ID,
          evidenceIds: [EVIDENCE_ID],
          predicate: "capacity",
          value: "normal",
        }),
        validatedFact("asrt-unrelated", {
          subject: SUBJECT_ID,
          evidenceIds: [EVIDENCE_ID],
          predicate: "other",
          value: 1,
        }),
      ],
      signals: [signal("sig-1", [EVIDENCE_ID])],
      inferences: [inference("inf-1", ["sig-1", "asrt-support"])],
      recommendations: [
        recommendation("rec-main", {
          status: "candidate",
          inferenceIds: ["inf-1"],
          constraintIds: constraints.map((c) => c.id),
          evidenceIds: [EVIDENCE_ID],
        }),
        recommendation("rec-no-constraint", {
          status: "candidate",
          evidenceIds: [EVIDENCE_ID],
        }),
      ],
      conflicts: [
        contradictionConflict(
          "conflict-support",
          ["asrt-support", "asrt-peer"],
          extras.conflictStatus ?? "unresolved",
          extras.preferred !== undefined
            ? { resolution: { preferredAssertionId: extras.preferred } }
            : {},
        ),
        contradictionConflict("conflict-unrelated", ["asrt-unrelated"], "unresolved"),
      ],
    });
  }

  it("R-01 recommendation found", () => {
    const result = assessRecommendation(assessmentDoc(), "rec-main");
    expect(result.found).toBe(true);
  });

  it("R-02 missing recommendation normal result", () => {
    expect(assessRecommendation(assessmentDoc(), "missing")).toEqual({
      found: false,
      recommendationId: "missing",
    });
  });

  it("R-03 hard constraint + explicit violated=true → fail", () => {
    const result = assessRecommendation(assessmentDoc(), "rec-main", {
      constraintEvaluations: [{ constraintId: "constraint-hard", violated: true }],
    });
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(
      result.evaluatedChecks.some(
        (c) =>
          c.check === "constraint-compliance" &&
          c.outcome === "fail" &&
          c.constraintId === "constraint-hard",
      ),
    ).toBe(true);
  });

  it("R-04 hard constraint violation → derived rejected", () => {
    const result = assessRecommendation(assessmentDoc(), "rec-main", {
      constraintEvaluations: [{ constraintId: "constraint-hard", violated: true }],
    });
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.derivedStatus).toBe("rejected");
  });

  it("R-05 hard constraint violation never → conflicted", () => {
    const result = assessRecommendation(assessmentDoc(), "rec-main", {
      constraintEvaluations: [{ constraintId: "constraint-hard", violated: true }],
    });
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.derivedStatus).not.toBe("conflicted");
    expect(result.derivedStatus).toBe("rejected");
  });

  it("R-06 violated=false does not derive supported", () => {
    const result = assessRecommendation(assessmentDoc(), "rec-main", {
      constraintEvaluations: [{ constraintId: "constraint-hard", violated: false }],
    });
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.derivedStatus).toBeUndefined();
    expect(result.derivedStatus).not.toBe("supported");
  });

  it("R-07 missing constraint evaluation is not treated as false", () => {
    const result = assessRecommendation(assessmentDoc(), "rec-main");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(
      result.notEvaluableChecks.some(
        (c) =>
          c.check === "constraint-compliance" &&
          c.constraintId === "constraint-hard" &&
          c.reason === "constraint-not-evaluated",
      ),
    ).toBe(true);
    expect(
      result.evaluatedChecks.some(
        (c) => c.check === "constraint-compliance" && c.outcome === "pass",
      ),
    ).toBe(false);
  });

  it("R-08 multiple constraints evaluated independently", () => {
    const doc = assessmentDoc({
      constraints: [hardConstraint("c-hard"), advisoryConstraint("c-adv")],
    });
    const result = assessRecommendation(doc, "rec-main", {
      constraintEvaluations: [
        { constraintId: "c-hard", violated: false },
        { constraintId: "c-adv", violated: true },
      ],
    });
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(
      result.evaluatedChecks.some((c) => c.constraintId === "c-hard" && c.outcome === "pass"),
    ).toBe(true);
    expect(
      result.warningChecks.some((c) => c.constraintId === "c-adv" && c.outcome === "warning"),
    ).toBe(true);
    expect(result.derivedStatus).toBeUndefined();
  });

  it("R-09 one hard violated among multiple constraints → rejected", () => {
    const doc = assessmentDoc({
      constraints: [hardConstraint("c1"), hardConstraint("c2")],
    });
    const result = assessRecommendation(doc, "rec-main", {
      constraintEvaluations: [
        { constraintId: "c1", violated: false },
        { constraintId: "c2", violated: true },
      ],
    });
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.derivedStatus).toBe("rejected");
  });

  it("R-10 exact constraint ID resolution", () => {
    const result = assessRecommendation(assessmentDoc(), "rec-main", {
      constraintEvaluations: [{ constraintId: "constraint-hard", violated: true }],
    });
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.derivedStatus).toBe("rejected");
  });

  it("R-11 externalIds do not resolve constraint evaluation", () => {
    const doc = contextDocument({
      entities: [
        entity(ORG_ID, "Organization"),
        hardConstraint("constraint-hard"),
        entity("alias", "Constraint", {
          externalIds: { erp: "constraint-hard" },
          properties: { enforcement: "hard" },
        }),
      ],
      recommendations: [
        recommendation("rec-main", {
          status: "candidate",
          constraintIds: ["constraint-hard"],
        }),
      ],
    });
    const result = assessRecommendation(doc, "rec-main", {
      constraintEvaluations: [{ constraintId: "alias", violated: true }],
    });
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.derivedStatus).toBeUndefined();
    expect(result.notEvaluableChecks.some((c) => c.constraintId === "constraint-hard")).toBe(true);
  });

  it("R-12 evaluation for unrelated constraint does not affect Recommendation", () => {
    const result = assessRecommendation(assessmentDoc(), "rec-main", {
      constraintEvaluations: [
        { constraintId: "unrelated-constraint", violated: true },
        { constraintId: "constraint-hard", violated: false },
      ],
    });
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.derivedStatus).toBeUndefined();
    expect(
      result.evaluatedChecks.some(
        (c) => c.constraintId === "constraint-hard" && c.outcome === "pass",
      ),
    ).toBe(true);
  });

  it("R-13 unresolved Conflict intersecting support → conflict-impact warning", () => {
    const result = assessRecommendation(assessmentDoc(), "rec-main");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(
      result.warningChecks.some((c) => c.check === "conflict-impact" && c.outcome === "warning"),
    ).toBe(true);
  });

  it("R-14 unrelated unresolved Conflict ignored", () => {
    const doc = assessmentDoc();
    // Remove support intersection by pointing inference only at signal (no asrt-support)
    const isolated = contextDocument({
      ...(doc.entities !== undefined ? { entities: doc.entities } : {}),
      ...(doc.evidence !== undefined ? { evidence: doc.evidence } : {}),
      ...(doc.assertions !== undefined ? { assertions: doc.assertions } : {}),
      ...(doc.signals !== undefined ? { signals: doc.signals } : {}),
      inferences: [inference("inf-only-signal", ["sig-1"])],
      recommendations: [
        recommendation("rec-main", {
          status: "candidate",
          inferenceIds: ["inf-only-signal"],
          constraintIds: ["constraint-hard"],
        }),
      ],
      ...(doc.conflicts !== undefined ? { conflicts: doc.conflicts } : {}),
    });
    const result = assessRecommendation(isolated, "rec-main", {
      constraintEvaluations: [{ constraintId: "constraint-hard", violated: false }],
    });
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.warningChecks.some((c) => c.check === "conflict-impact")).toBe(false);
    expect(
      result.evaluatedChecks.some((c) => c.check === "conflict-impact" && c.outcome === "pass"),
    ).toBe(true);
  });

  it("R-15 resolved Conflict ignored", () => {
    const result = assessRecommendation(
      assessmentDoc({ conflictStatus: "resolved", preferred: "asrt-support" }),
      "rec-main",
    );
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.warningChecks.some((c) => c.check === "conflict-impact")).toBe(false);
  });

  it("R-16 preferredAssertionId does not choose status", () => {
    const result = assessRecommendation(assessmentDoc({ preferred: "asrt-support" }), "rec-main", {
      constraintEvaluations: [{ constraintId: "constraint-hard", violated: false }],
    });
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.derivedStatus).toBeUndefined();
  });

  it("R-17 conflict warning does not automatically derive conflicted", () => {
    const result = assessRecommendation(assessmentDoc(), "rec-main", {
      constraintEvaluations: [{ constraintId: "constraint-hard", violated: false }],
    });
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.warningChecks.some((c) => c.check === "conflict-impact")).toBe(true);
    expect(result.derivedStatus).toBeUndefined();
  });

  it("R-18 conflict warning does not automatically block persisted supported meaning", () => {
    const doc = assessmentDoc();
    const withSupported = contextDocument({
      ...doc,
      recommendations: [
        recommendation("rec-main", {
          status: "supported",
          inferenceIds: ["inf-1"],
          constraintIds: ["constraint-hard"],
          assessment: {
            evaluatedAt: "2026-06-30T14:00:00Z",
            policyId: DEFAULT_RECOMMENDATION_POLICY_ID,
            results: [
              { check: "constraint-compliance", outcome: "pass" },
              { check: "conflict-impact", outcome: "warning" },
            ],
          },
        }),
      ],
    });
    const before = structuredClone(withSupported.recommendations?.[0]);
    const result = assessRecommendation(withSupported, "rec-main", {
      constraintEvaluations: [{ constraintId: "constraint-hard", violated: false }],
    });
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.warningChecks.some((c) => c.check === "conflict-impact")).toBe(true);
    expect(result.derivedStatus).toBeUndefined();
    expect(withSupported.recommendations?.[0]).toEqual(before);
    expect(withSupported.recommendations?.[0]?.status).toBe("supported");
  });

  it("R-19 evidence-threshold remains not evaluable", () => {
    const result = assessRecommendation(assessmentDoc(), "rec-main");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(
      result.notEvaluableChecks.some(
        (c) => c.check === "evidence-threshold" && c.reason === "no-normative-evidence-threshold",
      ),
    ).toBe(true);
  });

  it("R-20 freshness remains not evaluable without normative policy", () => {
    const result = assessRecommendation(assessmentDoc(), "rec-main", {
      asOf: "2026-06-30T00:00:00Z",
    });
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(
      result.notEvaluableChecks.some(
        (c) => c.check === "freshness-policy" && c.reason === "no-normative-freshness-policy",
      ),
    ).toBe(true);
  });

  it("R-21 no universal insufficient-evidence derivation", () => {
    const result = assessRecommendation(assessmentDoc(), "rec-no-constraint");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.derivedStatus).not.toBe("insufficient-evidence");
    expect(result.derivedStatus).toBeUndefined();
  });

  it("R-22 no universal stale derivation", () => {
    const result = assessRecommendation(assessmentDoc(), "rec-main", {
      asOf: "2099-01-01T00:00:00Z",
    });
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.derivedStatus).not.toBe("stale");
  });

  it("R-23 no universal supported derivation", () => {
    const result = assessRecommendation(assessmentDoc(), "rec-main", {
      constraintEvaluations: [{ constraintId: "constraint-hard", violated: false }],
    });
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.derivedStatus).not.toBe("supported");
  });

  it("R-24 arbitrary policyId accepted as metadata without invented behavior", () => {
    const result = assessRecommendation(assessmentDoc(), "rec-main", {
      policyId: "org.example.custom-policy",
      constraintEvaluations: [{ constraintId: "constraint-hard", violated: false }],
    });
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.policyId).toBe("org.example.custom-policy");
    expect(result.derivedStatus).toBeUndefined();
  });

  it("R-25 default policy ID works without default-only whitelist", () => {
    const result = assessRecommendation(assessmentDoc(), "rec-main");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.policyId).toBe(DEFAULT_RECOMMENDATION_POLICY_ID);
  });

  it("R-26 invalid asOf RangeError", () => {
    expect(() => assessRecommendation(assessmentDoc(), "rec-main", { asOf: "nope" })).toThrow(
      RangeError,
    );
  });

  it("R-27 invalid evaluatedAt RangeError", () => {
    expect(() =>
      assessRecommendation(assessmentDoc(), "rec-main", { evaluatedAt: "nope" }),
    ).toThrow(RangeError);
  });

  it("R-28 no evaluatedAt generated automatically", () => {
    const result = assessRecommendation(assessmentDoc(), "rec-main");
    expect(result.found).toBe(true);
    if (!result.found) return;
    expect(result.evaluatedAt).toBeUndefined();
  });

  it("R-29 no Date.now", () => {
    const original = Date.now;
    let called = false;
    Date.now = () => {
      called = true;
      return original();
    };
    try {
      assessRecommendation(assessmentDoc(), "rec-main", {
        constraintEvaluations: [{ constraintId: "constraint-hard", violated: true }],
        asOf: "2026-06-30T00:00:00Z",
        evaluatedAt: "2026-06-30T14:00:00Z",
      });
      expect(called).toBe(false);
    } finally {
      Date.now = original;
    }
  });

  it("R-30 no mutation", () => {
    const doc = assessmentDoc();
    const before = structuredClone(doc);
    assessRecommendation(doc, "rec-main", {
      constraintEvaluations: [{ constraintId: "constraint-hard", violated: true }],
    });
    expect(doc).toEqual(before);
  });

  it("R-31 repeated same inputs → deep-equal result", () => {
    const doc = assessmentDoc();
    const options = {
      constraintEvaluations: [{ constraintId: "constraint-hard" as const, violated: true }],
      evaluatedAt: "2026-06-30T14:00:00Z",
    };
    expect(assessRecommendation(doc, "rec-main", options)).toEqual(
      assessRecommendation(doc, "rec-main", options),
    );
  });
});
