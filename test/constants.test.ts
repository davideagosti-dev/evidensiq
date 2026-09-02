import { describe, expect, it } from "vitest";
import {
  CORE_RELATION_TYPES,
  DEFAULT_FACT_POLICY_ID,
  DEFAULT_RECOMMENDATION_POLICY_ID,
  KNOWN_ENTITY_TYPES,
  SPEC_VERSION,
} from "../src/constants.js";

describe("normative constants", () => {
  it("exports Phase 1 specVersion", () => {
    expect(SPEC_VERSION).toBe("0.1");
  });

  it("exports default Fact policy ID", () => {
    expect(DEFAULT_FACT_POLICY_ID).toBe("evidensiq.default-fact-v0.1");
  });

  it("exports approved recommendation policy ID", () => {
    expect(DEFAULT_RECOMMENDATION_POLICY_ID).toBe("evidensiq.default-recommendation-v0.1");
  });

  it("exports immutable core relation vocabulary", () => {
    expect([...CORE_RELATION_TYPES]).toEqual([
      "targets",
      "acquiredVia",
      "produces",
      "measures",
      "constrains",
      "competesWith",
      "partOf",
    ]);
  });

  it("exports known entity type literals without closing the wire type", () => {
    expect(KNOWN_ENTITY_TYPES).toContain("Organization");
    expect(KNOWN_ENTITY_TYPES).toContain("Constraint");
  });
});
