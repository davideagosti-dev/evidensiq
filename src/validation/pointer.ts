/**
 * RFC 6901 JSON Pointer helpers for diagnostics.
 */

/** Escape a single path segment per RFC 6901. */
export function escapePointerSegment(segment: string): string {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}

/**
 * Normalize Ajv instancePath to Evidensiq diagnostic root path.
 * Empty Ajv path becomes "/".
 */
export function normalizeInstancePath(instancePath: string): string {
  if (instancePath === "") {
    return "/";
  }
  return instancePath;
}

/** Append an escaped property/index segment to a normalized pointer. */
export function appendPointerSegment(parentPath: string, segment: string): string {
  const escaped = escapePointerSegment(segment);
  if (parentPath === "/") {
    return `/${escaped}`;
  }
  return `${parentPath}/${escaped}`;
}
