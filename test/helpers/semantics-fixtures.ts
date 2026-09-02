/**
 * Synthetic Assertion builders for EVI-2.3 semantics tests.
 * Not package API. Does not mutate Phase 1 fixtures.
 */

import type {
  Assertion,
  AssertionClassification,
  BusinessContextDocument,
  Conflict,
  ConflictStatus,
  DateTime,
  ValidationMetadata,
  ValidationResult,
} from "../../src/model.js";

const EVIDENCE_ID = "ev-1";
const SOURCE_ID = "source-1";
const ORG_ID = "org-1";
const SUBJECT_ID = "entity-1";

export type AssertionBuildInput = {
  readonly id: string;
  readonly subject?: string;
  readonly predicate?: string;
  readonly value?: Assertion["value"];
  readonly evidenceIds?: readonly string[];
  readonly observedAt?: DateTime;
  readonly classification?: AssertionClassification;
  readonly validFrom?: DateTime;
  readonly validUntil?: DateTime;
  readonly validation?: ValidationMetadata;
  readonly supersededBy?: string;
};

export function baseAssertion(input: AssertionBuildInput): Assertion {
  const assertion: Assertion = {
    id: input.id,
    type: "Assertion",
    subject: input.subject ?? SUBJECT_ID,
    predicate: input.predicate ?? "status",
    value: input.value ?? "x",
    evidenceIds: input.evidenceIds ?? [EVIDENCE_ID],
    observedAt: input.observedAt ?? "2026-01-15T00:00:00Z",
    classification: input.classification ?? "asserted",
    ...(input.validFrom !== undefined ? { validFrom: input.validFrom } : {}),
    ...(input.validUntil !== undefined ? { validUntil: input.validUntil } : {}),
    ...(input.validation !== undefined ? { validation: input.validation } : {}),
    ...(input.supersededBy !== undefined ? { supersededBy: input.supersededBy } : {}),
  };
  return assertion;
}

export function validatedFact(
  id: string,
  overrides: Omit<AssertionBuildInput, "id" | "classification"> = {},
  policyId = "evidensiq.default-fact-v0.1",
  result: ValidationResult = "valid",
): Assertion {
  return baseAssertion({
    ...overrides,
    id,
    classification: "validated",
    validation: overrides.validation ?? {
      policyId,
      evaluatedAt: "2026-06-30T12:00:00Z",
      result,
    },
  });
}

export function classifiedAssertion(
  id: string,
  classification: AssertionClassification,
  overrides: Omit<AssertionBuildInput, "id" | "classification"> = {},
): Assertion {
  if (classification === "validated") {
    return validatedFact(id, overrides);
  }
  if (classification === "superseded") {
    return baseAssertion({
      ...overrides,
      id,
      classification: "superseded",
      supersededBy: overrides.supersededBy ?? "asrt-replacement",
    });
  }
  return baseAssertion({
    ...overrides,
    id,
    classification,
  });
}

export function minimalDocument(
  assertions: readonly Assertion[],
  conflicts: readonly Conflict[] = [],
): BusinessContextDocument {
  return {
    specVersion: "0.1",
    organizationId: ORG_ID,
    entities: [
      { id: ORG_ID, type: "Organization", name: "Org" },
      { id: SUBJECT_ID, type: "Product", name: "Product" },
    ],
    sources: [
      {
        id: SOURCE_ID,
        type: "Source",
        provenance: {
          originScope: "internal",
          acquisitionMethod: "imported",
          trustAssessment: "trusted",
        },
      },
    ],
    evidence: [{ id: EVIDENCE_ID, type: "Evidence", sourceId: SOURCE_ID }],
    assertions,
    ...(conflicts.length > 0 ? { conflicts } : {}),
  };
}

export function contradictionConflict(
  id: string,
  assertionIds: readonly string[],
  status: ConflictStatus = "unresolved",
  extras: Partial<Conflict> = {},
): Conflict {
  return {
    id,
    assertionIds,
    conflictKind: "contradiction",
    status,
    ...extras,
  };
}

export { ORG_ID, SUBJECT_ID, EVIDENCE_ID, SOURCE_ID };
