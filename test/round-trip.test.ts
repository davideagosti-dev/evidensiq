import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { JsonValue } from "../src/json.js";
import { isJsonValue, jsonEquals, parseJson, serializeJson } from "../src/parse.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function readFixture(relativePath: string): string {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function roundTrip(text: string): JsonValue {
  const parsed = parseJson(text);
  expect(parsed.ok).toBe(true);
  if (!parsed.ok) {
    throw new Error(parsed.error);
  }
  const serialized = serializeJson(parsed.value);
  const again = parseJson(serialized);
  expect(again.ok).toBe(true);
  if (!again.ok) {
    throw new Error(again.error);
  }
  expect(jsonEquals(parsed.value, again.value)).toBe(true);
  return again.value;
}

describe("JSON parse / serialize round-trip", () => {
  it("A: accepts legitimate JSON structures as JsonValue", () => {
    const value: JsonValue = {
      a: "text",
      b: 1,
      c: true,
      d: null,
      e: [1, "two", false, null, { nested: [] }],
    };
    expect(isJsonValue(value)).toBe(true);
    expect(jsonEquals(roundTrip(serializeJson(value)), value)).toBe(true);
  });

  it("B: excludes non-JSON runtime constructs at the parse boundary", () => {
    expect(isJsonValue(() => undefined)).toBe(false);
    expect(isJsonValue(Symbol("x"))).toBe(false);
    expect(isJsonValue(10n)).toBe(false);
    expect(isJsonValue(new Date("2026-01-01T00:00:00Z"))).toBe(false);
    expect(isJsonValue(undefined)).toBe(false);
  });

  it("C: optional values remain absent rather than becoming null", () => {
    const text = readFixture("fixtures/conformance/l3/l3-absent-optional-fields.json");
    const value = roundTrip(text);
    expect(value).toEqual({
      specVersion: "0.1",
      organizationId: "org-1",
      entities: [{ id: "org-1", type: "Organization" }],
    });
    expect(Object.hasOwn(value as object, "metadata")).toBe(false);
    const entities = (value as { entities: Array<Record<string, unknown>> }).entities;
    const entity = entities[0];
    expect(entity).toBeDefined();
    if (entity === undefined) {
      throw new Error("expected entity");
    }
    expect(Object.hasOwn(entity, "name")).toBe(false);
    expect(Object.hasOwn(entity, "description")).toBe(false);
    expect(JSON.stringify(value).includes('"name":null')).toBe(false);
  });

  it("D: DateTime strings remain unchanged through parse/serialize", () => {
    const text = readFixture("fixtures/conformance/l3/l3-utc-datetime.json");
    const original = parseJson(text);
    expect(original.ok).toBe(true);
    if (!original.ok) {
      throw new Error(original.error);
    }
    const roundTripped = roundTrip(text);
    expect(jsonEquals(original.value, roundTripped)).toBe(true);

    const assertions = (roundTripped as { assertions: Array<{ observedAt: string }> }).assertions;
    const first = assertions[0];
    expect(first?.observedAt).toBe("2026-06-01T00:00:00Z");
  });

  it("E: Unicode values round-trip", () => {
    const text = readFixture("fixtures/conformance/l3/l3-extensions-unicode-enums.json");
    const value = roundTrip(text);
    const entity = (
      value as {
        entities: Array<{ name?: string; extensions?: Record<string, JsonValue> }>;
      }
    ).entities[0];
    expect(entity?.name).toBe("Организация 北星");
    expect(entity?.extensions).toBeDefined();
    const assertion = (value as { assertions: Array<{ value: string }> }).assertions[0];
    expect(assertion?.value).toBe("アクティブ");
  });

  it("F: arrays retain order", () => {
    const text = readFixture("fixtures/conformance/l3/l3-array-and-key-order.json");
    const original = parseJson(text);
    expect(original.ok).toBe(true);
    if (!original.ok) {
      throw new Error(original.error);
    }
    const again = roundTrip(text);
    const leftIds = (original.value as { assertions: Array<{ id: string }> }).assertions.map(
      (item) => item.id,
    );
    const rightIds = (again as { assertions: Array<{ id: string }> }).assertions.map(
      (item) => item.id,
    );
    expect(rightIds).toEqual(leftIds);
  });

  it("G: object property order is not relied upon for semantic equality", () => {
    const a: JsonValue = { b: 2, a: 1 };
    const b: JsonValue = { a: 1, b: 2 };
    expect(jsonEquals(a, b)).toBe(true);
    expect(serializeJson(a) === serializeJson(b)).toBe(false);
  });

  it("H: safe integer round-trip", () => {
    const text = readFixture("fixtures/conformance/l3/l3-ieee754-numerics.json");
    const value = roundTrip(text);
    const assertions = (value as { assertions: Array<{ id: string; value: number }> }).assertions;
    const revenue = assertions.find((item) => item.id === "asrt-revenue");
    expect(revenue?.value).toBe(1450000);
    expect(Number.isSafeInteger(revenue?.value)).toBe(true);
  });

  it("I: representative floating-point round-trip", () => {
    const text = readFixture("fixtures/conformance/l3/l3-ieee754-numerics.json");
    const value = roundTrip(text);
    const assertions = (value as { assertions: Array<{ id: string; value: number }> }).assertions;
    const rateA = assertions.find((item) => item.id === "asrt-rate-a");
    const rateB = assertions.find((item) => item.id === "asrt-rate-b");
    expect(rateA?.value).toBe(4.5);
    expect(rateB?.value).toBe(8.2);
  });

  it("J: extensions round-trip", () => {
    const text = readFixture("fixtures/conformance/l3/l3-extensions-unicode-enums.json");
    const original = parseJson(text);
    expect(original.ok).toBe(true);
    if (!original.ok) {
      throw new Error(original.error);
    }
    const again = roundTrip(text);
    const leftExt = (original.value as { entities: Array<{ extensions?: JsonValue }> }).entities[0]
      ?.extensions;
    const rightExt = (again as { entities: Array<{ extensions?: JsonValue }> }).entities[0]
      ?.extensions;
    expect(leftExt).toBeDefined();
    expect(jsonEquals(leftExt as JsonValue, rightExt as JsonValue)).toBe(true);
  });

  it("K: externalIds round-trip", () => {
    const payload: JsonValue = {
      specVersion: "0.1",
      organizationId: "org-1",
      entities: [
        {
          id: "org-1",
          type: "Organization",
          externalIds: {
            "com.example.erp": "ERP-001",
            "com.example.crm": "CRM-Ω-42",
          },
        },
      ],
    };
    const again = roundTrip(serializeJson(payload));
    const externalIds = (
      again as {
        entities: Array<{ externalIds: Record<string, string> }>;
      }
    ).entities[0]?.externalIds;
    expect(externalIds).toEqual({
      "com.example.erp": "ERP-001",
      "com.example.crm": "CRM-Ω-42",
    });
  });

  it("L: nested Entity.properties round-trip", () => {
    const payload: JsonValue = {
      specVersion: "0.1",
      organizationId: "org-1",
      entities: [
        {
          id: "org-1",
          type: "Organization",
          properties: {
            region: "EU",
            nested: { score: 0.75, tags: ["a", "b"] },
          },
        },
      ],
    };
    const again = roundTrip(serializeJson(payload));
    const properties = (
      again as {
        entities: Array<{ properties: JsonValue }>;
      }
    ).entities[0]?.properties;
    expect(
      jsonEquals(properties as JsonValue, {
        region: "EU",
        nested: { score: 0.75, tags: ["a", "b"] },
      }),
    ).toBe(true);
  });

  it("M: Northstar JSON syntax-parses and round-trips without semantic mutation", () => {
    const text = readFixture("fixtures/northstar-manufacturing.json");
    const original = parseJson(text);
    expect(original.ok).toBe(true);
    if (!original.ok) {
      throw new Error(original.error);
    }
    const again = roundTrip(text);
    expect(jsonEquals(original.value, again)).toBe(true);
    // Explicit non-claim: this is syntax/JSON-tree only, not L1/L2/L4 conformance.
  });

  it("reports malformed JSON without claiming conformance", () => {
    const result = parseJson("{not-json");
    expect(result.ok).toBe(false);
    if (result.ok) {
      throw new Error("expected failure");
    }
    expect(result.error.length).toBeGreaterThan(0);
  });
});
