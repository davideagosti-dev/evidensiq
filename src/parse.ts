/**
 * Minimal JSON syntax parse / serialize boundary.
 *
 * Success means JSON syntax + JSON-safe tree shape only.
 * Does NOT claim L1/L2/L3/L4 conformance.
 */

import type { JsonObject, JsonValue } from "./json.js";

export type JsonParseSuccess = {
  readonly ok: true;
  readonly value: JsonValue;
};

export type JsonParseFailure = {
  readonly ok: false;
  readonly error: string;
};

export type JsonParseResult = JsonParseSuccess | JsonParseFailure;

function isPlainObject(value: object): boolean {
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/**
 * Runtime guard for JSON-safe values.
 * Rejects functions, symbols, bigint, Date, and other non-JSON objects.
 */
export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) {
    return true;
  }

  if (typeof value === "string" || typeof value === "boolean") {
    return true;
  }
  if (typeof value === "number") {
    return true;
  }
  if (
    typeof value === "undefined" ||
    typeof value === "function" ||
    typeof value === "symbol" ||
    typeof value === "bigint"
  ) {
    return false;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      if (!isJsonValue(item)) {
        return false;
      }
    }
    return true;
  }

  if (typeof value === "object") {
    if (!isPlainObject(value)) {
      return false;
    }
    const record = value as Record<string, unknown>;
    for (const key of Reflect.ownKeys(record)) {
      if (typeof key !== "string") {
        return false;
      }
      if (!isJsonValue(record[key])) {
        return false;
      }
    }
    return true;
  }

  return false;
}

/**
 * Parse a JSON text string into a JSON-safe value.
 * Malformed JSON or non-JSON-safe trees yield ok: false.
 */
export function parseJson(text: string): JsonParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Malformed JSON";
    return { ok: false, error: message };
  }

  if (!isJsonValue(parsed)) {
    return { ok: false, error: "Parsed value is not a JSON-safe tree" };
  }

  return { ok: true, value: parsed };
}

/**
 * Serialize a JSON-safe value. Object key order is non-semantic.
 * Does not invent canonical key sorting.
 */
export function serializeJson(value: JsonValue): string {
  return JSON.stringify(value);
}

/**
 * Semantic deep equality for JSON trees.
 * Array order is significant; object key order is not.
 */
export function jsonEquals(left: JsonValue, right: JsonValue): boolean {
  if (left === right) {
    return true;
  }

  if (left === null || right === null) {
    return left === right;
  }

  if (typeof left !== typeof right) {
    return false;
  }

  if (typeof left !== "object" || typeof right !== "object") {
    return Object.is(left, right);
  }

  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right)) {
      return false;
    }
    if (left.length !== right.length) {
      return false;
    }
    for (let i = 0; i < left.length; i += 1) {
      const a = left[i];
      const b = right[i];
      if (a === undefined || b === undefined || !jsonEquals(a, b)) {
        return false;
      }
    }
    return true;
  }

  const leftObject = left as JsonObject;
  const rightObject = right as JsonObject;
  const leftKeys = Object.keys(leftObject);
  const rightKeys = Object.keys(rightObject);
  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  const rightKeySet = new Set(rightKeys);
  for (const key of leftKeys) {
    if (!rightKeySet.has(key)) {
      return false;
    }
    const leftValue = leftObject[key];
    const rightValue = rightObject[key];
    if (leftValue === undefined || rightValue === undefined) {
      return false;
    }
    if (!jsonEquals(leftValue, rightValue)) {
      return false;
    }
  }

  return true;
}
