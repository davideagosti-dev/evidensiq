/**
 * Synthetic document builders for EVI-2.4 projection / recommendation tests.
 * Not package API.
 */

import type {
  Assertion,
  BusinessContextDocument,
  Conflict,
  Entity,
  Evidence,
  Inference,
  Recommendation,
  Relation,
  Signal,
  Source,
} from "../../src/model.js";
import {
  baseAssertion,
  classifiedAssertion,
  contradictionConflict,
  validatedFact,
  EVIDENCE_ID,
  ORG_ID,
  SOURCE_ID,
  SUBJECT_ID,
} from "./semantics-fixtures.js";

export const ASOF = "2026-06-30T00:00:00Z";
export const Q2_FROM = "2026-04-01T00:00:00Z";
export const Q2_UNTIL = "2026-07-01T00:00:00Z";
export const Q1_FROM = "2026-01-01T00:00:00Z";
export const Q1_UNTIL = "2026-04-01T00:00:00Z";

const defaultSource: Source = {
  id: SOURCE_ID,
  type: "Source",
  provenance: {
    originScope: "internal",
    acquisitionMethod: "imported",
    trustAssessment: "trusted",
  },
};

export function entity(
  id: string,
  type: Entity["type"] = "Product",
  extras: Partial<Entity> = {},
): Entity {
  return { id, type, name: id, ...extras };
}

export function relation(
  id: string,
  from: string,
  to: string,
  type: Relation["type"] = "partOf",
  extras: Partial<Relation> = {},
): Relation {
  return { id, from, to, type, ...extras };
}

export function evidence(
  id: string,
  sourceId = SOURCE_ID,
  extras: Partial<Evidence> = {},
): Evidence {
  return { id, type: "Evidence", sourceId, ...extras };
}

export function signal(
  id: string,
  evidenceIds: readonly string[],
  extras: Partial<Signal> = {},
): Signal {
  return { id, type: "Signal", evidenceIds, status: "active", ...extras };
}

export function inference(
  id: string,
  basedOn: readonly string[],
  extras: Partial<Inference> = {},
): Inference {
  return { id, type: "Inference", basedOn, ...extras };
}

export function recommendation(
  id: string,
  extras: Partial<Recommendation> & Pick<Recommendation, "status">,
): Recommendation {
  return { id, type: "Recommendation", ...extras };
}

export function hardConstraint(id: string): Entity {
  return entity(id, "Constraint", {
    properties: { enforcement: "hard" },
  });
}

export function advisoryConstraint(id: string): Entity {
  return entity(id, "Constraint", {
    properties: { enforcement: "advisory" },
  });
}

export type DocParts = {
  readonly entities?: readonly Entity[];
  readonly relations?: readonly Relation[];
  readonly sources?: readonly Source[];
  readonly evidence?: readonly Evidence[];
  readonly assertions?: readonly Assertion[];
  readonly signals?: readonly Signal[];
  readonly inferences?: readonly Inference[];
  readonly recommendations?: readonly Recommendation[];
  readonly conflicts?: readonly Conflict[];
};

export function contextDocument(parts: DocParts = {}): BusinessContextDocument {
  const entities = parts.entities ?? [
    entity(ORG_ID, "Organization"),
    entity(SUBJECT_ID, "Product"),
  ];
  return {
    specVersion: "0.1",
    organizationId: ORG_ID,
    entities,
    ...(parts.relations !== undefined ? { relations: parts.relations } : {}),
    sources: parts.sources ?? [defaultSource],
    evidence: parts.evidence ?? [evidence(EVIDENCE_ID)],
    ...(parts.assertions !== undefined ? { assertions: parts.assertions } : {}),
    ...(parts.signals !== undefined ? { signals: parts.signals } : {}),
    ...(parts.inferences !== undefined ? { inferences: parts.inferences } : {}),
    ...(parts.recommendations !== undefined ? { recommendations: parts.recommendations } : {}),
    ...(parts.conflicts !== undefined ? { conflicts: parts.conflicts } : {}),
  };
}

/** Chain e1—e2—e3—e4 for depth tests (undirected). */
export function depthChainDocument(): BusinessContextDocument {
  return contextDocument({
    entities: [
      entity(ORG_ID, "Organization"),
      entity("e1"),
      entity("e2"),
      entity("e3"),
      entity("e4"),
      entity("e-unrelated"),
    ],
    relations: [
      relation("r12", "e1", "e2"),
      relation("r23", "e2", "e3"),
      relation("r34", "e3", "e4"),
      relation("r-unrelated", "e-unrelated", "e-unrelated"),
    ],
  });
}

export {
  baseAssertion,
  classifiedAssertion,
  contradictionConflict,
  validatedFact,
  EVIDENCE_ID,
  ORG_ID,
  SOURCE_ID,
  SUBJECT_ID,
};
