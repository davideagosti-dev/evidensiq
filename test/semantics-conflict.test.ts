import { describe, expect, it } from "vitest";
import type { Conflict } from "../src/model.js";
import { evaluateContradictionPreconditions } from "../src/semantics/conflict.js";
import { isFactQualified, selectCurrentFactAssertions } from "../src/semantics/fact.js";
import {
  classifiedAssertion,
  contradictionConflict,
  minimalDocument,
  validatedFact,
} from "./helpers/semantics-fixtures.js";

const ASOF = "2026-06-30T00:00:00Z";
const Q2_FROM = "2026-04-01T00:00:00Z";
const Q2_UNTIL = "2026-07-01T00:00:00Z";
const Q1_FROM = "2026-01-01T00:00:00Z";
const Q1_UNTIL = "2026-04-01T00:00:00Z";

describe("conflict — evaluateContradictionPreconditions", () => {
  it("26. explicit contradiction same s/p + overlap", () => {
    const a = validatedFact("asrt-1", {
      predicate: "capacityStatus",
      value: "constrained",
      validFrom: Q2_FROM,
      validUntil: Q2_UNTIL,
    });
    const b = classifiedAssertion("asrt-2", "asserted", {
      predicate: "capacityStatus",
      value: "normal",
      validFrom: Q2_FROM,
      validUntil: Q2_UNTIL,
    });
    const conflict = contradictionConflict("c1", ["asrt-1", "asrt-2"]);
    const doc = minimalDocument([a, b], [conflict]);
    const result = evaluateContradictionPreconditions(doc, conflict);
    expect(result).toEqual({
      conflictKind: "contradiction",
      status: "unresolved",
      subjectPredicateAligned: true,
      temporalPreconditionMet: true,
      contradictionPreconditionsMetExceptValue: true,
      valueIncompatibilityEvaluated: false,
    });
  });

  it("27. same s/p + no overlap → temporal precondition false", () => {
    const a = validatedFact("asrt-1", {
      predicate: "price",
      value: 100,
      validFrom: Q1_FROM,
      validUntil: Q1_UNTIL,
    });
    const b = validatedFact("asrt-2", {
      predicate: "price",
      value: 120,
      validFrom: Q2_FROM,
      validUntil: Q2_UNTIL,
    });
    const conflict = contradictionConflict("c1", ["asrt-1", "asrt-2"]);
    const doc = minimalDocument([a, b], [conflict]);
    const result = evaluateContradictionPreconditions(doc, conflict);
    expect(result.subjectPredicateAligned).toBe(true);
    expect(result.temporalPreconditionMet).toBe(false);
    expect(result.contradictionPreconditionsMetExceptValue).toBe(false);
    expect(result.valueIncompatibilityEvaluated).toBe(false);
  });

  it("28. subject mismatch", () => {
    const a = validatedFact("asrt-1", {
      subject: "entity-1",
      predicate: "price",
      validFrom: Q2_FROM,
      validUntil: Q2_UNTIL,
    });
    const b = validatedFact("asrt-2", {
      subject: "org-1",
      predicate: "price",
      validFrom: Q2_FROM,
      validUntil: Q2_UNTIL,
    });
    const conflict = contradictionConflict("c1", ["asrt-1", "asrt-2"]);
    const result = evaluateContradictionPreconditions(minimalDocument([a, b]), conflict);
    expect(result.subjectPredicateAligned).toBe(false);
    expect(result.contradictionPreconditionsMetExceptValue).toBe(false);
  });

  it("29. predicate mismatch", () => {
    const a = validatedFact("asrt-1", {
      predicate: "price",
      validFrom: Q2_FROM,
      validUntil: Q2_UNTIL,
    });
    const b = validatedFact("asrt-2", {
      predicate: "margin",
      validFrom: Q2_FROM,
      validUntil: Q2_UNTIL,
    });
    const conflict = contradictionConflict("c1", ["asrt-1", "asrt-2"]);
    const result = evaluateContradictionPreconditions(minimalDocument([a, b]), conflict);
    expect(result.subjectPredicateAligned).toBe(false);
    expect(result.temporalPreconditionMet).toBe(true);
    expect(result.contradictionPreconditionsMetExceptValue).toBe(false);
  });

  it("30. >2 Assertions with common temporal intersection", () => {
    const assertions = [
      validatedFact("asrt-1", {
        predicate: "price",
        value: 1,
        validFrom: "2026-04-01T00:00:00Z",
        validUntil: "2026-07-01T00:00:00Z",
      }),
      validatedFact("asrt-2", {
        predicate: "price",
        value: 2,
        validFrom: "2026-05-01T00:00:00Z",
        validUntil: "2026-08-01T00:00:00Z",
      }),
      validatedFact("asrt-3", {
        predicate: "price",
        value: 3,
        validFrom: "2026-03-01T00:00:00Z",
        validUntil: "2026-06-01T00:00:00Z",
      }),
    ];
    // Common ∩ = [2026-05-01, 2026-06-01)
    const conflict = contradictionConflict("c1", ["asrt-1", "asrt-2", "asrt-3"]);
    const result = evaluateContradictionPreconditions(
      minimalDocument(assertions),
      conflict,
    );
    expect(result.temporalPreconditionMet).toBe(true);
    expect(result.contradictionPreconditionsMetExceptValue).toBe(true);
  });

  it("31. >2 Assertions without common temporal intersection", () => {
    const assertions = [
      validatedFact("asrt-1", {
        predicate: "price",
        validFrom: "2026-01-01T00:00:00Z",
        validUntil: "2026-03-01T00:00:00Z",
      }),
      validatedFact("asrt-2", {
        predicate: "price",
        validFrom: "2026-02-01T00:00:00Z",
        validUntil: "2026-04-01T00:00:00Z",
      }),
      validatedFact("asrt-3", {
        predicate: "price",
        validFrom: "2026-05-01T00:00:00Z",
        validUntil: "2026-07-01T00:00:00Z",
      }),
    ];
    // Pairwise asrt-1∩asrt-2 nonempty, but common ∩ of all three empty
    const conflict = contradictionConflict("c1", ["asrt-1", "asrt-2", "asrt-3"]);
    const result = evaluateContradictionPreconditions(
      minimalDocument(assertions),
      conflict,
    );
    expect(result.subjectPredicateAligned).toBe(true);
    expect(result.temporalPreconditionMet).toBe(false);
    expect(result.contradictionPreconditionsMetExceptValue).toBe(false);
  });

  it("32–34. conflict status does not alter Fact qualification", () => {
    const fact = validatedFact("asrt-fact", {
      predicate: "capacityStatus",
      value: "constrained",
      validFrom: Q2_FROM,
      validUntil: Q2_UNTIL,
    });
    const other = classifiedAssertion("asrt-other", "asserted", {
      predicate: "capacityStatus",
      value: "normal",
      validFrom: Q2_FROM,
      validUntil: Q2_UNTIL,
    });
    for (const status of ["unresolved", "acknowledged", "resolved"] as const) {
      const conflict = contradictionConflict("c1", ["asrt-fact", "asrt-other"], status);
      const doc = minimalDocument([fact, other], [conflict]);
      expect(isFactQualified(fact)).toBe(true);
      expect(selectCurrentFactAssertions(doc, ASOF).map((a) => a.id)).toEqual(["asrt-fact"]);
      const result = evaluateContradictionPreconditions(doc, conflict);
      expect(result.status).toBe(status);
      expect(isFactQualified(fact)).toBe(true);
    }
  });

  it("35. preferredAssertionId does not alter current Fact selection", () => {
    const a = validatedFact("asrt-a", {
      predicate: "price",
      value: 100,
      validFrom: Q2_FROM,
      validUntil: Q2_UNTIL,
    });
    const b = validatedFact("asrt-b", {
      predicate: "price",
      value: 120,
      validFrom: Q2_FROM,
      validUntil: Q2_UNTIL,
    });
    const conflict: Conflict = {
      id: "c1",
      assertionIds: ["asrt-a", "asrt-b"],
      conflictKind: "contradiction",
      status: "resolved",
      resolution: { preferredAssertionId: "asrt-b", method: "manual" },
    };
    const doc = minimalDocument([a, b], [conflict]);
    expect(selectCurrentFactAssertions(doc, ASOF).map((x) => x.id)).toEqual([
      "asrt-a",
      "asrt-b",
    ]);
  });

  it("36. value incompatibility is NOT evaluated", () => {
    const a = validatedFact("asrt-1", {
      predicate: "price",
      value: 100,
      validFrom: Q2_FROM,
      validUntil: Q2_UNTIL,
    });
    const b = validatedFact("asrt-2", {
      predicate: "price",
      value: 100,
      validFrom: Q2_FROM,
      validUntil: Q2_UNTIL,
    });
    const conflict = contradictionConflict("c1", ["asrt-1", "asrt-2"]);
    const result = evaluateContradictionPreconditions(minimalDocument([a, b]), conflict);
    expect(result.contradictionPreconditionsMetExceptValue).toBe(true);
    expect(result.valueIncompatibilityEvaluated).toBe(false);
  });

  it("37. no auto conflict creation/discovery", () => {
    const doc = minimalDocument([
      validatedFact("asrt-a", {
        predicate: "price",
        value: 1,
        validFrom: Q2_FROM,
        validUntil: Q2_UNTIL,
      }),
      validatedFact("asrt-b", {
        predicate: "price",
        value: 2,
        validFrom: Q2_FROM,
        validUntil: Q2_UNTIL,
      }),
    ]);
    expect(doc.conflicts).toBeUndefined();
    expect(selectCurrentFactAssertions(doc, ASOF)).toHaveLength(2);
  });

  it("38–39. exact case-sensitive ID resolution; case-different IDs distinct", () => {
    const a = validatedFact("Asrt-1", {
      predicate: "price",
      validFrom: Q2_FROM,
      validUntil: Q2_UNTIL,
    });
    const b = validatedFact("asrt-1", {
      predicate: "price",
      validFrom: Q2_FROM,
      validUntil: Q2_UNTIL,
    });
    const conflict = contradictionConflict("c1", ["Asrt-1", "asrt-1"]);
    const result = evaluateContradictionPreconditions(minimalDocument([a, b]), conflict);
    expect(result.contradictionPreconditionsMetExceptValue).toBe(true);

    const missingCase = contradictionConflict("c2", ["ASRT-1", "asrt-1"]);
    const miss = evaluateContradictionPreconditions(minimalDocument([a, b]), missingCase);
    expect(miss.subjectPredicateAligned).toBe(false);
    expect(miss.temporalPreconditionMet).toBe(false);
    expect(miss.contradictionPreconditionsMetExceptValue).toBe(false);
  });

  it("40. externalIds cannot resolve conflict members", () => {
    const a = validatedFact("asrt-internal", {
      predicate: "price",
      validFrom: Q2_FROM,
      validUntil: Q2_UNTIL,
    });
    const withExternal = {
      ...a,
      id: "asrt-other",
      externalIds: { "com.example": "asrt-missing" },
    };
    const conflict = contradictionConflict("c1", ["asrt-missing", "asrt-other"]);
    const result = evaluateContradictionPreconditions(
      minimalDocument([withExternal]),
      conflict,
    );
    expect(result.subjectPredicateAligned).toBe(false);
    expect(result.temporalPreconditionMet).toBe(false);
    expect(result.contradictionPreconditionsMetExceptValue).toBe(false);
  });

  it("uncertainty kind does not set contradictionPreconditionsMetExceptValue", () => {
    const a = validatedFact("asrt-1", {
      predicate: "price",
      validFrom: Q2_FROM,
      validUntil: Q2_UNTIL,
    });
    const b = validatedFact("asrt-2", {
      predicate: "price",
      validFrom: Q2_FROM,
      validUntil: Q2_UNTIL,
    });
    const conflict: Conflict = {
      id: "c1",
      assertionIds: ["asrt-1", "asrt-2"],
      conflictKind: "uncertainty",
      status: "unresolved",
    };
    const result = evaluateContradictionPreconditions(minimalDocument([a, b]), conflict);
    expect(result.subjectPredicateAligned).toBe(true);
    expect(result.temporalPreconditionMet).toBe(true);
    expect(result.contradictionPreconditionsMetExceptValue).toBe(false);
    expect(result.valueIncompatibilityEvaluated).toBe(false);
  });
});
