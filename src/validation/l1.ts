/**
 * L1 structural validation against the authoritative Business Context schema.
 */

import type { BusinessContextDocument } from "../model.js";
import { mapAjvErrorsToL1Diagnostics } from "./l1-map.js";
import { getSchemaValidator } from "./schema-validator.js";
import type { L1ValidationResult } from "./types.js";

/**
 * Validate unknown input structurally (L1).
 * On success, narrows to BusinessContextDocument.
 */
export function validateL1(input: unknown): L1ValidationResult {
  const validate = getSchemaValidator();
  const ok = validate(input);
  if (ok) {
    return {
      valid: true,
      document: input as BusinessContextDocument,
      diagnostics: [],
    };
  }

  const diagnostics = mapAjvErrorsToL1Diagnostics(validate.errors);
  return {
    valid: false,
    diagnostics,
  };
}
