import { describe, expect, it } from "vitest";
import { isFactQualified, selectCurrentFactAssertions } from "../src/semantics/fact.js";
import {
  baseAssertion,
  classifiedAssertion,
  minimalDocument,
  validatedFact,
} from "./helpers/semantics-fixtures.js";

const ASOF = "2026-06-30T00:00:00Z";
const Q2_FROM = "2026-04-01T00:00:00Z";
const Q2_UNTIL = "2026-07-01T00:00:00Z";
const Q1_FROM = "2026-01-01T00:00:00Z";
const Q1_UNTIL = "2026-04-01T00:00:00Z";

describe("fact — isFactQualified", () => {
  it("16. validated + valid + policyId → Fact qualified", () => {
    expect(isFactQualified(validatedFact("a1"))).toBe(true);
  });

  it("17. validated + invalid → not Fact", () => {
    expect(isFactQualified(validatedFact("a1", {}, "policy-x", "invalid"))).toBe(false);
  });

  it("18. asserted → not Fact", () => {
    expect(isFactQualified(classifiedAssertion("a1", "asserted"))).toBe(false);
  });

  it("19. superseded → not Fact", () => {
    expect(isFactQualified(classifiedAssertion("a1", "superseded", { supersededBy: "a2" }))).toBe(
      false,
    );
  });

  it("20. retracted → not Fact", () => {
    expect(isFactQualified(classifiedAssertion("a1", "retracted"))).toBe(false);
  });

  it("25. arbitrary recorded policyId qualifies; not default-only", () => {
    expect(isFactQualified(validatedFact("a1", {}, "org.example.custom-fact-policy"))).toBe(true);
  });

  it("validated without validation metadata → not Fact", () => {
    const a = baseAssertion({ id: "a1", classification: "validated" });
    expect(isFactQualified(a)).toBe(false);
  });
});

describe("fact — selectCurrentFactAssertions", () => {
  it("19–20. superseded and retracted excluded from current Fact", () => {
    const doc = minimalDocument([
      classifiedAssertion("asrt-superseded", "superseded", {
        supersededBy: "asrt-replacement",
        validFrom: Q2_FROM,
        validUntil: Q2_UNTIL,
      }),
      validatedFact("asrt-replacement", {
        validFrom: Q2_FROM,
        validUntil: Q2_UNTIL,
      }),
      classifiedAssertion("asrt-retracted", "retracted", {
        validFrom: Q2_FROM,
        validUntil: Q2_UNTIL,
      }),
    ]);
    const facts = selectCurrentFactAssertions(doc, ASOF);
    expect(facts.map((a) => a.id)).toEqual(["asrt-replacement"]);
  });

  it("21. replacement must independently qualify", () => {
    const doc = minimalDocument([
      classifiedAssertion("asrt-old", "superseded", {
        supersededBy: "asrt-new",
        validFrom: Q2_FROM,
        validUntil: Q2_UNTIL,
      }),
      classifiedAssertion("asrt-new", "asserted", {
        validFrom: Q2_FROM,
        validUntil: Q2_UNTIL,
      }),
    ]);
    expect(selectCurrentFactAssertions(doc, ASOF)).toEqual([]);
  });

  it("22. Fact-qualified but inactive → not current Fact", () => {
    const doc = minimalDocument([
      validatedFact("asrt-q1", {
        validFrom: Q1_FROM,
        validUntil: Q1_UNTIL,
      }),
    ]);
    expect(selectCurrentFactAssertions(doc, ASOF)).toEqual([]);
  });

  it("23. multiple current Facts same subject/predicate → all returned", () => {
    const doc = minimalDocument([
      validatedFact("asrt-a", {
        predicate: "price",
        value: 100,
        validFrom: Q2_FROM,
        validUntil: Q2_UNTIL,
      }),
      validatedFact("asrt-b", {
        predicate: "price",
        value: 120,
        validFrom: Q2_FROM,
        validUntil: Q2_UNTIL,
      }),
    ]);
    const facts = selectCurrentFactAssertions(doc, ASOF);
    expect(facts.map((a) => a.id)).toEqual(["asrt-a", "asrt-b"]);
  });

  it("24. current Fact ordering preserves document Assertion order", () => {
    const doc = minimalDocument([
      validatedFact("asrt-z", { validFrom: Q2_FROM, validUntil: Q2_UNTIL }),
      validatedFact("asrt-a", { validFrom: Q2_FROM, validUntil: Q2_UNTIL }),
      validatedFact("asrt-m", { validFrom: Q2_FROM, validUntil: Q2_UNTIL }),
    ]);
    expect(selectCurrentFactAssertions(doc, ASOF).map((a) => a.id)).toEqual([
      "asrt-z",
      "asrt-a",
      "asrt-m",
    ]);
  });

  it("invalid asOf throws RangeError", () => {
    const doc = minimalDocument([validatedFact("a1")]);
    expect(() => selectCurrentFactAssertions(doc, "yesterday")).toThrow(RangeError);
  });

  it("asserted active assertion is not a current Fact", () => {
    const doc = minimalDocument([
      classifiedAssertion("asrt-asserted", "asserted", {
        validFrom: Q2_FROM,
        validUntil: Q2_UNTIL,
      }),
      validatedFact("asrt-fact", {
        validFrom: Q2_FROM,
        validUntil: Q2_UNTIL,
      }),
    ]);
    expect(selectCurrentFactAssertions(doc, ASOF).map((a) => a.id)).toEqual(["asrt-fact"]);
  });
});
