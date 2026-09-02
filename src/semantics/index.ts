/**
 * Semantic evaluation primitives (EVI-2.3 temporal/Fact/conflict + EVI-2.4 projection/recommendation).
 * Pure functions over immutable documents — not an L4 conformance runner.
 */

export type { ContradictionPreconditionResult } from "./conflict.js";
export { evaluateContradictionPreconditions } from "./conflict.js";
export { isFactQualified, selectCurrentFactAssertions } from "./fact.js";
export type { ProjectionOptions } from "./projection.js";
export { projectBusinessContext } from "./projection.js";
export type {
  BoundedAssessmentCheck,
  BoundedAssessmentWarning,
  ConstraintEvaluation,
  NotEvaluableAssessmentCheck,
  RecommendationAssessmentFound,
  RecommendationAssessmentMissing,
  RecommendationAssessmentOptions,
  RecommendationAssessmentResult,
  RecommendationSupportGraphFound,
  RecommendationSupportGraphMissing,
  RecommendationSupportGraphResult,
} from "./recommendation.js";
export {
  assessRecommendation,
  buildRecommendationSupportGraph,
} from "./recommendation.js";
export type { ValidityBounds } from "./temporal.js";
export { isAssertionActiveAt, validityIntervalsOverlap } from "./temporal.js";
