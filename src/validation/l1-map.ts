/**
 * Map Ajv ErrorObject[] to Evidensiq L1 Diagnostics.
 * Ajv keyword/params/schemaPath stay internal.
 */

import { appendPointerSegment, normalizeInstancePath } from "./pointer.js";
import type { AjvError } from "./schema-validator.js";
import type { Diagnostic } from "./types.js";

const L1 = "L1" as const;
const ERROR = "error" as const;

type MappedHit = {
  readonly ruleId: string;
  readonly path: string;
  readonly message: string;
};

function parentPath(instancePath: string): string {
  return normalizeInstancePath(instancePath);
}

function additionalPropertyPath(instancePath: string, property: string): string {
  return appendPointerSegment(normalizeInstancePath(instancePath), property);
}

function isUnder(instancePath: string, collection: string): boolean {
  return instancePath === `/${collection}` || instancePath.startsWith(`/${collection}/`);
}

function collectionItemPath(instancePath: string, collection: string): boolean {
  // /sources/0 or /sources/0/provenance — first segment is collection
  const parts = instancePath.split("/").filter((p) => p.length > 0);
  return parts[0] === collection;
}

function mapRequired(error: AjvError): MappedHit[] {
  const missing =
    typeof error.params === "object" && error.params !== null && "missingProperty" in error.params
      ? String((error.params as { missingProperty: unknown }).missingProperty)
      : "";
  const path = parentPath(error.instancePath);
  const schemaPath = error.schemaPath;

  if (error.instancePath === "" && (missing === "specVersion" || missing === "organizationId")) {
    return [
      {
        ruleId: "EVI-L1-001",
        path: "/",
        message: "Root document requires specVersion and organizationId",
      },
    ];
  }

  if (schemaPath.includes("/allOf/") && schemaPath.includes("/then")) {
    if (missing === "validation" && collectionItemPath(error.instancePath, "assertions")) {
      return [
        {
          ruleId: "EVI-L1-009",
          path,
          message: "Validated assertion requires validation metadata",
        },
      ];
    }
    if (missing === "supersededBy" && collectionItemPath(error.instancePath, "assertions")) {
      return [
        {
          ruleId: "EVI-L1-010",
          path,
          message: "Superseded assertion requires supersededBy",
        },
      ];
    }
    if (missing === "assessment" && collectionItemPath(error.instancePath, "recommendations")) {
      return [
        {
          ruleId: "EVI-L1-015",
          path,
          message: "Non-candidate recommendation requires assessment metadata",
        },
      ];
    }
  }

  if (collectionItemPath(error.instancePath, "entities")) {
    return [
      {
        ruleId: "EVI-L1-004",
        path,
        message: "Entity requires id and type",
      },
    ];
  }

  if (
    collectionItemPath(error.instancePath, "sources") ||
    (isUnder(error.instancePath, "sources") &&
      (missing === "originScope" ||
        missing === "acquisitionMethod" ||
        missing === "trustAssessment"))
  ) {
    return [
      {
        ruleId: "EVI-L1-005",
        path,
        message: "Source requires id, type Source, and provenance",
      },
    ];
  }

  if (collectionItemPath(error.instancePath, "evidence")) {
    return [
      {
        ruleId: "EVI-L1-006",
        path,
        message: "Evidence requires id, type Evidence, and sourceId",
      },
    ];
  }

  if (collectionItemPath(error.instancePath, "assertions")) {
    return [
      {
        ruleId: "EVI-L1-007",
        path,
        message: "Assertion is missing required fields",
      },
    ];
  }

  if (collectionItemPath(error.instancePath, "conflicts")) {
    return [
      {
        ruleId: "EVI-L1-014",
        path,
        message: "Conflict requires id, assertionIds, conflictKind, and status",
      },
    ];
  }

  if (collectionItemPath(error.instancePath, "recommendations")) {
    return [
      {
        ruleId: "EVI-L1-015",
        path,
        message: "Recommendation requires id, type Recommendation, and status",
      },
    ];
  }

  if (collectionItemPath(error.instancePath, "relations")) {
    return [
      {
        ruleId: "EVI-L1-012",
        path,
        message: "Relation requires id, from, to, and a valid type",
      },
    ];
  }

  // Nested provenance required fields already covered; fallback for Source provenance object
  if (error.instancePath.includes("/provenance")) {
    if (collectionItemPath(error.instancePath, "sources")) {
      return [
        {
          ruleId: "EVI-L1-005",
          path,
          message: "Source provenance is incomplete",
        },
      ];
    }
  }

  return [];
}

function mapAdditionalProperties(error: AjvError): MappedHit[] {
  const property =
    typeof error.params === "object" &&
    error.params !== null &&
    "additionalProperty" in error.params
      ? String((error.params as { additionalProperty: unknown }).additionalProperty)
      : "";
  const path = additionalPropertyPath(error.instancePath, property);
  return [
    {
      ruleId: "EVI-L1-003",
      path,
      message: "Closed normative object contains an unknown property",
    },
    {
      ruleId: "EVI-L1-018",
      path,
      message: "Document contains a schema-prohibited construct",
    },
  ];
}

function mapConst(error: AjvError): MappedHit[] {
  if (error.instancePath === "/specVersion") {
    return [
      {
        ruleId: "EVI-L1-002",
        path: "/specVersion",
        message: 'specVersion must equal "0.1"',
      },
    ];
  }
  // Source/Evidence/Assertion/Signal/Inference/Recommendation type const
  if (collectionItemPath(error.instancePath, "sources")) {
    return [
      {
        ruleId: "EVI-L1-005",
        path: parentPath(error.instancePath.replace(/\/type$/, "")),
        message: 'Source type must be "Source"',
      },
    ];
  }
  if (collectionItemPath(error.instancePath, "evidence")) {
    return [
      {
        ruleId: "EVI-L1-006",
        path: parentPath(error.instancePath.replace(/\/type$/, "")),
        message: 'Evidence type must be "Evidence"',
      },
    ];
  }
  if (
    collectionItemPath(error.instancePath, "assertions") &&
    error.instancePath.endsWith("/type")
  ) {
    return [
      {
        ruleId: "EVI-L1-007",
        path: parentPath(error.instancePath.replace(/\/type$/, "")),
        message: 'Assertion type must be "Assertion"',
      },
    ];
  }
  if (
    collectionItemPath(error.instancePath, "recommendations") &&
    error.instancePath.endsWith("/type")
  ) {
    return [
      {
        ruleId: "EVI-L1-015",
        path: parentPath(error.instancePath.replace(/\/type$/, "")),
        message: 'Recommendation type must be "Recommendation"',
      },
    ];
  }
  return [];
}

function mapEnum(error: AjvError): MappedHit[] {
  if (error.instancePath.endsWith("/classification")) {
    return [
      {
        ruleId: "EVI-L1-011",
        path: normalizeInstancePath(error.instancePath),
        message: "Assertion classification must be a known enum value",
      },
    ];
  }
  // Relation core type enum failure is part of L1-012 (oneOf)
  if (error.instancePath.endsWith("/type") && collectionItemPath(error.instancePath, "relations")) {
    return [
      {
        ruleId: "EVI-L1-012",
        path: normalizeInstancePath(error.instancePath),
        message: "Relation type must be a core type or namespaced extension",
      },
    ];
  }
  return [];
}

function mapPattern(error: AjvError): MappedHit[] {
  if (error.instancePath.endsWith("/type") && collectionItemPath(error.instancePath, "relations")) {
    return [
      {
        ruleId: "EVI-L1-012",
        path: normalizeInstancePath(error.instancePath),
        message: "Relation type must be a core type or namespaced extension",
      },
    ];
  }
  // ExtensionKey pattern (extensions / externalIds property names, or standalone)
  return [
    {
      ruleId: "EVI-L1-013",
      path: normalizeInstancePath(error.instancePath),
      message: "Extension namespace key must match the approved pattern",
    },
  ];
}

function mapPropertyNames(error: AjvError): MappedHit[] {
  return [
    {
      ruleId: "EVI-L1-013",
      path: normalizeInstancePath(error.instancePath),
      message: "Extension namespace key must match the approved pattern",
    },
  ];
}

function mapMinItems(error: AjvError): MappedHit[] {
  if (
    error.instancePath.endsWith("/evidenceIds") &&
    collectionItemPath(error.instancePath, "assertions")
  ) {
    return [
      {
        ruleId: "EVI-L1-008",
        path: normalizeInstancePath(error.instancePath),
        message: "Assertion evidenceIds must contain at least one ID",
      },
    ];
  }
  if (
    error.instancePath.endsWith("/assertionIds") &&
    collectionItemPath(error.instancePath, "conflicts")
  ) {
    return [
      {
        ruleId: "EVI-L1-014",
        path: normalizeInstancePath(error.instancePath),
        message: "Conflict assertionIds must contain at least two IDs",
      },
    ];
  }
  return [];
}

function mapMinLength(error: AjvError): MappedHit[] {
  // Id minLength:1
  if (error.schemaPath.includes("/$defs/Id") || error.schemaPath.endsWith("/minLength")) {
    return [
      {
        ruleId: "EVI-L1-017",
        path: normalizeInstancePath(error.instancePath),
        message: "ID values must be non-empty strings",
      },
    ];
  }
  return [
    {
      ruleId: "EVI-L1-017",
      path: normalizeInstancePath(error.instancePath),
      message: "ID values must be non-empty strings",
    },
  ];
}

function mapFormat(error: AjvError): MappedHit[] {
  const format =
    typeof error.params === "object" && error.params !== null && "format" in error.params
      ? String((error.params as { format: unknown }).format)
      : "";
  if (format === "date-time") {
    return [
      {
        ruleId: "EVI-L1-016",
        path: normalizeInstancePath(error.instancePath),
        message: "DateTime must be an ISO 8601 date-time string",
      },
    ];
  }
  return [];
}

function mapOneOf(error: AjvError): MappedHit[] {
  if (error.instancePath.endsWith("/type") && collectionItemPath(error.instancePath, "relations")) {
    return [
      {
        ruleId: "EVI-L1-012",
        path: normalizeInstancePath(error.instancePath),
        message: "Relation type must be a core type or namespaced extension",
      },
    ];
  }
  return [];
}

function mapError(error: AjvError): MappedHit[] {
  switch (error.keyword) {
    case "required":
      return mapRequired(error);
    case "additionalProperties":
      return mapAdditionalProperties(error);
    case "const":
      return mapConst(error);
    case "enum":
      return mapEnum(error);
    case "pattern":
      return mapPattern(error);
    case "propertyNames":
      return mapPropertyNames(error);
    case "minItems":
      return mapMinItems(error);
    case "minLength":
      return mapMinLength(error);
    case "format":
      return mapFormat(error);
    case "oneOf":
      return mapOneOf(error);
    case "if":
      // Companion noise for allOf conditionals; the then/required error is mapped.
      return [];
    case "type":
    case "not":
      // Secondary noise under relation type oneOf / similar — covered by primary keywords.
      return [];
    default:
      // Unmapped structural failure still indicates a prohibited/invalid construct.
      return [
        {
          ruleId: "EVI-L1-018",
          path: normalizeInstancePath(error.instancePath),
          message: "Document contains a schema-prohibited construct",
        },
      ];
  }
}

function dedupeKey(hit: MappedHit): string {
  return `${hit.ruleId}\0${hit.path}\0${ERROR}`;
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

/** Convert Ajv errors into Evidensiq L1 diagnostics. */
export function mapAjvErrorsToL1Diagnostics(
  errors: readonly AjvError[] | null | undefined,
): Diagnostic[] {
  const seen = new Set<string>();
  const out: Diagnostic[] = [];

  for (const error of errors ?? []) {
    for (const hit of mapError(error)) {
      const key = dedupeKey(hit);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      out.push({
        ruleId: hit.ruleId,
        level: L1,
        severity: ERROR,
        path: hit.path,
        message: hit.message,
      });
    }
  }

  return sortDiagnostics(out);
}
