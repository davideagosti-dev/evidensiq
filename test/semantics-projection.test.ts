import { describe, expect, it } from "vitest";
import { projectBusinessContext } from "../src/semantics/projection.js";
import {
  ASOF,
  Q1_FROM,
  Q1_UNTIL,
  Q2_FROM,
  Q2_UNTIL,
  SUBJECT_ID,
  ORG_ID,
  EVIDENCE_ID,
  SOURCE_ID,
  classifiedAssertion,
  contradictionConflict,
  contextDocument,
  depthChainDocument,
  entity,
  evidence,
  hardConstraint,
  inference,
  recommendation,
  signal,
  validatedFact,
} from "./helpers/projection-fixtures.js";

describe("projectBusinessContext — temporal / Fact boundary", () => {
  const temporalDoc = contextDocument({
    entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID), entity("other")],
    assertions: [
      validatedFact("asrt-q2", {
        subject: SUBJECT_ID,
        validFrom: Q2_FROM,
        validUntil: Q2_UNTIL,
      }),
      validatedFact("asrt-q1", {
        subject: SUBJECT_ID,
        validFrom: Q1_FROM,
        validUntil: Q1_UNTIL,
      }),
      classifiedAssertion("asrt-asserted-active", "asserted", {
        subject: SUBJECT_ID,
        validFrom: Q2_FROM,
        validUntil: Q2_UNTIL,
      }),
      classifiedAssertion("asrt-superseded-active", "superseded", {
        subject: SUBJECT_ID,
        supersededBy: "asrt-q2",
        validFrom: Q2_FROM,
        validUntil: Q2_UNTIL,
      }),
      validatedFact("asrt-other-subject", {
        subject: "other",
        validFrom: Q2_FROM,
        validUntil: Q2_UNTIL,
      }),
    ],
  });

  it("P-01 valid asOf filters active Assertions", () => {
    const result = projectBusinessContext(temporalDoc, {
      entityIds: [SUBJECT_ID],
      asOf: ASOF,
    });
    const ids = (result.assertions ?? []).map((a) => a.id);
    expect(ids).toContain("asrt-q2");
    expect(ids).not.toContain("asrt-q1");
  });

  it("P-02 absent asOf applies no temporal filter", () => {
    const result = projectBusinessContext(temporalDoc, { entityIds: [SUBJECT_ID] });
    const ids = (result.assertions ?? []).map((a) => a.id);
    expect(ids).toContain("asrt-q2");
    expect(ids).toContain("asrt-q1");
  });

  it("P-03 invalid asOf throws RangeError", () => {
    expect(() =>
      projectBusinessContext(temporalDoc, { entityIds: [SUBJECT_ID], asOf: "not-a-date" }),
    ).toThrow(RangeError);
  });

  it("P-04 active asserted/non-Fact Assertion remains projected", () => {
    const result = projectBusinessContext(temporalDoc, {
      entityIds: [SUBJECT_ID],
      asOf: ASOF,
    });
    expect((result.assertions ?? []).map((a) => a.id)).toContain("asrt-asserted-active");
  });

  it("P-05 inactive historical Assertion excluded", () => {
    const result = projectBusinessContext(temporalDoc, {
      entityIds: [SUBJECT_ID],
      asOf: ASOF,
    });
    expect((result.assertions ?? []).map((a) => a.id)).not.toContain("asrt-q1");
  });

  it("P-06 projection does not become Fact-only", () => {
    const result = projectBusinessContext(temporalDoc, {
      entityIds: [SUBJECT_ID],
      asOf: ASOF,
    });
    const ids = (result.assertions ?? []).map((a) => a.id);
    expect(ids).toContain("asrt-asserted-active");
    expect(ids).toContain("asrt-superseded-active");
  });

  it("P-07 multiple simultaneous Facts retained", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID)],
      assertions: [
        validatedFact("fact-a", {
          subject: SUBJECT_ID,
          predicate: "margin",
          validFrom: Q2_FROM,
          validUntil: Q2_UNTIL,
        }),
        validatedFact("fact-b", {
          subject: SUBJECT_ID,
          predicate: "revenue",
          validFrom: Q2_FROM,
          validUntil: Q2_UNTIL,
        }),
      ],
    });
    const result = projectBusinessContext(doc, { entityIds: [SUBJECT_ID], asOf: ASOF });
    expect((result.assertions ?? []).map((a) => a.id)).toEqual(["fact-a", "fact-b"]);
  });
});

describe("projectBusinessContext — entities / relations / depth", () => {
  it("P-08 entityIds exact seed inclusion", () => {
    const doc = depthChainDocument();
    const result = projectBusinessContext(doc, { entityIds: ["e1"] });
    expect((result.entities ?? []).map((e) => e.id)).toEqual(["e1"]);
  });

  it("P-09 absent entityIds seeds all Entities", () => {
    const doc = depthChainDocument();
    const result = projectBusinessContext(doc, {});
    expect((result.entities ?? []).map((e) => e.id)).toEqual((doc.entities ?? []).map((e) => e.id));
  });

  it("P-10 maxDepth 0", () => {
    const doc = depthChainDocument();
    const result = projectBusinessContext(doc, {
      entityIds: ["e1"],
      relationTraversal: { maxDepth: 0 },
    });
    expect((result.entities ?? []).map((e) => e.id)).toEqual(["e1"]);
    expect(result.relations).toBeUndefined();
  });

  it("P-11 maxDepth 1", () => {
    const doc = depthChainDocument();
    const result = projectBusinessContext(doc, {
      entityIds: ["e1"],
      relationTraversal: { maxDepth: 1 },
    });
    expect((result.entities ?? []).map((e) => e.id)).toEqual(["e1", "e2"]);
  });

  it("P-12 maxDepth 2", () => {
    const doc = depthChainDocument();
    const result = projectBusinessContext(doc, {
      entityIds: ["e1"],
      relationTraversal: { maxDepth: 2 },
    });
    expect((result.entities ?? []).map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
  });

  it("P-13 maxDepth 3", () => {
    const doc = depthChainDocument();
    const result = projectBusinessContext(doc, {
      entityIds: ["e1"],
      relationTraversal: { maxDepth: 3 },
    });
    expect((result.entities ?? []).map((e) => e.id)).toEqual(["e1", "e2", "e3", "e4"]);
  });

  it("P-14 undirected reachability", () => {
    const doc = depthChainDocument();
    const result = projectBusinessContext(doc, {
      entityIds: ["e2"],
      relationTraversal: { maxDepth: 1 },
    });
    expect((result.entities ?? []).map((e) => e.id).sort()).toEqual(["e1", "e2", "e3"]);
  });

  it("P-15 relation included iff both endpoints included", () => {
    const doc = depthChainDocument();
    const result = projectBusinessContext(doc, {
      entityIds: ["e1"],
      relationTraversal: { maxDepth: 1 },
    });
    expect((result.relations ?? []).map((r) => r.id)).toEqual(["r12"]);
  });

  it("P-16 unrelated Relations excluded", () => {
    const doc = depthChainDocument();
    const result = projectBusinessContext(doc, {
      entityIds: ["e1"],
      relationTraversal: { maxDepth: 3 },
    });
    expect((result.relations ?? []).map((r) => r.id)).not.toContain("r-unrelated");
  });

  it("P-17 document Entity ordering", () => {
    const doc = depthChainDocument();
    const result = projectBusinessContext(doc, {
      entityIds: ["e4", "e1"],
      relationTraversal: { maxDepth: 3 },
    });
    expect((result.entities ?? []).map((e) => e.id)).toEqual(["e1", "e2", "e3", "e4"]);
  });

  it("P-18 document Relation ordering", () => {
    const doc = depthChainDocument();
    const result = projectBusinessContext(doc, {
      entityIds: ["e1"],
      relationTraversal: { maxDepth: 3 },
    });
    expect((result.relations ?? []).map((r) => r.id)).toEqual(["r12", "r23", "r34"]);
  });

  it("P-19 Assertion ordering", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID)],
      assertions: [
        validatedFact("a1", { subject: SUBJECT_ID }),
        validatedFact("a2", { subject: SUBJECT_ID }),
        validatedFact("a3", { subject: SUBJECT_ID }),
      ],
    });
    const result = projectBusinessContext(doc, { entityIds: [SUBJECT_ID] });
    expect((result.assertions ?? []).map((a) => a.id)).toEqual(["a1", "a2", "a3"]);
  });
});

describe("projectBusinessContext — reference closure", () => {
  it("P-20 Evidence closure from Assertions", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID)],
      evidence: [evidence("ev-a"), evidence("ev-b"), evidence("ev-unused")],
      assertions: [
        validatedFact("a1", { subject: SUBJECT_ID, evidenceIds: ["ev-a"] }),
        validatedFact("a2", { subject: SUBJECT_ID, evidenceIds: ["ev-b"] }),
      ],
    });
    const result = projectBusinessContext(doc, { entityIds: [SUBJECT_ID] });
    expect((result.evidence ?? []).map((e) => e.id)).toEqual(["ev-a", "ev-b"]);
  });

  it("P-21 Signal inclusion through explicit Evidence references", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID)],
      evidence: [evidence("ev-a"), evidence("ev-other")],
      assertions: [validatedFact("a1", { subject: SUBJECT_ID, evidenceIds: ["ev-a"] })],
      signals: [signal("sig-hit", ["ev-a"]), signal("sig-miss", ["ev-other"])],
    });
    const result = projectBusinessContext(doc, { entityIds: [SUBJECT_ID] });
    expect((result.signals ?? []).map((s) => s.id)).toEqual(["sig-hit"]);
  });

  it("P-22 unrelated Signal excluded", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID)],
      evidence: [evidence("ev-a"), evidence("ev-other")],
      assertions: [validatedFact("a1", { subject: SUBJECT_ID, evidenceIds: ["ev-a"] })],
      signals: [signal("sig-miss", ["ev-other"])],
    });
    const result = projectBusinessContext(doc, { entityIds: [SUBJECT_ID] });
    expect(result.signals).toBeUndefined();
  });

  it("P-23 Inference direct basedOn inclusion", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID)],
      evidence: [evidence("ev-a")],
      assertions: [validatedFact("a1", { subject: SUBJECT_ID, evidenceIds: ["ev-a"] })],
      signals: [signal("sig-1", ["ev-a"])],
      inferences: [inference("inf-1", ["sig-1"]), inference("inf-miss", ["sig-missing"])],
    });
    const result = projectBusinessContext(doc, { entityIds: [SUBJECT_ID] });
    expect((result.inferences ?? []).map((i) => i.id)).toEqual(["inf-1"]);
  });

  it("P-24 transitive Inference closure", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID)],
      evidence: [evidence("ev-a")],
      assertions: [validatedFact("a1", { subject: SUBJECT_ID, evidenceIds: ["ev-a"] })],
      signals: [signal("sig-1", ["ev-a"])],
      inferences: [
        inference("inf-root", ["sig-1"]),
        inference("inf-child", ["inf-root"]),
        inference("inf-grand", ["inf-child"]),
      ],
    });
    const result = projectBusinessContext(doc, { entityIds: [SUBJECT_ID] });
    expect((result.inferences ?? []).map((i) => i.id)).toEqual([
      "inf-root",
      "inf-child",
      "inf-grand",
    ]);
  });

  it("P-25 Inference cycle terminates safely", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID)],
      evidence: [evidence("ev-a")],
      assertions: [validatedFact("a1", { subject: SUBJECT_ID, evidenceIds: ["ev-a"] })],
      signals: [signal("sig-1", ["ev-a"])],
      inferences: [inference("inf-a", ["sig-1", "inf-b"]), inference("inf-b", ["inf-a"])],
    });
    const result = projectBusinessContext(doc, { entityIds: [SUBJECT_ID] });
    expect((result.inferences ?? []).map((i) => i.id).sort()).toEqual(["inf-a", "inf-b"]);
  });

  it("P-26 Recommendation inclusion through Evidence", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID)],
      evidence: [evidence("ev-a"), evidence("ev-other")],
      assertions: [validatedFact("a1", { subject: SUBJECT_ID, evidenceIds: ["ev-a"] })],
      recommendations: [
        recommendation("rec-hit", { status: "candidate", evidenceIds: ["ev-a"] }),
        recommendation("rec-miss", { status: "candidate", evidenceIds: ["ev-other"] }),
      ],
    });
    const result = projectBusinessContext(doc, { entityIds: [SUBJECT_ID] });
    expect((result.recommendations ?? []).map((r) => r.id)).toEqual(["rec-hit"]);
  });

  it("P-27 Recommendation inclusion through Inference", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID)],
      evidence: [evidence("ev-a")],
      assertions: [validatedFact("a1", { subject: SUBJECT_ID, evidenceIds: ["ev-a"] })],
      signals: [signal("sig-1", ["ev-a"])],
      inferences: [inference("inf-1", ["sig-1"])],
      recommendations: [
        recommendation("rec-hit", { status: "candidate", inferenceIds: ["inf-1"] }),
      ],
    });
    const result = projectBusinessContext(doc, { entityIds: [SUBJECT_ID] });
    expect((result.recommendations ?? []).map((r) => r.id)).toEqual(["rec-hit"]);
  });

  it("P-28 Recommendation inclusion through Constraint Entity", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), hardConstraint("constraint-1"), entity("other")],
      recommendations: [
        recommendation("rec-hit", {
          status: "candidate",
          constraintIds: ["constraint-1"],
        }),
        recommendation("rec-miss", {
          status: "candidate",
          constraintIds: ["missing-constraint"],
        }),
      ],
    });
    const result = projectBusinessContext(doc, { entityIds: ["constraint-1"] });
    expect((result.recommendations ?? []).map((r) => r.id)).toEqual(["rec-hit"]);
  });

  it("P-29 unrelated Recommendation excluded", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID), entity("other")],
      evidence: [evidence("ev-a"), evidence("ev-other")],
      assertions: [validatedFact("a1", { subject: SUBJECT_ID, evidenceIds: ["ev-a"] })],
      recommendations: [
        recommendation("rec-miss", { status: "candidate", evidenceIds: ["ev-other"] }),
      ],
    });
    const result = projectBusinessContext(doc, { entityIds: [SUBJECT_ID] });
    expect(result.recommendations).toBeUndefined();
  });
});

describe("projectBusinessContext — conflicts", () => {
  const conflictDoc = contextDocument({
    entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID), entity("other")],
    assertions: [
      validatedFact("asrt-a", { subject: SUBJECT_ID, predicate: "capacity", value: "low" }),
      classifiedAssertion("asrt-b", "asserted", {
        subject: SUBJECT_ID,
        predicate: "capacity",
        value: "high",
      }),
      validatedFact("asrt-other", { subject: "other" }),
    ],
    conflicts: [
      contradictionConflict("conflict-relevant", ["asrt-a", "asrt-b"], "unresolved"),
      contradictionConflict("conflict-resolved", ["asrt-a", "asrt-b"], "resolved", {
        resolution: { preferredAssertionId: "asrt-a", method: "manual" },
      }),
      contradictionConflict("conflict-unrelated", ["asrt-other"], "unresolved"),
    ],
  });

  it("P-30 includeConflicts true includes relevant unresolved Conflict", () => {
    const result = projectBusinessContext(conflictDoc, {
      entityIds: [SUBJECT_ID],
      includeConflicts: true,
    });
    expect((result.conflicts ?? []).map((c) => c.id)).toContain("conflict-relevant");
  });

  it("P-31 includeConflicts false omits Conflict only", () => {
    const result = projectBusinessContext(conflictDoc, {
      entityIds: [SUBJECT_ID],
      includeConflicts: false,
    });
    expect(result.conflicts).toBeUndefined();
    expect((result.assertions ?? []).length).toBeGreaterThan(0);
  });

  it("P-32 includeConflicts absent omits Conflict", () => {
    const result = projectBusinessContext(conflictDoc, { entityIds: [SUBJECT_ID] });
    expect(result.conflicts).toBeUndefined();
  });

  it("P-33 conflicting Assertions remain", () => {
    const result = projectBusinessContext(conflictDoc, {
      entityIds: [SUBJECT_ID],
      includeConflicts: true,
    });
    const ids = (result.assertions ?? []).map((a) => a.id);
    expect(ids).toContain("asrt-a");
    expect(ids).toContain("asrt-b");
  });

  it("P-34 unrelated Conflict excluded", () => {
    const result = projectBusinessContext(conflictDoc, {
      entityIds: [SUBJECT_ID],
      includeConflicts: true,
    });
    expect((result.conflicts ?? []).map((c) => c.id)).not.toContain("conflict-unrelated");
  });

  it("P-35 resolved Conflict excluded", () => {
    const result = projectBusinessContext(conflictDoc, {
      entityIds: [SUBJECT_ID],
      includeConflicts: true,
    });
    expect((result.conflicts ?? []).map((c) => c.id)).not.toContain("conflict-resolved");
  });

  it("P-36 preferredAssertionId does not remove/select Assertion", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID)],
      assertions: [
        validatedFact("asrt-a", { subject: SUBJECT_ID, predicate: "x", value: 1 }),
        classifiedAssertion("asrt-b", "asserted", {
          subject: SUBJECT_ID,
          predicate: "x",
          value: 2,
        }),
      ],
      conflicts: [
        contradictionConflict("c1", ["asrt-a", "asrt-b"], "unresolved", {
          resolution: { preferredAssertionId: "asrt-a" },
        }),
      ],
    });
    const result = projectBusinessContext(doc, {
      entityIds: [SUBJECT_ID],
      includeConflicts: true,
    });
    expect((result.assertions ?? []).map((a) => a.id)).toEqual(["asrt-a", "asrt-b"]);
  });
});

describe("projectBusinessContext — identity / noop fields / clock", () => {
  it("P-37 exact ID case sensitivity", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity("EntityA"), entity("entitya")],
    });
    const result = projectBusinessContext(doc, { entityIds: ["EntityA"] });
    expect((result.entities ?? []).map((e) => e.id)).toEqual(["EntityA"]);
  });

  it("P-38 externalIds ignored for resolution", () => {
    const doc = contextDocument({
      entities: [
        entity(ORG_ID, "Organization"),
        entity("internal-1", "Product", { externalIds: { erp: "seed-alias" } }),
        entity("seed-alias"),
      ],
    });
    const result = projectBusinessContext(doc, { entityIds: ["seed-alias"] });
    expect((result.entities ?? []).map((e) => e.id)).toEqual(["seed-alias"]);
  });

  it("P-39 unknown seed ID contributes nothing", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID)],
    });
    const result = projectBusinessContext(doc, { entityIds: ["unknown-id"] });
    expect(result.entities).toBeUndefined();
  });

  it("P-40 extensions preserved on included objects", () => {
    const doc = contextDocument({
      entities: [
        entity(ORG_ID, "Organization"),
        entity(SUBJECT_ID, "Product", {
          extensions: { "com.example.tag": "keep-me" },
        }),
      ],
    });
    const result = projectBusinessContext(doc, { entityIds: [SUBJECT_ID] });
    expect(result.entities?.[0]?.extensions).toEqual({ "com.example.tag": "keep-me" });
  });

  it("P-41 objective does not create textual filtering", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity("alpha"), entity("beta")],
    });
    const result = projectBusinessContext(doc, {
      objective: "only include beta please",
      entityIds: ["alpha"],
    });
    expect((result.entities ?? []).map((e) => e.id)).toEqual(["alpha"]);
  });

  it("P-42 domains do not create textual filtering", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity("alpha"), entity("beta")],
    });
    const result = projectBusinessContext(doc, {
      domains: ["beta-domain"],
      entityIds: ["alpha"],
    });
    expect((result.entities ?? []).map((e) => e.id)).toEqual(["alpha"]);
  });

  it("P-43 ordering field does not invent ordering behavior", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity("z"), entity("a")],
    });
    const result = projectBusinessContext(doc, {
      ordering: "alphabetical",
      entityIds: ["z", "a"],
    });
    expect((result.entities ?? []).map((e) => e.id)).toEqual(["z", "a"]);
  });

  it("P-44 evidencePolicy does not invent filtering", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID)],
      evidence: [evidence("ev-a"), evidence("ev-b")],
      assertions: [validatedFact("a1", { subject: SUBJECT_ID, evidenceIds: ["ev-a", "ev-b"] })],
    });
    const result = projectBusinessContext(doc, {
      entityIds: [SUBJECT_ID],
      evidencePolicy: "exclude-all",
    });
    expect((result.evidence ?? []).map((e) => e.id)).toEqual(["ev-a", "ev-b"]);
  });

  it("P-45 sizeLimit is no-op", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity("e1"), entity("e2"), entity("e3")],
    });
    const result = projectBusinessContext(doc, {
      entityIds: ["e1", "e2", "e3"],
      sizeLimit: { maxItems: 1 },
    });
    expect((result.entities ?? []).map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
  });

  it("P-46 no false truncated metadata", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID)],
    });
    const result = projectBusinessContext(doc, {
      entityIds: [SUBJECT_ID],
      sizeLimit: { maxItems: 1 },
    });
    expect(result.truncated).toBeUndefined();
    expect(result.truncationReason).toBeUndefined();
  });

  it("P-47 result.asOf copied when present", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID)],
    });
    const result = projectBusinessContext(doc, { entityIds: [SUBJECT_ID], asOf: ASOF });
    expect(result.asOf).toBe(ASOF);
  });

  it("P-48 projectedAt caller supplied only", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID)],
    });
    const result = projectBusinessContext(
      doc,
      { entityIds: [SUBJECT_ID] },
      { projectedAt: "2026-06-30T14:00:00Z" },
    );
    expect(result.projectedAt).toBe("2026-06-30T14:00:00Z");
  });

  it("P-49 invalid projectedAt RangeError", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID)],
    });
    expect(() =>
      projectBusinessContext(doc, { entityIds: [SUBJECT_ID] }, { projectedAt: "bad" }),
    ).toThrow(RangeError);
  });

  it("P-50 no projectedAt generated automatically", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID)],
    });
    const result = projectBusinessContext(doc, { entityIds: [SUBJECT_ID] });
    expect(result.projectedAt).toBeUndefined();
  });

  it("P-51 no document mutation", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID)],
      assertions: [validatedFact("a1", { subject: SUBJECT_ID })],
    });
    const before = structuredClone(doc);
    projectBusinessContext(doc, {
      entityIds: [SUBJECT_ID],
      relationTraversal: { maxDepth: 2 },
      includeConflicts: true,
    });
    expect(doc).toEqual(before);
  });

  it("P-52 repeated identical input produces deep-equal output", () => {
    const doc = contextDocument({
      entities: [entity(ORG_ID, "Organization"), entity(SUBJECT_ID)],
      evidence: [evidence(EVIDENCE_ID, SOURCE_ID)],
      assertions: [validatedFact("a1", { subject: SUBJECT_ID, evidenceIds: [EVIDENCE_ID] })],
    });
    const request = { entityIds: [SUBJECT_ID], asOf: ASOF };
    const a = projectBusinessContext(doc, request);
    const b = projectBusinessContext(doc, request);
    expect(a).toEqual(b);
  });
});
