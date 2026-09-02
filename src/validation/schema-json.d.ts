/**
 * Ambient module for the authoritative schema JSON import.
 * The schema file lives at specification/ and is shipped once via package files.
 */

declare module "../../specification/business-context.schema.json" {
  const businessContextSchema: Record<string, unknown>;
  export default businessContextSchema;
}
