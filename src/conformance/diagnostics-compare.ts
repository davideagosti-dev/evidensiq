/**
 * Deterministic diagnostic multiset comparison (DEC-EVI25-01).
 * Identity: (ruleId, level, severity, path). Message ignored. Order irrelevant.
 */

import type { Diagnostic } from "../validation/types.js";
import type { DiagnosticIdentity } from "./types.js";

function identityKey(d: DiagnosticIdentity): string {
  return `${d.ruleId}\0${d.level}\0${d.severity}\0${d.path}`;
}

/** Stable sorted keys for multiset comparison (does not mutate inputs). */
export function diagnosticIdentityKeys(
  diagnostics: readonly DiagnosticIdentity[],
): readonly string[] {
  return diagnostics.map(identityKey).slice().sort();
}

export function toDiagnosticIdentity(d: Diagnostic): DiagnosticIdentity {
  return {
    ruleId: d.ruleId,
    level: d.level,
    severity: d.severity,
    path: d.path,
  };
}

/**
 * Multiset equality on diagnostic identities.
 * Does not mutate arrays. Does not stringify full Diagnostic (message non-normative).
 */
export function diagnosticMultisetsEqual(
  actual: readonly DiagnosticIdentity[],
  expected: readonly DiagnosticIdentity[],
): boolean {
  const actualKeys = diagnosticIdentityKeys(actual);
  const expectedKeys = diagnosticIdentityKeys(expected);
  if (actualKeys.length !== expectedKeys.length) {
    return false;
  }
  for (let i = 0; i < actualKeys.length; i += 1) {
    if (actualKeys[i] !== expectedKeys[i]) {
      return false;
    }
  }
  return true;
}

export function diagnosticsFromValidation(
  diagnostics: readonly Diagnostic[],
): readonly DiagnosticIdentity[] {
  return diagnostics.map(toDiagnosticIdentity);
}
