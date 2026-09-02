/**
 * Half-open valid-time primitives: [validFrom, validUntil).
 * No implicit wall-clock. Invalid DateTime arguments throw RangeError.
 */

import type { Assertion, DateTime } from "../model.js";

/** Optional validity bounds shared by Assertion (and related) wire objects. */
export type ValidityBounds = {
  readonly validFrom?: DateTime;
  readonly validUntil?: DateTime;
};

/**
 * Parse an ISO date-time string to epoch milliseconds.
 * @throws {RangeError} when the value is not a valid temporal instant
 */
export function parseDateTimeMs(value: DateTime): number {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) {
    throw new RangeError(`Invalid DateTime: ${value}`);
  }
  return ms;
}

function intervalStartMs(validFrom: DateTime | undefined): number {
  return validFrom === undefined ? Number.NEGATIVE_INFINITY : parseDateTimeMs(validFrom);
}

function intervalEndMs(validUntil: DateTime | undefined): number {
  return validUntil === undefined ? Number.POSITIVE_INFINITY : parseDateTimeMs(validUntil);
}

/**
 * Whether `asOf` falls in the half-open interval [validFrom, validUntil).
 * Missing validFrom → unbounded past; missing validUntil → unbounded future.
 *
 * @throws {RangeError} when `asOf` or present validity bounds are not valid instants
 */
export function isAssertionActiveAt(assertion: Assertion, asOf: DateTime): boolean {
  const asOfMs = parseDateTimeMs(asOf);
  if (assertion.validFrom !== undefined && !(parseDateTimeMs(assertion.validFrom) <= asOfMs)) {
    return false;
  }
  if (assertion.validUntil !== undefined && !(parseDateTimeMs(assertion.validUntil) > asOfMs)) {
    return false;
  }
  return true;
}

/**
 * Half-open intervals overlap iff their intersection is non-empty.
 *
 * Adjacent intervals [A, T) and [T, B) do not overlap.
 *
 * @throws {RangeError} when any present bound is not a valid temporal instant
 */
export function validityIntervalsOverlap(a: ValidityBounds, b: ValidityBounds): boolean {
  const aStart = intervalStartMs(a.validFrom);
  const aEnd = intervalEndMs(a.validUntil);
  const bStart = intervalStartMs(b.validFrom);
  const bEnd = intervalEndMs(b.validUntil);
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Non-empty common intersection of N half-open intervals.
 * EVI-2.3 reference interpretation for N-way contradiction temporal preconditions
 * (not a new normative Phase 1 rule).
 *
 * @throws {RangeError} when any present bound is not a valid temporal instant
 */
export function validityIntervalsHaveCommonIntersection(
  intervals: readonly ValidityBounds[],
): boolean {
  if (intervals.length === 0) {
    return false;
  }
  let start = Number.NEGATIVE_INFINITY;
  let end = Number.POSITIVE_INFINITY;
  for (const interval of intervals) {
    const s = intervalStartMs(interval.validFrom);
    const e = intervalEndMs(interval.validUntil);
    if (s > start) {
      start = s;
    }
    if (e < end) {
      end = e;
    }
  }
  return start < end;
}
