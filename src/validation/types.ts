/**
 * Public diagnostic and validation result types for L1/L2.
 * Ajv types are never part of this contract.
 */

import type { BusinessContextDocument } from "../model.js";

export type ConformanceLevel = "L1" | "L2";

export type DiagnosticSeverity = "error" | "warning";

export interface Diagnostic {
  readonly ruleId: string;
  readonly level: ConformanceLevel;
  readonly severity: DiagnosticSeverity;
  readonly path: string;
  readonly message: string;
}

/** L1 structural validation of unknown input. */
export type L1ValidationSuccess = {
  readonly valid: true;
  readonly document: BusinessContextDocument;
  readonly diagnostics: readonly Diagnostic[];
};

export type L1ValidationFailure = {
  readonly valid: false;
  readonly diagnostics: readonly Diagnostic[];
};

export type L1ValidationResult = L1ValidationSuccess | L1ValidationFailure;

/** L2 semantic validation of an L1-valid document. */
export type L2ValidationResult = {
  readonly valid: boolean;
  readonly diagnostics: readonly Diagnostic[];
};

/**
 * Combined L1 + L2 validation.
 * document is present only when L1 succeeded (typed narrowing).
 */
export type BusinessContextValidationSuccess = {
  readonly valid: true;
  readonly document: BusinessContextDocument;
  readonly diagnostics: readonly Diagnostic[];
};

export type BusinessContextValidationFailure = {
  readonly valid: false;
  readonly diagnostics: readonly Diagnostic[];
  readonly document?: BusinessContextDocument;
};

export type BusinessContextValidationResult =
  | BusinessContextValidationSuccess
  | BusinessContextValidationFailure;
