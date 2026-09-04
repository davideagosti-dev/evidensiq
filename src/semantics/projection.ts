/**
 * Deterministic Business Context Projection (EVI-2.4 / DEC-PROJ-01).
 * Pure reference closure — no ranking, RAG, clocks, or Fact-only filtering.
 */

import type {
  Assertion,
  BusinessContextDocument,
  BusinessContextProjectionRequest,
  BusinessContextProjectionResult,
  Conflict,
  DateTime,
  Entity,
  Evidence,
  Id,
  Relation,
} from "../model.js";
import { isAssertionActiveAt, parseDateTimeMs } from "./temporal.js";

/** Caller-supplied projection options. No internal wall-clock. */
export type ProjectionOptions = {
  readonly projectedAt?: DateTime;
};

const MAX_RELATION_DEPTH = 3;

function clampDepth(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 0;
  }
  if (value <= 0) {
    return 0;
  }
  if (value >= MAX_RELATION_DEPTH) {
    return MAX_RELATION_DEPTH;
  }
  return Math.trunc(value);
}

function effectiveMaxDepth(request: BusinessContextProjectionRequest): number {
  if (request.relationTraversal === undefined) {
    return 0;
  }
  return clampDepth(request.relationTraversal.maxDepth);
}

function buildEntityLookup(entities: readonly Entity[]): Map<Id, Entity> {
  const byId = new Map<Id, Entity>();
  for (const entity of entities) {
    if (!byId.has(entity.id)) {
      byId.set(entity.id, entity);
    }
  }
  return byId;
}

function buildUndirectedAdjacency(relations: readonly Relation[]): Map<Id, Id[]> {
  const adj = new Map<Id, Id[]>();
  const addEdge = (from: Id, to: Id): void => {
    const list = adj.get(from);
    if (list === undefined) {
      adj.set(from, [to]);
    } else {
      list.push(to);
    }
  };
  for (const relation of relations) {
    addEdge(relation.from, relation.to);
    addEdge(relation.to, relation.from);
  }
  return adj;
}

function seedEntityIds(
  entities: readonly Entity[],
  entityById: Map<Id, Entity>,
  entityIds: readonly Id[] | undefined,
): Set<Id> {
  if (entityIds === undefined) {
    return new Set(entities.map((e) => e.id));
  }
  const seeds = new Set<Id>();
  for (const id of entityIds) {
    if (entityById.has(id)) {
      seeds.add(id);
    }
  }
  return seeds;
}

function expandReachableEntities(
  seeds: ReadonlySet<Id>,
  adjacency: Map<Id, Id[]>,
  maxDepth: number,
): Set<Id> {
  const reachable = new Set<Id>(seeds);
  let frontier: Id[] = [...seeds];
  for (let depth = 0; depth < maxDepth; depth += 1) {
    const next: Id[] = [];
    for (const id of frontier) {
      const neighbors = adjacency.get(id);
      if (neighbors === undefined) {
        continue;
      }
      for (const neighbor of neighbors) {
        if (!reachable.has(neighbor)) {
          reachable.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    frontier = next;
  }
  return reachable;
}

function addEvidenceIds(
  target: Set<Id>,
  evidenceById: ReadonlyMap<Id, Evidence>,
  ids: readonly Id[] | undefined,
): boolean {
  let added = false;
  if (ids === undefined) {
    return false;
  }
  for (const id of ids) {
    if (evidenceById.has(id) && !target.has(id)) {
      target.add(id);
      added = true;
    }
  }
  return added;
}

function isValidatedAssertion(assertion: Assertion | undefined): boolean {
  return assertion !== undefined && assertion.classification === "validated";
}

/**
 * Project a Business Context document to a deterministic subset.
 *
 * Precondition: `document` is L1+L2-valid (caller responsibility; not re-validated).
 * Non-operative request fields (`objective`, `domains`, `evidencePolicy`,
 * `ordering`, `sizeLimit`, `extensions`) are accepted but do not invent filtering,
 * ranking, truncation, or extension execution. `sizeLimit` is a no-op.
 *
 * @throws {RangeError} when `request.asOf` or `options.projectedAt` is not a valid instant
 */
export function projectBusinessContext(
  document: BusinessContextDocument,
  request: BusinessContextProjectionRequest,
  options?: ProjectionOptions,
): BusinessContextProjectionResult {
  if (options?.projectedAt !== undefined) {
    parseDateTimeMs(options.projectedAt);
  }
  if (request.asOf !== undefined) {
    parseDateTimeMs(request.asOf);
  }

  const entities = document.entities ?? [];
  const relations = document.relations ?? [];
  const assertions = document.assertions ?? [];
  const evidence = document.evidence ?? [];
  const signals = document.signals ?? [];
  const inferences = document.inferences ?? [];
  const recommendations = document.recommendations ?? [];
  const conflicts = document.conflicts ?? [];

  const entityById = buildEntityLookup(entities);
  const evidenceById = new Map<Id, Evidence>();
  for (const item of evidence) {
    if (!evidenceById.has(item.id)) {
      evidenceById.set(item.id, item);
    }
  }
  const assertionById = new Map<Id, Assertion>();
  for (const item of assertions) {
    if (!assertionById.has(item.id)) {
      assertionById.set(item.id, item);
    }
  }

  const seeds = seedEntityIds(entities, entityById, request.entityIds);
  const maxDepth = effectiveMaxDepth(request);
  const reachableIds = expandReachableEntities(
    seeds,
    buildUndirectedAdjacency(relations),
    maxDepth,
  );

  const projectedEntities = entities.filter((e) => reachableIds.has(e.id));
  const entityIdSet = new Set(projectedEntities.map((e) => e.id));

  const projectedRelations = relations.filter(
    (r) => entityIdSet.has(r.from) && entityIdSet.has(r.to),
  );

  let projectedAssertions = assertions.filter((a) => entityIdSet.has(a.subject));
  if (request.asOf !== undefined) {
    const asOf = request.asOf;
    projectedAssertions = projectedAssertions.filter((a) => isAssertionActiveAt(a, asOf));
  }
  const assertionIdSet = new Set(projectedAssertions.map((a) => a.id));

  const includedEvidenceIds = new Set<Id>();
  const includedSignalIds = new Set<Id>();
  const includedInferenceIds = new Set<Id>();
  const includedRecommendationIds = new Set<Id>();

  for (const entity of projectedEntities) {
    addEvidenceIds(includedEvidenceIds, evidenceById, entity.evidenceIds);
  }
  for (const relation of projectedRelations) {
    addEvidenceIds(includedEvidenceIds, evidenceById, relation.evidenceIds);
  }
  for (const assertion of projectedAssertions) {
    addEvidenceIds(includedEvidenceIds, evidenceById, assertion.evidenceIds);
  }

  let changed = true;
  while (changed) {
    changed = false;

    for (const signal of signals) {
      if (includedSignalIds.has(signal.id)) {
        continue;
      }
      const evidenceIds = signal.evidenceIds ?? [];
      if (evidenceIds.some((id) => includedEvidenceIds.has(id))) {
        includedSignalIds.add(signal.id);
        if (addEvidenceIds(includedEvidenceIds, evidenceById, signal.evidenceIds)) {
          changed = true;
        }
        changed = true;
      }
    }

    for (const inference of inferences) {
      if (includedInferenceIds.has(inference.id)) {
        continue;
      }
      const basedOn = inference.basedOn ?? [];
      const intersects = basedOn.some((id) => {
        if (includedSignalIds.has(id)) {
          return true;
        }
        if (includedInferenceIds.has(id)) {
          return true;
        }
        if (assertionIdSet.has(id) && isValidatedAssertion(assertionById.get(id))) {
          return true;
        }
        return false;
      });
      if (intersects) {
        includedInferenceIds.add(inference.id);
        changed = true;
      }
    }

    for (const recommendation of recommendations) {
      if (includedRecommendationIds.has(recommendation.id)) {
        continue;
      }
      const viaEvidence = (recommendation.evidenceIds ?? []).some((id) =>
        includedEvidenceIds.has(id),
      );
      const viaInference = (recommendation.inferenceIds ?? []).some((id) =>
        includedInferenceIds.has(id),
      );
      const viaConstraint = (recommendation.constraintIds ?? []).some((id) => entityIdSet.has(id));
      if (viaEvidence || viaInference || viaConstraint) {
        includedRecommendationIds.add(recommendation.id);
        if (addEvidenceIds(includedEvidenceIds, evidenceById, recommendation.evidenceIds)) {
          changed = true;
        }
        changed = true;
      }
    }
  }

  const projectedSignals = signals.filter((s) => includedSignalIds.has(s.id));
  const projectedInferences = inferences.filter((i) => includedInferenceIds.has(i.id));
  const projectedRecommendations = recommendations.filter((r) =>
    includedRecommendationIds.has(r.id),
  );
  const projectedEvidence = evidence.filter((e) => includedEvidenceIds.has(e.id));

  // Evidence → Source closure (EVI-3.1 / EVI-L4-013): provenance-complete, not document-complete.
  const referencedSourceIds = new Set<Id>();
  for (const item of projectedEvidence) {
    referencedSourceIds.add(item.sourceId);
  }
  const documentSources = document.sources ?? [];
  const projectedSources = documentSources.filter((source) => referencedSourceIds.has(source.id));

  let projectedConflicts: readonly Conflict[] | undefined;
  if (request.includeConflicts === true) {
    projectedConflicts = conflicts.filter(
      (conflict) =>
        conflict.status === "unresolved" &&
        conflict.assertionIds.some((id) => assertionIdSet.has(id)),
    );
  }

  const result: BusinessContextProjectionResult = {
    ...(options?.projectedAt !== undefined ? { projectedAt: options.projectedAt } : {}),
    ...(request.asOf !== undefined ? { asOf: request.asOf } : {}),
    ...(projectedEntities.length > 0 ? { entities: projectedEntities } : {}),
    ...(projectedRelations.length > 0 ? { relations: projectedRelations } : {}),
    ...(projectedAssertions.length > 0 ? { assertions: projectedAssertions } : {}),
    ...(projectedSignals.length > 0 ? { signals: projectedSignals } : {}),
    ...(projectedInferences.length > 0 ? { inferences: projectedInferences } : {}),
    ...(projectedRecommendations.length > 0 ? { recommendations: projectedRecommendations } : {}),
    ...(projectedConflicts !== undefined && projectedConflicts.length > 0
      ? { conflicts: projectedConflicts }
      : {}),
    ...(projectedEvidence.length > 0 ? { evidence: projectedEvidence } : {}),
    ...(projectedSources.length > 0 ? { sources: projectedSources } : {}),
    ...(request.extensions !== undefined ? { extensions: request.extensions } : {}),
  };

  return result;
}
