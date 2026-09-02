/**
 * L2 semantic validation — document integrity and reference rules.
 */

import type { Assertion, BusinessContextDocument, DateTime, Entity } from "../model.js";
import { buildDocumentIndex, type DocumentIndex } from "./document-index.js";
import { appendPointerSegment } from "./pointer.js";
import { shouldWarnRelationEndpoints } from "./relation-advisory.js";
import type { Diagnostic, L2ValidationResult } from "./types.js";

const L2 = "L2" as const;

function errorDiag(ruleId: string, path: string, message: string): Diagnostic {
  return { ruleId, level: L2, severity: "error", path, message };
}

function warningDiag(ruleId: string, path: string, message: string): Diagnostic {
  return { ruleId, level: L2, severity: "warning", path, message };
}

function dedupeKey(d: Diagnostic): string {
  return `${d.ruleId}\0${d.path}\0${d.severity}`;
}

function sortDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  return diagnostics.slice().sort((a, b) => {
    if (a.path !== b.path) {
      return a.path < b.path ? -1 : 1;
    }
    if (a.level !== b.level) {
      return a.level < b.level ? -1 : 1;
    }
    if (a.ruleId !== b.ruleId) {
      return a.ruleId < b.ruleId ? -1 : 1;
    }
    return 0;
  });
}

function finalize(diagnostics: Diagnostic[]): L2ValidationResult {
  const seen = new Set<string>();
  const unique: Diagnostic[] = [];
  for (const d of diagnostics) {
    const key = dedupeKey(d);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(d);
  }
  const sorted = sortDiagnostics(unique);
  const valid = sorted.every((d) => d.severity !== "error");
  return { valid, diagnostics: sorted };
}

/** EVI-L2-001 / EVI-L2-002 — document-wide ID uniqueness with === comparison. */
function checkIdUniqueness(index: DocumentIndex, out: Diagnostic[]): void {
  const firstSeen = new Map<string, string>();
  for (const occurrence of index.idOccurrences) {
    const prior = firstSeen.get(occurrence.id);
    if (prior !== undefined) {
      out.push(
        errorDiag("EVI-L2-001", occurrence.path, "Document IDs must be unique within the document"),
      );
    } else {
      firstSeen.set(occurrence.id, occurrence.path);
    }
  }
}

function checkOrganizationId(
  document: BusinessContextDocument,
  index: DocumentIndex,
  out: Diagnostic[],
): void {
  const entity = index.entities.get(document.organizationId);
  if (entity === undefined || entity.type !== "Organization") {
    out.push(
      errorDiag(
        "EVI-L2-003",
        "/organizationId",
        "organizationId must resolve to an Entity of type Organization",
      ),
    );
  }
}

function checkTemporalBounds(
  path: string,
  validFrom: DateTime | undefined,
  validUntil: DateTime | undefined,
  out: Diagnostic[],
): void {
  if (validFrom === undefined || validUntil === undefined) {
    return;
  }
  const fromMs = Date.parse(validFrom);
  const untilMs = Date.parse(validUntil);
  if (Number.isNaN(fromMs) || Number.isNaN(untilMs)) {
    return;
  }
  // EVI-L2-012: validUntil must be strictly greater than validFrom.
  // EVI-L2-013: half-open [from, until) — adjacent intervals remain valid.
  if (!(untilMs > fromMs)) {
    out.push(errorDiag("EVI-L2-012", path, "validUntil must be strictly greater than validFrom"));
  }
}

function isValidatedAssertion(assertion: Assertion | undefined): boolean {
  return assertion !== undefined && assertion.classification === "validated";
}

function checkBasedOnTarget(id: string, index: DocumentIndex): boolean {
  if (index.signals.has(id)) {
    return true;
  }
  if (index.inferences.has(id)) {
    return true;
  }
  const assertion = index.assertions.get(id);
  return isValidatedAssertion(assertion);
}

/**
 * Validate L2 semantics for an L1-valid Business Context document.
 * Does not re-run L1.
 */
export function validateL2(document: BusinessContextDocument): L2ValidationResult {
  const index = buildDocumentIndex(document);
  const out: Diagnostic[] = [];

  checkIdUniqueness(index, out);
  checkOrganizationId(document, index, out);

  const relations = document.relations ?? [];
  for (let i = 0; i < relations.length; i += 1) {
    const relation = relations[i];
    if (relation === undefined) {
      continue;
    }
    const base = appendPointerSegment("/relations", String(i));
    if (!index.entities.has(relation.from)) {
      out.push(
        errorDiag(
          "EVI-L2-004",
          appendPointerSegment(base, "from"),
          "Relation.from must resolve to an Entity",
        ),
      );
    }
    if (!index.entities.has(relation.to)) {
      out.push(
        errorDiag(
          "EVI-L2-004",
          appendPointerSegment(base, "to"),
          "Relation.to must resolve to an Entity",
        ),
      );
    }

    const fromEntity = index.entities.get(relation.from);
    const toEntity = index.entities.get(relation.to);
    if (fromEntity !== undefined && toEntity !== undefined) {
      if (shouldWarnRelationEndpoints(relation.type, fromEntity.type, toEntity.type)) {
        out.push(
          warningDiag(
            "EVI-L2-019",
            base,
            "Core relation endpoint entity types do not match the expected advisory pattern",
          ),
        );
      }
    }

    checkTemporalBounds(base, relation.validFrom, relation.validUntil, out);
  }

  const entities = document.entities ?? [];
  for (let i = 0; i < entities.length; i += 1) {
    const entity = entities[i];
    if (entity === undefined) {
      continue;
    }
    checkTemporalBounds(
      appendPointerSegment("/entities", String(i)),
      entity.validFrom,
      entity.validUntil,
      out,
    );
  }

  const evidenceList = document.evidence ?? [];
  for (let i = 0; i < evidenceList.length; i += 1) {
    const item = evidenceList[i];
    if (item === undefined) {
      continue;
    }
    if (!index.sources.has(item.sourceId)) {
      out.push(
        errorDiag(
          "EVI-L2-005",
          appendPointerSegment(appendPointerSegment("/evidence", String(i)), "sourceId"),
          "Evidence.sourceId must resolve to a Source",
        ),
      );
    }
  }

  const assertions = document.assertions ?? [];
  for (let i = 0; i < assertions.length; i += 1) {
    const assertion = assertions[i];
    if (assertion === undefined) {
      continue;
    }
    const base = appendPointerSegment("/assertions", String(i));

    if (!index.entities.has(assertion.subject)) {
      out.push(
        errorDiag(
          "EVI-L2-006",
          appendPointerSegment(base, "subject"),
          "Assertion.subject must resolve to an Entity",
        ),
      );
    }

    for (let j = 0; j < assertion.evidenceIds.length; j += 1) {
      const evidenceId = assertion.evidenceIds[j];
      if (evidenceId === undefined) {
        continue;
      }
      if (!index.evidence.has(evidenceId)) {
        out.push(
          errorDiag(
            "EVI-L2-007",
            appendPointerSegment(appendPointerSegment(base, "evidenceIds"), String(j)),
            "Assertion.evidenceIds entries must resolve to Evidence",
          ),
        );
      }
    }

    if (assertion.supersededBy !== undefined) {
      const target = index.assertions.get(assertion.supersededBy);
      if (target === undefined) {
        out.push(
          errorDiag(
            "EVI-L2-008",
            appendPointerSegment(base, "supersededBy"),
            "supersededBy must resolve to an Assertion",
          ),
        );
      } else if (target.classification === "superseded") {
        out.push(
          errorDiag(
            "EVI-L2-009",
            appendPointerSegment(base, "supersededBy"),
            "supersededBy must not reference a superseded Assertion",
          ),
        );
      }
    }

    checkTemporalBounds(base, assertion.validFrom, assertion.validUntil, out);
  }

  const conflicts = document.conflicts ?? [];
  for (let i = 0; i < conflicts.length; i += 1) {
    const conflict = conflicts[i];
    if (conflict === undefined) {
      continue;
    }
    const base = appendPointerSegment("/conflicts", String(i));
    const distinct = new Set<string>();

    for (let j = 0; j < conflict.assertionIds.length; j += 1) {
      const assertionId = conflict.assertionIds[j];
      if (assertionId === undefined) {
        continue;
      }
      distinct.add(assertionId);
      if (!index.assertions.has(assertionId)) {
        out.push(
          errorDiag(
            "EVI-L2-010",
            appendPointerSegment(appendPointerSegment(base, "assertionIds"), String(j)),
            "Conflict.assertionIds entries must resolve to Assertions",
          ),
        );
      }
    }

    if (distinct.size < 2) {
      out.push(
        errorDiag(
          "EVI-L2-011",
          appendPointerSegment(base, "assertionIds"),
          "Conflict.assertionIds must contain at least two distinct Assertion IDs",
        ),
      );
    }

    if (conflict.conflictKind === "contradiction") {
      const resolved: Assertion[] = [];
      for (const assertionId of conflict.assertionIds) {
        const assertion = index.assertions.get(assertionId);
        if (assertion !== undefined) {
          resolved.push(assertion);
        }
      }
      if (resolved.length >= 2) {
        const first = resolved[0];
        if (first !== undefined) {
          const mismatch = resolved.some(
            (a) => a.subject !== first.subject || a.predicate !== first.predicate,
          );
          if (mismatch) {
            out.push(
              warningDiag(
                "EVI-L2-018",
                base,
                "Contradiction conflict assertions should share subject and predicate",
              ),
            );
          }
        }
      }
    }
  }

  const recommendations = document.recommendations ?? [];
  for (let i = 0; i < recommendations.length; i += 1) {
    const recommendation = recommendations[i];
    if (recommendation === undefined) {
      continue;
    }
    const base = appendPointerSegment("/recommendations", String(i));

    const evidenceIds = recommendation.evidenceIds ?? [];
    for (let j = 0; j < evidenceIds.length; j += 1) {
      const id = evidenceIds[j];
      if (id === undefined) {
        continue;
      }
      if (!index.evidence.has(id)) {
        out.push(
          errorDiag(
            "EVI-L2-014",
            appendPointerSegment(appendPointerSegment(base, "evidenceIds"), String(j)),
            "Recommendation.evidenceIds entries must resolve to Evidence",
          ),
        );
      }
    }

    const inferenceIds = recommendation.inferenceIds ?? [];
    for (let j = 0; j < inferenceIds.length; j += 1) {
      const id = inferenceIds[j];
      if (id === undefined) {
        continue;
      }
      if (!index.inferences.has(id)) {
        out.push(
          errorDiag(
            "EVI-L2-014",
            appendPointerSegment(appendPointerSegment(base, "inferenceIds"), String(j)),
            "Recommendation.inferenceIds entries must resolve to Inference",
          ),
        );
      }
    }

    const constraintIds = recommendation.constraintIds ?? [];
    for (let j = 0; j < constraintIds.length; j += 1) {
      const id = constraintIds[j];
      if (id === undefined) {
        continue;
      }
      const entity: Entity | undefined = index.entities.get(id);
      if (entity === undefined || entity.type !== "Constraint") {
        out.push(
          errorDiag(
            "EVI-L2-014",
            appendPointerSegment(appendPointerSegment(base, "constraintIds"), String(j)),
            "Recommendation.constraintIds entries must resolve to a Constraint Entity",
          ),
        );
      }
    }
  }

  const signals = document.signals ?? [];
  for (let i = 0; i < signals.length; i += 1) {
    const signal = signals[i];
    if (signal === undefined) {
      continue;
    }
    const evidenceIds = signal.evidenceIds ?? [];
    const base = appendPointerSegment("/signals", String(i));
    for (let j = 0; j < evidenceIds.length; j += 1) {
      const id = evidenceIds[j];
      if (id === undefined) {
        continue;
      }
      if (!index.evidence.has(id)) {
        out.push(
          errorDiag(
            "EVI-L2-015",
            appendPointerSegment(appendPointerSegment(base, "evidenceIds"), String(j)),
            "Signal.evidenceIds entries must resolve to Evidence",
          ),
        );
      }
    }
  }

  const inferences = document.inferences ?? [];
  for (let i = 0; i < inferences.length; i += 1) {
    const inference = inferences[i];
    if (inference === undefined) {
      continue;
    }
    const basedOn = inference.basedOn ?? [];
    const base = appendPointerSegment("/inferences", String(i));
    for (let j = 0; j < basedOn.length; j += 1) {
      const id = basedOn[j];
      if (id === undefined) {
        continue;
      }
      if (!checkBasedOnTarget(id, index)) {
        out.push(
          errorDiag(
            "EVI-L2-016",
            appendPointerSegment(appendPointerSegment(base, "basedOn"), String(j)),
            "Inference.basedOn must resolve to a Signal, validated Assertion, or Inference",
          ),
        );
      }
    }
  }

  // EVI-L2-017 is enforced by using only object id fields in indexes / resolvers.
  // Covered by unit tests that prove externalIds values never resolve references.

  return finalize(out);
}
