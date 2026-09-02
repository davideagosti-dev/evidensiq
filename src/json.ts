/**
 * Portable JSON-safe TypeScript types.
 * No any, function, symbol, bigint, Date, or class instances.
 */

export type JsonPrimitive = string | number | boolean | null;

export type JsonObject = { readonly [key: string]: JsonValue };

export type JsonArray = readonly JsonValue[];

export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
