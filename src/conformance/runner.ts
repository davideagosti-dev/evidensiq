/**
 * Portable deterministic conformance runner (EVI-2.5).
 * Orchestrates existing L1–L4 primitives — not a new semantic engine.
 */

import type { JsonValue } from "../json.js";
import { isJsonValue, jsonEquals, parseJson, serializeJson } from "../parse.js";
import { validateBusinessContext, validateL1 } from "../validate.js";
import { diagnosticMultisetsEqual, diagnosticsFromValidation } from "./diagnostics-compare.js";
import { executeL4Category, isL4CategoryKind } from "./operations.js";
import type {
  ConformanceCaseInput,
  ConformanceCaseLevel,
  ConformanceCaseResult,
  ConformanceErrorIdentity,
  ConformanceExpectation,
  ConformanceStatus,
  ConformanceSuiteOptions,
  ConformanceSuiteResult,
  ConformanceSummary,
  DiagnosticIdentity,
  L4CategoryExpectation,
  RoundTripExpectation,
  ValidationExpectation,
} from "./types.js";

const CASE_LEVELS: readonly ConformanceCaseLevel[] = ["L1", "L2", "L3", "L4"];

function isCaseLevel(value: unknown): value is ConformanceCaseLevel {
  return typeof value === "string" && (CASE_LEVELS as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertCaseShape(input: ConformanceCaseInput): void {
  if (!isRecord(input)) {
    throw new TypeError("Conformance case must be an object");
  }
  if (typeof input.caseId !== "string" || input.caseId.length === 0) {
    throw new TypeError("Conformance case requires non-empty caseId string");
  }
  if (!isCaseLevel(input.level)) {
    throw new TypeError(`Unknown conformance case level: ${String(input.level)}`);
  }
  if (input.skip === true) {
    if (input.skipReason !== undefined && typeof input.skipReason !== "string") {
      throw new TypeError("skipReason must be a string when provided");
    }
    return;
  }
  if (input.skip !== undefined) {
    throw new TypeError("skip must be true when present (explicit skip only)");
  }
  if (input.expectation === undefined && input.expectedError === undefined) {
    throw new TypeError(`Case ${input.caseId}: expectation or expectedError required`);
  }
  if (input.expectation !== undefined) {
    validateExpectation(input.level, input.expectation);
  }
  if (input.expectedError !== undefined) {
    if (!isRecord(input.expectedError) || typeof input.expectedError.name !== "string") {
      throw new TypeError(`Case ${input.caseId}: expectedError.name must be a string`);
    }
  }
}

function validateExpectation(
  level: ConformanceCaseLevel,
  expectation: ConformanceExpectation,
): void {
  if (!isRecord(expectation) || typeof expectation.kind !== "string") {
    throw new TypeError("expectation.kind must be a string");
  }
  const kind = expectation.kind;
  if (level === "L1" || level === "L2") {
    if (kind !== "validation") {
      throw new TypeError(`${level} cases require expectation.kind === "validation"`);
    }
    return;
  }
  if (level === "L3") {
    if (kind !== "roundTripJsonEquals") {
      throw new TypeError('L3 cases require expectation.kind === "roundTripJsonEquals"');
    }
    return;
  }
  if (!isL4CategoryKind(kind)) {
    throw new TypeError(`Unknown L4 category: ${kind}`);
  }
}

function baseResult(
  input: ConformanceCaseInput,
  partial: {
    readonly status: ConformanceStatus;
    readonly expected: ConformanceSummary;
    readonly actual: ConformanceSummary;
    readonly diagnostics?: readonly DiagnosticIdentity[];
    readonly expectedError?: ConformanceErrorIdentity;
    readonly actualError?: ConformanceErrorIdentity;
    readonly reason?: string;
  },
): ConformanceCaseResult {
  return {
    caseId: input.caseId,
    level: input.level,
    ruleIds: input.ruleIds ?? [],
    status: partial.status,
    expected: partial.expected,
    actual: partial.actual,
    ...(partial.diagnostics !== undefined ? { diagnostics: partial.diagnostics } : {}),
    ...(partial.expectedError !== undefined ? { expectedError: partial.expectedError } : {}),
    ...(partial.actualError !== undefined ? { actualError: partial.actualError } : {}),
    ...(partial.reason !== undefined ? { reason: partial.reason } : {}),
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
  };
}

function errorIdentity(error: unknown): ConformanceErrorIdentity {
  if (error instanceof Error) {
    return { name: error.name };
  }
  return { name: "UnknownError" };
}

function diagnosticIdentityKeysForSummary(
  diagnostics: readonly DiagnosticIdentity[],
): ConformanceSummary {
  return diagnostics
    .map((d) => ({
      ruleId: d.ruleId,
      level: d.level,
      severity: d.severity,
      path: d.path,
    }))
    .slice()
    .sort((a, b) => {
      const ka = `${a.ruleId}\0${a.level}\0${a.severity}\0${a.path}`;
      const kb = `${b.ruleId}\0${b.level}\0${b.severity}\0${b.path}`;
      return ka < kb ? -1 : ka > kb ? 1 : 0;
    });
}

function validationDiagnosticsMatch(
  actualDiagnostics: readonly DiagnosticIdentity[],
  expectation: ValidationExpectation,
): boolean {
  if (expectation.expectedDiagnostics !== undefined) {
    return diagnosticMultisetsEqual(actualDiagnostics, expectation.expectedDiagnostics);
  }
  if (expectation.expectedValid) {
    return actualDiagnostics.every((d) => d.severity !== "error");
  }
  return false;
}

function runValidationCase(
  input: ConformanceCaseInput,
  expectation: ValidationExpectation,
): ConformanceCaseResult {
  if (input.document === undefined) {
    throw new TypeError(`Case ${input.caseId}: document required for validation`);
  }

  const validation =
    input.level === "L1" ? validateL1(input.document) : validateBusinessContext(input.document);

  const actualDiagnostics = diagnosticsFromValidation(validation.diagnostics);
  const expectedDiagnostics = expectation.expectedDiagnostics ?? [];
  const validMatch = validation.valid === expectation.expectedValid;
  const diagnosticsMatch = validationDiagnosticsMatch(actualDiagnostics, expectation);
  const pass = validMatch && diagnosticsMatch;

  return baseResult(input, {
    status: pass ? "pass" : "fail",
    expected: {
      valid: expectation.expectedValid,
      diagnostics: diagnosticIdentityKeysForSummary(expectedDiagnostics),
    },
    actual: {
      valid: validation.valid,
      diagnostics: diagnosticIdentityKeysForSummary(actualDiagnostics),
    },
    diagnostics: actualDiagnostics,
  });
}

function runL3Case(
  input: ConformanceCaseInput,
  _expectation: RoundTripExpectation,
): ConformanceCaseResult {
  if (input.document === undefined) {
    throw new TypeError(`Case ${input.caseId}: document required for L3`);
  }
  if (!isJsonValue(input.document)) {
    throw new TypeError(`Case ${input.caseId}: L3 document must be a JSON-safe value`);
  }

  const original = input.document;
  const firstText = serializeJson(original);
  const firstParse = parseJson(firstText);
  if (!firstParse.ok) {
    return baseResult(input, {
      status: "fail",
      expected: { roundTripPreserved: true },
      actual: { roundTripPreserved: false, parseError: firstParse.error },
    });
  }
  const secondText = serializeJson(firstParse.value);
  const secondParse = parseJson(secondText);
  if (!secondParse.ok) {
    return baseResult(input, {
      status: "fail",
      expected: { roundTripPreserved: true },
      actual: { roundTripPreserved: false, parseError: secondParse.error },
    });
  }

  const preserved =
    jsonEquals(original, firstParse.value) && jsonEquals(firstParse.value, secondParse.value);

  return baseResult(input, {
    status: preserved ? "pass" : "fail",
    expected: { roundTripPreserved: true },
    actual: { roundTripPreserved: preserved },
  });
}

function runL4Case(
  input: ConformanceCaseInput,
  expectation: L4CategoryExpectation,
): ConformanceCaseResult {
  if (input.document === undefined) {
    throw new TypeError(`Case ${input.caseId}: document required for L4`);
  }
  const outcome = executeL4Category(input.document, expectation);
  return baseResult(input, {
    status: outcome.pass ? "pass" : "fail",
    expected: outcome.expected as JsonValue,
    actual: outcome.actual as JsonValue,
  });
}

function runExecutableCase(input: ConformanceCaseInput): ConformanceCaseResult {
  const expectation = input.expectation;
  if (expectation === undefined) {
    throw new TypeError(`Case ${input.caseId}: expectation required when not skipped`);
  }

  if (input.level === "L1" || input.level === "L2") {
    if (expectation.kind !== "validation") {
      throw new TypeError(`Case ${input.caseId}: validation expectation required`);
    }
    return runValidationCase(input, expectation);
  }

  if (input.level === "L3") {
    if (expectation.kind !== "roundTripJsonEquals") {
      throw new TypeError(`Case ${input.caseId}: roundTripJsonEquals expectation required`);
    }
    return runL3Case(input, expectation);
  }

  if (!isL4CategoryKind(expectation.kind)) {
    throw new TypeError(`Unknown L4 category: ${expectation.kind}`);
  }
  return runL4Case(input, expectation as L4CategoryExpectation);
}

/**
 * Execute a single in-memory conformance case.
 * Returns pass/fail/skip. Throws only on API misuse / malformed input.
 */
export function runConformanceCase(input: ConformanceCaseInput): ConformanceCaseResult {
  assertCaseShape(input);

  if (input.skip === true) {
    return baseResult(input, {
      status: "skip",
      expected: { skipped: true },
      actual: { skipped: true },
      reason: input.skipReason ?? "explicit skip",
    });
  }

  if (input.expectedError !== undefined) {
    const expectedName = input.expectedError.name;
    try {
      const result = runExecutableCase(input);
      return baseResult(input, {
        status: "fail",
        expected: { error: { name: expectedName } },
        actual: {
          error: null,
          executedStatus: result.status,
          executedActual: result.actual,
        },
        expectedError: { name: expectedName },
      });
    } catch (error: unknown) {
      if (error instanceof TypeError && !(error instanceof RangeError)) {
        // API misuse from our validation / dispatch — rethrow.
        // Note: RangeError is not a TypeError subclass; this keeps misuse loud.
        const message = error.message;
        if (
          message.includes("Unknown") ||
          message.includes("required") ||
          message.includes("must be") ||
          message.includes("expectation")
        ) {
          throw error;
        }
      }
      const actual = errorIdentity(error);
      if (actual.name === expectedName) {
        return baseResult(input, {
          status: "pass",
          expected: { error: { name: expectedName } },
          actual: { error: { name: actual.name } },
          expectedError: { name: expectedName },
          actualError: actual,
        });
      }
      return baseResult(input, {
        status: "fail",
        expected: { error: { name: expectedName } },
        actual: { error: { name: actual.name } },
        expectedError: { name: expectedName },
        actualError: actual,
      });
    }
  }

  try {
    return runExecutableCase(input);
  } catch (error: unknown) {
    if (error instanceof TypeError) {
      throw error;
    }
    const actual = errorIdentity(error);
    return baseResult(input, {
      status: "fail",
      expected: { error: null },
      actual: { error: { name: actual.name } },
      actualError: actual,
      reason: "unexpected exception",
    });
  }
}

/**
 * Execute an ordered suite of conformance cases.
 * Default collect-all. failFast stops only after the first fail (not skip/pass).
 */
export function runConformanceSuite(
  cases: readonly ConformanceCaseInput[],
  options?: ConformanceSuiteOptions,
): ConformanceSuiteResult {
  if (!Array.isArray(cases)) {
    throw new TypeError("runConformanceSuite requires a readonly array of cases");
  }

  const failFast = options?.failFast === true;
  const results: ConformanceCaseResult[] = [];
  let pass = 0;
  let fail = 0;
  let skip = 0;

  for (const conformanceCase of cases) {
    const result = runConformanceCase(conformanceCase);
    results.push(result);
    if (result.status === "pass") {
      pass += 1;
    } else if (result.status === "fail") {
      fail += 1;
      if (failFast) {
        break;
      }
    } else {
      skip += 1;
    }
  }

  return {
    results,
    counts: { pass, fail, skip },
    ok: fail === 0,
  };
}
