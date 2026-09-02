/**
 * Explicit Conflict precondition evaluation.
 * No automatic conflict discovery. No value-incompatibility ontology.
 */

import type {
  Assertion,
  BusinessContextDocument,
  Conflict,
  ConflictKind,
  ConflictStatus,
  Id,
} from "../model.js";
import { validityIntervalsHaveCommonIntersection } from "./temporal.js";

/**
 * Mechanically decidable contradiction precondition outcome.
 * `valueIncompatibilityEvaluated` is always false — Phase 1 defines no value ontology.
 */
export type ContradictionPreconditionResult = {
  readonly conflictKind: ConflictKind;
  readonly status: ConflictStatus;
  readonly subjectPredicateAligned: boolean;
  readonly temporalPreconditionMet: boolean;
  /**
   * True only when conflictKind is contradiction and subject/predicate +
   * temporal preconditions hold. Does NOT prove value incompatibility.
   */
  readonly contradictionPreconditionsMetExceptValue: boolean;
  readonly valueIncompatibilityEvaluated: false;
};

function buildAssertionLookup(document: BusinessContextDocument): Map<Id, Assertion> {
  const byId = new Map<Id, Assertion>();
  for (const assertion of document.assertions ?? []) {
    if (!byId.has(assertion.id)) {
      byId.set(assertion.id, assertion);
    }
  }
  return byId;
}

/**
 * Evaluate mechanically decidable preconditions of an existing explicit Conflict.
 *
 * Uses document.assertions for ID resolution only (exact case-sensitive match).
 * externalIds never participate.
 *
 * For contradiction with >2 assertions, temporal precondition uses non-empty
 * common intersection of validity intervals (EVI-2.3 reference interpretation).
 *
 * Precondition: document is L1+L2-valid (caller responsibility).
 *
 * @throws {RangeError} when present assertion validity bounds are not valid instants
 */
export function evaluateContradictionPreconditions(
  document: BusinessContextDocument,
  conflict: Conflict,
): ContradictionPreconditionResult {
  const byId = buildAssertionLookup(document);
  const resolved: Assertion[] = [];
  let allResolved = true;

  for (const assertionId of conflict.assertionIds) {
    const assertion = byId.get(assertionId);
    if (assertion === undefined) {
      allResolved = false;
    } else {
      resolved.push(assertion);
    }
  }

  let subjectPredicateAligned = false;
  let temporalPreconditionMet = false;

  if (allResolved && resolved.length >= 2) {
    const first = resolved[0];
    if (first !== undefined) {
      subjectPredicateAligned = resolved.every(
        (a) => a.subject === first.subject && a.predicate === first.predicate,
      );
      temporalPreconditionMet = validityIntervalsHaveCommonIntersection(resolved);
    }
  }

  const contradictionPreconditionsMetExceptValue =
    conflict.conflictKind === "contradiction" &&
    allResolved &&
    resolved.length >= 2 &&
    subjectPredicateAligned &&
    temporalPreconditionMet;

  return {
    conflictKind: conflict.conflictKind,
    status: conflict.status,
    subjectPredicateAligned,
    temporalPreconditionMet,
    contradictionPreconditionsMetExceptValue,
    valueIncompatibilityEvaluated: false,
  };
}
