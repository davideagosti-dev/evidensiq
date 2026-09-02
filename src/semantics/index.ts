/**
 * Temporal / Fact / Conflict semantic evaluation primitives (EVI-2.3).
 * Pure functions over immutable documents — not an L4 conformance runner.
 */

export type { ContradictionPreconditionResult } from "./conflict.js";
export { evaluateContradictionPreconditions } from "./conflict.js";
export { isFactQualified, selectCurrentFactAssertions } from "./fact.js";
export type { ValidityBounds } from "./temporal.js";
export { isAssertionActiveAt, validityIntervalsOverlap } from "./temporal.js";
