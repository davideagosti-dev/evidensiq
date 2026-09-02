/**
 * Combined L1 + L2 Business Context validation.
 */

import { validateL1 } from "./l1.js";
import { validateL2 } from "./l2.js";
import type { BusinessContextValidationResult } from "./types.js";

/**
 * Validate unknown input with L1 then L2.
 * Structure-dependent L2 is skipped when L1 fails.
 */
export function validateBusinessContext(input: unknown): BusinessContextValidationResult {
  const l1 = validateL1(input);
  if (!l1.valid) {
    return {
      valid: false,
      diagnostics: l1.diagnostics,
    };
  }

  const l2 = validateL2(l1.document);
  if (!l2.valid) {
    return {
      valid: false,
      document: l1.document,
      diagnostics: [...l1.diagnostics, ...l2.diagnostics],
    };
  }

  return {
    valid: true,
    document: l1.document,
    diagnostics: [...l1.diagnostics, ...l2.diagnostics],
  };
}
