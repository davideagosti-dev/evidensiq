/**
 * Internal advisory endpoint patterns for EVI-L2-019.
 *
 * Derived only from:
 * 1. Explicit conformance fixture expectation (Product→targets→Metric warns)
 * 2. Documented specification example (Product→targets→CustomerSegment)
 * 3. Northstar core relations (avoid spurious warnings)
 *
 * Empty allow-list ⇒ emit no warning for that core type.
 * Extension relation types are never warned.
 */

import { CORE_RELATION_TYPES } from "../constants.js";

type EndpointPair = {
  readonly fromType: string;
  readonly toType: string;
};

const CORE_SET: ReadonlySet<string> = new Set(CORE_RELATION_TYPES);

/**
 * Non-empty allow-lists only. Types with no known guidance are omitted.
 */
const ADVISORY_ENDPOINTS: ReadonlyMap<string, readonly EndpointPair[]> = new Map([
  [
    "targets",
    [
      { fromType: "Product", toType: "CustomerSegment" },
      { fromType: "Goal", toType: "Product" },
    ],
  ],
  [
    "acquiredVia",
    [
      { fromType: "Product", toType: "Channel" },
      { fromType: "CustomerSegment", toType: "Channel" },
    ],
  ],
  ["produces", [{ fromType: "Process", toType: "Product" }]],
  [
    "measures",
    [
      { fromType: "Metric", toType: "Product" },
      { fromType: "Metric", toType: "Process" },
    ],
  ],
  ["constrains", [{ fromType: "Constraint", toType: "Process" }]],
]);

/** True when relation type is an approved core vocabulary member. */
export function isCoreRelationType(type: string): boolean {
  return CORE_SET.has(type);
}

/**
 * Returns true when a warning should be emitted for the given core relation endpoints.
 * Returns false when no advisory guidance exists or the pair is allowed.
 */
export function shouldWarnRelationEndpoints(
  relationType: string,
  fromEntityType: string,
  toEntityType: string,
): boolean {
  if (!isCoreRelationType(relationType)) {
    return false;
  }
  const allowed = ADVISORY_ENDPOINTS.get(relationType);
  if (allowed === undefined || allowed.length === 0) {
    return false;
  }
  for (const pair of allowed) {
    if (pair.fromType === fromEntityType && pair.toType === toEntityType) {
      return false;
    }
  }
  return true;
}
