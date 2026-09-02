/**
 * Compiled Ajv Draft 2020-12 validator for the authoritative schema.
 * Internal only — never exported from the public API.
 *
 * strictRequired is disabled because Phase 1 Assertion/Recommendation
 * allOf/then branches reference properties defined on the parent object
 * schema; Ajv strictRequired rejects that pattern without schema mutation.
 */

import { Ajv2020, type ErrorObject, type ValidateFunction } from "ajv/dist/2020.js";
import type { Plugin } from "ajv";
import businessContextSchema from "../../specification/business-context.schema.json" with {
  type: "json",
};

// ajv-formats is CJS; NodeNext + verbatimModuleSyntax cannot default-import it cleanly.
import addFormatsImport from "ajv-formats";

const addFormats = (
  typeof addFormatsImport === "function"
    ? addFormatsImport
    : (addFormatsImport as unknown as { default: Plugin<unknown> }).default
) as Plugin<unknown>;

let cachedValidate: ValidateFunction | undefined;

function createValidator(): ValidateFunction {
  const ajv = new Ajv2020({
    allErrors: true,
    strict: true,
    strictRequired: false,
    validateSchema: false,
    code: { esm: true },
  });
  addFormats(ajv);
  return ajv.compile(businessContextSchema);
}

/** Return the lazily compiled singleton validator. */
export function getSchemaValidator(): ValidateFunction {
  if (cachedValidate === undefined) {
    cachedValidate = createValidator();
  }
  return cachedValidate;
}

export type AjvError = ErrorObject;
