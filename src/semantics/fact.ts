/**
 * Fact is a semantic view over validated Assertions — not a wire type.
 * Current Fact selection requires an explicit asOf (no wall-clock).
 */

import type { Assertion, BusinessContextDocument, DateTime } from "../model.js";
import { isAssertionActiveAt, parseDateTimeMs } from "./temporal.js";

/**
 * EVI-L4-001 Fact qualification (temporal-independent).
 * Any recorded policyId qualifies; default policy ID is not required.
 */
export function isFactQualified(assertion: Assertion): boolean {
  if (assertion.classification !== "validated") {
    return false;
  }
  const validation = assertion.validation;
  if (validation === undefined) {
    return false;
  }
  if (validation.result !== "valid") {
    return false;
  }
  return validation.policyId.length > 0;
}

/**
 * Current Fact semantic view at an explicit asOf.
 * Returns all Fact-qualified Assertions active at asOf, in document.assertions order.
 * No winner selection, conflict filtering, or preferredAssertionId policy.
 *
 * Precondition: document is L1+L2-valid (caller responsibility; not re-validated here).
 *
 * @throws {RangeError} when `asOf` (or active assertion bounds) are not valid instants
 */
export function selectCurrentFactAssertions(
  document: BusinessContextDocument,
  asOf: DateTime,
): readonly Assertion[] {
  parseDateTimeMs(asOf);
  const assertions = document.assertions ?? [];
  const selected: Assertion[] = [];
  for (const assertion of assertions) {
    if (isFactQualified(assertion) && isAssertionActiveAt(assertion, asOf)) {
      selected.push(assertion);
    }
  }
  return selected;
}
