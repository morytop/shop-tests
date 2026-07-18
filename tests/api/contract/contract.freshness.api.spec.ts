import {
  DOCS_URL,
  hashSpec,
  normalizeSpec,
} from '../../../scripts/normalize-spec';
import type { JsonObject } from '../../../scripts/normalize-spec';
import { expect, test } from '@src/fixtures/merge.fixture';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const SPEC_HASH_PATH = path.resolve(
  __dirname,
  '../../../src/api/schemas/spec.hash',
);

// The drift detector that makes the committed schemas self-updating in effect:
// the live docs are normalized with the exact pipeline the generator uses
// (imported from `scripts/normalize-spec.ts`) and the hash compared to the
// committed one, so any docs deploy — including one that fixes a mismatch the
// deviations overlay currently absorbs — becomes a visible, actionable failure
// instead of silent staleness.
test.describe('API contract — docs freshness', () => {
  test(
    'live API docs match the committed schema snapshot',
    { tag: ['@api', '@contract'] },
    async ({ request }) => {
      const committedHash = (await readFile(SPEC_HASH_PATH, 'utf-8')).trim();

      const response = await request.get(DOCS_URL);

      expect(response.status()).toBe(200);
      const liveSpec = (await response.json()) as JsonObject;
      expect(
        hashSpec(normalizeSpec(liveSpec)),
        "API docs changed — run 'npm run generate:api-schemas', review the diff, and re-run.",
      ).toBe(committedHash);
    },
  );
});
