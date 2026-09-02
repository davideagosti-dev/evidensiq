/**
 * Structural (L1) and semantic (L2) validation for Business Context documents.
 */

export type {
  BusinessContextValidationFailure,
  BusinessContextValidationResult,
  BusinessContextValidationSuccess,
  ConformanceLevel,
  Diagnostic,
  DiagnosticSeverity,
  L1ValidationFailure,
  L1ValidationResult,
  L1ValidationSuccess,
  L2ValidationResult,
} from "./validation/types.js";

export { validateL1 } from "./validation/l1.js";
export { validateL2 } from "./validation/l2.js";
export { validateBusinessContext } from "./validation/validate.js";
