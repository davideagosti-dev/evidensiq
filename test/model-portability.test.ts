import { describe, expectTypeOf, it } from "vitest";
import type { JsonPrimitive, JsonValue } from "../src/json.js";
import type {
  Assertion,
  BusinessContextDocument,
  Conflict,
  Entity,
  Evidence,
  Recommendation,
  Relation,
  Source,
} from "../src/model.js";

describe("model portability (type-level)", () => {
  it("JsonValue accepts legitimate JSON structures", () => {
    expectTypeOf<JsonPrimitive>().toEqualTypeOf<string | number | boolean | null>();
    const sample: JsonValue = {
      text: "ok",
      n: 1,
      flag: false,
      empty: null,
      list: [1, "x", true, null],
      nested: { a: 1 },
    };
    expectTypeOf(sample).toMatchTypeOf<JsonValue>();
  });

  it("excludes non-JSON constructs where statically possible", () => {
    // @ts-expect-error functions are not JsonValue
    const _fn: JsonValue = () => undefined;
    // @ts-expect-error symbols are not JsonValue
    const _sym: JsonValue = Symbol("x");
    // @ts-expect-error bigint is not JsonValue
    const _big: JsonValue = 1n;
    // @ts-expect-error Date is not JsonValue
    const _date: JsonValue = new Date();
    void _fn;
    void _sym;
    void _big;
    void _date;
  });

  it("preserves absent optional fields under exactOptionalPropertyTypes", () => {
    const entity: Entity = { id: "org-1", type: "Organization" };
    expectTypeOf(entity).toMatchTypeOf<Entity>();
    // @ts-expect-error explicit undefined is not assignable with exactOptionalPropertyTypes
    const _bad: Entity = { id: "org-1", type: "Organization", name: undefined };
    void _bad;
  });

  it("uses schema discriminators only where defined", () => {
    expectTypeOf<Source["type"]>().toEqualTypeOf<"Source">();
    expectTypeOf<Evidence["type"]>().toEqualTypeOf<"Evidence">();
    expectTypeOf<Assertion["type"]>().toEqualTypeOf<"Assertion">();
    expectTypeOf<Recommendation["type"]>().toEqualTypeOf<"Recommendation">();
    expectTypeOf<Conflict>().not.toHaveProperty("type");
  });

  it("keeps Entity.type and Relation.type open for extensions", () => {
    const entity: Entity = { id: "x", type: "CustomDomainType" };
    const relation: Relation = {
      id: "r1",
      from: "a",
      to: "b",
      type: "com.example.customRelation",
    };
    expectTypeOf(entity.type).toMatchTypeOf<string>();
    expectTypeOf(relation.type).toMatchTypeOf<string>();
  });

  it("models Assertion.value as JsonValue", () => {
    expectTypeOf<Assertion["value"]>().toEqualTypeOf<JsonValue>();
  });

  it("models BusinessContextDocument without facts collection", () => {
    expectTypeOf<BusinessContextDocument>().toHaveProperty("assertions");
    expectTypeOf<BusinessContextDocument>().not.toHaveProperty("facts");
  });

  it("DateTime fields remain strings", () => {
    expectTypeOf<Assertion["observedAt"]>().toEqualTypeOf<string>();
  });
});
