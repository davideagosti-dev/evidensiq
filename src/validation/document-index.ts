/**
 * Transient per-call document indexes for L2 validation.
 * Internal only — never serialized or exported.
 */

import type {
  Assertion,
  BusinessContextDocument,
  Conflict,
  Entity,
  Evidence,
  Inference,
  Recommendation,
  Signal,
  Source,
} from "../model.js";
import { appendPointerSegment } from "./pointer.js";

export type IndexedCategory =
  | "entities"
  | "sources"
  | "evidence"
  | "assertions"
  | "signals"
  | "inferences"
  | "recommendations"
  | "conflicts"
  | "relations";

export type DocumentIndex = {
  readonly entities: Map<string, Entity>;
  readonly sources: Map<string, Source>;
  readonly evidence: Map<string, Evidence>;
  readonly assertions: Map<string, Assertion>;
  readonly signals: Map<string, Signal>;
  readonly inferences: Map<string, Inference>;
  readonly recommendations: Map<string, Recommendation>;
  readonly conflicts: Map<string, Conflict>;
  /** Every normative object id field occurrence in document order. */
  readonly idOccurrences: readonly { readonly id: string; readonly path: string }[];
};

function idPath(collection: string, index: number): string {
  return appendPointerSegment(appendPointerSegment(`/${collection}`, String(index)), "id");
}

/** Build transient indexes for one L2 validation call. */
export function buildDocumentIndex(document: BusinessContextDocument): DocumentIndex {
  const entities = new Map<string, Entity>();
  const sources = new Map<string, Source>();
  const evidence = new Map<string, Evidence>();
  const assertions = new Map<string, Assertion>();
  const signals = new Map<string, Signal>();
  const inferences = new Map<string, Inference>();
  const recommendations = new Map<string, Recommendation>();
  const conflicts = new Map<string, Conflict>();
  const idOccurrences: { id: string; path: string }[] = [];

  const entityList = document.entities ?? [];
  for (let i = 0; i < entityList.length; i += 1) {
    const entity = entityList[i];
    if (entity === undefined) {
      continue;
    }
    idOccurrences.push({ id: entity.id, path: idPath("entities", i) });
    if (!entities.has(entity.id)) {
      entities.set(entity.id, entity);
    }
  }

  const sourceList = document.sources ?? [];
  for (let i = 0; i < sourceList.length; i += 1) {
    const source = sourceList[i];
    if (source === undefined) {
      continue;
    }
    idOccurrences.push({ id: source.id, path: idPath("sources", i) });
    if (!sources.has(source.id)) {
      sources.set(source.id, source);
    }
  }

  const evidenceList = document.evidence ?? [];
  for (let i = 0; i < evidenceList.length; i += 1) {
    const item = evidenceList[i];
    if (item === undefined) {
      continue;
    }
    idOccurrences.push({ id: item.id, path: idPath("evidence", i) });
    if (!evidence.has(item.id)) {
      evidence.set(item.id, item);
    }
  }

  const assertionList = document.assertions ?? [];
  for (let i = 0; i < assertionList.length; i += 1) {
    const assertion = assertionList[i];
    if (assertion === undefined) {
      continue;
    }
    idOccurrences.push({ id: assertion.id, path: idPath("assertions", i) });
    if (!assertions.has(assertion.id)) {
      assertions.set(assertion.id, assertion);
    }
  }

  const signalList = document.signals ?? [];
  for (let i = 0; i < signalList.length; i += 1) {
    const signal = signalList[i];
    if (signal === undefined) {
      continue;
    }
    idOccurrences.push({ id: signal.id, path: idPath("signals", i) });
    if (!signals.has(signal.id)) {
      signals.set(signal.id, signal);
    }
  }

  const inferenceList = document.inferences ?? [];
  for (let i = 0; i < inferenceList.length; i += 1) {
    const inference = inferenceList[i];
    if (inference === undefined) {
      continue;
    }
    idOccurrences.push({ id: inference.id, path: idPath("inferences", i) });
    if (!inferences.has(inference.id)) {
      inferences.set(inference.id, inference);
    }
  }

  const recommendationList = document.recommendations ?? [];
  for (let i = 0; i < recommendationList.length; i += 1) {
    const recommendation = recommendationList[i];
    if (recommendation === undefined) {
      continue;
    }
    idOccurrences.push({ id: recommendation.id, path: idPath("recommendations", i) });
    if (!recommendations.has(recommendation.id)) {
      recommendations.set(recommendation.id, recommendation);
    }
  }

  const conflictList = document.conflicts ?? [];
  for (let i = 0; i < conflictList.length; i += 1) {
    const conflict = conflictList[i];
    if (conflict === undefined) {
      continue;
    }
    idOccurrences.push({ id: conflict.id, path: idPath("conflicts", i) });
    if (!conflicts.has(conflict.id)) {
      conflicts.set(conflict.id, conflict);
    }
  }

  const relationList = document.relations ?? [];
  for (let i = 0; i < relationList.length; i += 1) {
    const relation = relationList[i];
    if (relation === undefined) {
      continue;
    }
    idOccurrences.push({ id: relation.id, path: idPath("relations", i) });
  }

  return {
    entities,
    sources,
    evidence,
    assertions,
    signals,
    inferences,
    recommendations,
    conflicts,
    idOccurrences,
  };
}
