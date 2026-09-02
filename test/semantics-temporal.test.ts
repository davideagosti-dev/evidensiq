import { describe, expect, it } from "vitest";
import {
  isAssertionActiveAt,
  validityIntervalsOverlap,
} from "../src/semantics/temporal.js";
import { baseAssertion } from "./helpers/semantics-fixtures.js";

const T0 = "2026-04-01T00:00:00Z";
const T_MID = "2026-05-15T00:00:00Z";
const T1 = "2026-07-01T00:00:00Z";

describe("temporal — isAssertionActiveAt", () => {
  it("1. no bounds → active at any asOf", () => {
    const a = baseAssertion({ id: "a1" });
    expect(isAssertionActiveAt(a, T_MID)).toBe(true);
    expect(isAssertionActiveAt(a, "1970-01-01T00:00:00Z")).toBe(true);
    expect(isAssertionActiveAt(a, "9999-12-31T00:00:00Z")).toBe(true);
  });

  it("2. before validFrom → inactive", () => {
    const a = baseAssertion({
      id: "a1",
      validFrom: T0,
      validUntil: T1,
    });
    expect(isAssertionActiveAt(a, "2026-03-31T23:59:59Z")).toBe(false);
  });

  it("3. exactly validFrom → active", () => {
    const a = baseAssertion({
      id: "a1",
      validFrom: T0,
      validUntil: T1,
    });
    expect(isAssertionActiveAt(a, T0)).toBe(true);
  });

  it("4. inside interval → active", () => {
    const a = baseAssertion({
      id: "a1",
      validFrom: T0,
      validUntil: T1,
    });
    expect(isAssertionActiveAt(a, T_MID)).toBe(true);
  });

  it("5. exactly validUntil → inactive", () => {
    const a = baseAssertion({
      id: "a1",
      validFrom: T0,
      validUntil: T1,
    });
    expect(isAssertionActiveAt(a, T1)).toBe(false);
  });

  it("6. after validUntil → inactive", () => {
    const a = baseAssertion({
      id: "a1",
      validFrom: T0,
      validUntil: T1,
    });
    expect(isAssertionActiveAt(a, "2026-07-02T00:00:00Z")).toBe(false);
  });

  it("7. validFrom-only → active when asOf >= validFrom", () => {
    const a = baseAssertion({ id: "a1", validFrom: T0 });
    expect(isAssertionActiveAt(a, "2026-03-01T00:00:00Z")).toBe(false);
    expect(isAssertionActiveAt(a, T0)).toBe(true);
    expect(isAssertionActiveAt(a, T1)).toBe(true);
  });

  it("8. validUntil-only → active when asOf < validUntil", () => {
    const a = baseAssertion({ id: "a1", validUntil: T1 });
    expect(isAssertionActiveAt(a, "2020-01-01T00:00:00Z")).toBe(true);
    expect(isAssertionActiveAt(a, T_MID)).toBe(true);
    expect(isAssertionActiveAt(a, T1)).toBe(false);
  });

  it("13. invalid asOf throws RangeError", () => {
    const a = baseAssertion({ id: "a1", validFrom: T0, validUntil: T1 });
    expect(() => isAssertionActiveAt(a, "not-a-datetime")).toThrow(RangeError);
    expect(() => isAssertionActiveAt(a, "")).toThrow(RangeError);
  });

  it("malformed assertion bound throws RangeError (fail-closed)", () => {
    const a = baseAssertion({ id: "a1", validFrom: "bogus" });
    expect(() => isAssertionActiveAt(a, T_MID)).toThrow(RangeError);
  });

  it("14. no wall-clock dependency — same inputs always same result", () => {
    const a = baseAssertion({ id: "a1", validFrom: T0, validUntil: T1 });
    const first = isAssertionActiveAt(a, T_MID);
    const second = isAssertionActiveAt(a, T_MID);
    expect(first).toBe(second);
    expect(first).toBe(true);
  });

  it("15. observedAt does not affect valid-time", () => {
    const a = baseAssertion({
      id: "a1",
      validFrom: T0,
      validUntil: T1,
      observedAt: "2025-01-01T00:00:00Z",
    });
    expect(isAssertionActiveAt(a, T_MID)).toBe(true);
    expect(isAssertionActiveAt(a, "2025-01-01T00:00:00Z")).toBe(false);
  });
});

describe("temporal — validityIntervalsOverlap", () => {
  it("9. adjacent intervals do not overlap", () => {
    expect(
      validityIntervalsOverlap(
        { validFrom: "2026-01-01T00:00:00Z", validUntil: T0 },
        { validFrom: T0, validUntil: T1 },
      ),
    ).toBe(false);
  });

  it("10. contained intervals overlap", () => {
    expect(
      validityIntervalsOverlap(
        { validFrom: T0, validUntil: T1 },
        { validFrom: "2026-05-01T00:00:00Z", validUntil: "2026-06-01T00:00:00Z" },
      ),
    ).toBe(true);
  });

  it("11. identical intervals overlap", () => {
    expect(
      validityIntervalsOverlap(
        { validFrom: T0, validUntil: T1 },
        { validFrom: T0, validUntil: T1 },
      ),
    ).toBe(true);
  });

  it("12. fully unbounded intervals overlap", () => {
    expect(validityIntervalsOverlap({}, {})).toBe(true);
  });

  it("validFrom-only vs validUntil-only overlap when ranges intersect", () => {
    expect(
      validityIntervalsOverlap({ validFrom: T0 }, { validUntil: T1 }),
    ).toBe(true);
    expect(
      validityIntervalsOverlap({ validFrom: T1 }, { validUntil: T0 }),
    ).toBe(false);
  });

  it("invalid bound throws RangeError", () => {
    expect(() =>
      validityIntervalsOverlap({ validFrom: "nope" }, { validFrom: T0 }),
    ).toThrow(RangeError);
  });
});
