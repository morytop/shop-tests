/* eslint-disable no-console */
import { DOCS_URL, hashSpec, normalizeSpec } from './normalize-spec.ts';
import type { JsonObject } from './normalize-spec.ts';
import { mkdir, writeFile } from 'node:fs/promises';
import { generate } from 'orval';

/**
 * Regenerates `src/api/schemas/` from the live API docs:
 * fetch → normalize (see `normalize-spec.ts`) → orval (Zod client mode,
 * strict responses) → committed schema file + spec hash.
 *
 * Run from the repo root: `npm run generate:api-schemas`. The output is
 * committed, never hand-edited — contract changes land as reviewable diffs,
 * and the freshness contract spec flags when the live docs have drifted from
 * the committed hash.
 */
const NORMALIZED_SPEC_PATH = 'tmp/api-docs.normalized.json';
const SCHEMAS_TARGET = 'src/api/schemas/toolshop.zod.ts';
const SPEC_HASH_PATH = 'src/api/schemas/spec.hash';

async function main(): Promise<void> {
  console.log(`Fetching ${DOCS_URL} ...`);
  const response = await fetch(DOCS_URL);
  if (!response.ok) {
    throw new Error(
      `Fetching the API docs failed: ${response.status} ${response.statusText}`,
    );
  }
  const spec = normalizeSpec((await response.json()) as JsonObject);

  await mkdir('tmp', { recursive: true });
  await writeFile(NORMALIZED_SPEC_PATH, JSON.stringify(spec, null, 2));

  await generate({
    input: NORMALIZED_SPEC_PATH,
    output: {
      mode: 'single',
      client: 'zod',
      target: SCHEMAS_TARGET,
      // Strict response objects fail on undocumented keys — without this (and
      // the normalizer's required-ification) every schema accepts `{}` and the
      // contract suite validates nothing.
      override: { zod: { strict: { response: true } } },
    },
  });

  await writeFile(SPEC_HASH_PATH, `${hashSpec(spec)}\n`);
  console.log(`Wrote ${SCHEMAS_TARGET} and ${SPEC_HASH_PATH}.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
