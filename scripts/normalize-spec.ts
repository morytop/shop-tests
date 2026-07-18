import { applySchemaDeviations } from './schema-deviations.ts';
import { createHash } from 'node:crypto';

/**
 * The published OpenAPI document of the live API. Hardcoded rather than derived
 * from `@config/env.config`: this module also runs under plain `node` (the
 * generation script), where the path aliases and the dotenv bootstrap don't
 * exist. The freshness contract spec imports this constant so the script and
 * the drift check can never point at different documents.
 */
export const DOCS_URL =
  'https://api.practicesoftwaretesting.com/docs?api-docs.json';

/** Plain parsed-JSON shapes — the OpenAPI doc is walked structurally, untyped. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | JsonObject;
export interface JsonObject {
  [key: string]: JsonValue;
}

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Turns the raw published spec into the document schemas are generated from —
 * pure, so the freshness contract spec can run the identical transformation
 * against the live docs and compare hashes. Three concerns:
 *
 * 1. `openapi: 3.2.0` → `3.1.0`, and the 3.2 `query` operations dropped —
 *    swagger-parser-based tooling (orval included) rejects both, and the
 *    content is otherwise 3.1-compatible (each `query` op duplicates its
 *    sibling `get`, which is what the suite calls).
 * 2. Required-ification: the spec declares no `required` anywhere, so naive
 *    generation yields all-optional schemas that validate `{}` for every
 *    endpoint. Every documented property is therefore interpreted as an
 *    expected property.
 * 3. The known doc/behaviour deviations overlay (`schema-deviations.ts`).
 */
export function normalizeSpec(rawSpec: JsonObject): JsonObject {
  const spec = structuredClone(rawSpec);

  spec.openapi = '3.1.0';

  const paths = spec.paths;
  if (isJsonObject(paths)) {
    for (const pathItem of Object.values(paths)) {
      if (isJsonObject(pathItem)) {
        delete pathItem.query;
      }
    }
  }

  const components = spec.components;
  if (isJsonObject(components)) {
    requiredify(components.schemas);
    requiredify(components.responses);
  }
  requiredify(paths);

  applySchemaDeviations(spec);

  return spec;
}

/**
 * Where an object schema declares `properties` but no `required`, requires all
 * of them. `example`/`examples` subtrees are skipped — a literal `properties`
 * key inside an example is data, not a schema.
 */
function requiredify(node: JsonValue | undefined): void {
  if (Array.isArray(node)) {
    node.forEach(requiredify);
    return;
  }
  if (!isJsonObject(node)) {
    return;
  }
  if (isJsonObject(node.properties) && !('required' in node)) {
    node.required = Object.keys(node.properties);
  }
  for (const [key, value] of Object.entries(node)) {
    if (key !== 'example' && key !== 'examples') {
      requiredify(value);
    }
  }
}

/**
 * Fingerprint of a normalized spec, as committed to `src/api/schemas/spec.hash`
 * and recomputed by the freshness contract spec. Hashing the normalized (not
 * raw) JSON keeps the hash stable across cosmetic re-serializations of the
 * docs endpoint.
 */
export function hashSpec(spec: JsonObject): string {
  return createHash('sha256').update(JSON.stringify(spec)).digest('hex');
}
