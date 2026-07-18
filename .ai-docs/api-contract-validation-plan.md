# Plan: API contract (schema) validation from the live OpenAPI docs

> Drafted 2026-07-18 from a hands-on feasibility spike against the live spec
> (`https://api.practicesoftwaretesting.com/docs?api-docs.json`, Toolshop API 5.0.0,
> `openapi: 3.2.0`) — every claim below about tool behaviour was verified by actually running
> the tools against the real spec and validating live responses.

## Goal

Add contract/schema validation to `tests/api/**` so response bodies are checked against the
published API documentation — without hand-writing one Zod schema per endpoint. Schemas are
**generated from the live OpenAPI doc**, so the contract under test is always the documented
contract, and a docs change costs one regeneration command instead of a manual schema edit.

## Decision: orval (Zod client mode) over the alternatives

Three approaches were evaluated; two were run against the real spec.

### Chosen: `orval` with `client: 'zod'`

- Generates **one standalone Zod schema per operation** (`GetProductsResponse`,
  `GetProductResponse`, `SearchProductResponse`, …) — exactly the granularity contract
  assertions need. Output imports only `zod`; no client runtime, no HTTP layer, so it slots
  under the existing `BaseRequest` architecture instead of competing with it.
- Actively maintained (v8.22.0 verified working); supports `override.zod.strict.response`
  (emits `zod.strictObject`, failing on undocumented keys) — a knob we need (see
  "Strictness" below).
- Has a programmatic API (`import { generate } from 'orval'`), so the whole
  fetch → normalize → generate pipeline is one Node script.

### Rejected: `openapi-zod-client`

Verified working after the same spec normalization, but it emits a **Zodios client**
(~3.1k lines, extra `@zodios/core` dependency) with schemas at the _component_ level, not
per-operation — inline response schemas like the `PaginatedProductResponse` envelope come out
as anonymous inline objects tied to the client's endpoint table. Extracting per-endpoint
response schemas from it is clumsier than orval's direct exports, and the project is less
actively maintained.

### Rejected: no-codegen runtime validation (ajv against the fetched spec)

Fetch the spec in `globalSetup`, dereference it, and validate `(path, method, status)`
responses with ajv at runtime. Zero generated files, but: no static types, two new deps
(`ajv` + a `$ref` resolver that copes with the 3.2 spec), validation logic and the
known-deviations policy end up as runtime string-keyed lookups instead of reviewable code,
and a docs deploy mid-run changes the contract non-deterministically. The committed-codegen
route keeps runs deterministic and makes contract changes visible in PR diffs.

## Spike findings that shape the design (all reproduced 2026-07-18)

1. **The spec declares `openapi: 3.2.0`** — every swagger-parser-based tool (both candidates)
   rejects it outright. The document's content is 3.1-compatible: patching the version field
   to `3.1.0` parses cleanly (its `"type": ["integer","null"]` unions are legal 3.1, illegal
   3.0 — so patch to 3.1, not 3.0).
2. **Seven path items carry OpenAPI 3.2 `query` operations** (the new HTTP QUERY method) on
   `/products`, `/brands/search`, `/categories/tree`, `/categories/search`, `/products/search`,
   `/invoices/search`, `/users/search`. Each is a duplicate of the sibling `get`. Orval's
   validator rejects them under 3.1 — the normalizer strips them (nothing is lost; the suite
   calls GET).
3. **No schema in the spec declares `required` or `additionalProperties`.** Naive generation
   therefore yields all-optional, unknown-keys-ignored schemas — such "validation" passes
   `{}` for every endpoint and catches nothing. The normalizer must **required-ify**
   (`required = Object.keys(properties)` on every object schema) and generation must use
   **strict** response objects. Both were tested; see next point.
4. **Strict + required validation against live responses works and immediately caught real
   doc/behaviour mismatches** (`GET /brands` and `GET /categories/tree` pass clean):
   - nested `brand` in product responses omits `slug` (doc reuses the full `BrandResponse` ref);
   - nested `category` in product responses omits `parent_id` and `sub_categories`;
   - `GET /products/{id}` returns an undocumented `specs` key.
     These are findings for `PRODUCT_EXPLORATION.md` **and** proof we need a known-deviations
     overlay so the suite stays green while the docs are wrong.
5. **Live drift is otherwise low**: top-level `ProductResponse` fields and the pagination
   envelope match the live API key-for-key. Strict mode is viable, not aspirational.
6. Versions verified compatible: orval 8.22.0 output runs on zod 4.4.3, Node v24.17.0
   (which runs `.ts` scripts natively via type stripping — no ts-node/tsx needed).

## Architecture

```
scripts/
  generate-api-schemas.ts     # fetch → normalize → orval → src/api/schemas/
  schema-deviations.ts        # known doc/behaviour mismatch overlay (each entry cites PRODUCT_EXPLORATION.md §)
src/api/schemas/
  toolshop.zod.ts             # GENERATED, committed — one Zod schema per operation
  spec.hash                   # GENERATED, committed — hash of the normalized live spec
src/api/utils/
  schema.util.ts              # expectToMatchSchema() helper
tests/api/contract/
  contract.anonymous.api.spec.ts   # public read endpoints
  contract.logged.api.spec.ts      # customer-authenticated endpoints
  contract.freshness.api.spec.ts   # live docs hash === committed hash
```

### The generation script (`scripts/generate-api-schemas.ts`, run via `npm run generate:api-schemas`)

1. Fetch `https://api.practicesoftwaretesting.com/docs?api-docs.json` (hardcode the docs URL
   in the script or derive from `API_URL`; note `Accept: application/json` is _not_ needed here —
   it's a static doc, but keep the fetch dumb and side-effect free).
2. **Normalize** (pure function, unit-testable if we ever care):
   - `openapi: '3.2.0'` → `'3.1.0'`;
   - delete every path item's `query` operation;
   - required-ify every object schema (walk `components.schemas`, `components.responses`,
     `paths`; where `properties` exists and `required` doesn't, set
     `required = Object.keys(properties)`);
   - apply the **deviations overlay** from `scripts/schema-deviations.ts` (see below).
3. Write the normalized spec to `tmp/api-docs.normalized.json` (already gitignored via
   `/tmp/*.json`).
4. Run orval programmatically:
   ```ts
   await generate({
     input: 'tmp/api-docs.normalized.json',
     output: {
       mode: 'single',
       client: 'zod',
       target: 'src/api/schemas/toolshop.zod.ts',
       override: { zod: { strict: { response: true } } },
     },
   });
   ```
5. Write `src/api/schemas/spec.hash` — SHA-256 of the _normalized_ spec JSON (normalized, so
   cosmetic re-serialization of the docs doesn't trip the freshness test).

Output is **committed**, not regenerated per run: deterministic CI, contract changes reviewed
as diffs, and no dependency on the docs endpoint being up mid-run. Drift detection is a test
(below), not a global-setup failure that would block unrelated UI runs.

### The deviations overlay (`scripts/schema-deviations.ts`)

A small list of targeted spec mutations, applied during normalization, one entry per known
doc/behaviour mismatch, each with a comment citing its `PRODUCT_EXPLORATION.md` section.
Seed entries (from the spike):

| Deviation                                                                  | Overlay action                                           |
| -------------------------------------------------------------------------- | -------------------------------------------------------- |
| Nested `brand` in product responses has no `slug`                          | drop `slug` from `BrandResponse.required`                |
| Nested `category` in product responses has no `parent_id`/`sub_categories` | drop both from `CategoryResponse.required`               |
| `GET /products/{id}` returns undocumented `specs`                          | add optional `specs` array property to `ProductResponse` |

Policy: a contract failure is triaged like any other doc/behaviour mismatch — record it in
`PRODUCT_EXPLORATION.md`, then either it's an API regression (leave the test red / report it)
or a stale doc (add an overlay entry citing the section). When the docs get fixed, the
freshness test flags the change, regeneration removes the need for the entry, and the entry
is deleted.

### The assertion helper (`src/api/utils/schema.util.ts`)

```ts
export async function expectToMatchSchema(
  response: APIResponse,
  schema: ZodType,
): Promise<void> {
  const result = schema.safeParse(await response.json());
  expect(result.success, formatZodIssues(result)).toBe(true);
}
```

- Formats `result.error.issues` into the failure message (path + expected/received), so a red
  contract test names the drifted field instead of dumping `success: false`.
- Lives in `utils/`, used from specs — consistent with "assertions belong in specs" since it
  _is_ the assertion (same sanctioned pattern as API factories). If it reads nicer, an
  `expect.extend` custom matcher (`expect(body).toMatchSchema(GetProductsResponse)`) is an
  acceptable variant — decide at implementation time; the helper form is simpler under the
  current fixture merge.

### The contract specs (`tests/api/contract/`)

Data-driven where possible, tagged `@api @contract` (add `@contract` to the `TEST_PLAN.md`
taxonomy). Three files:

1. **`contract.anonymous.api.spec.ts`** — public reads, no auth, no writes: `GET /products`
   (+ `?page=2`, `/search`, `/{id}`, `/{id}/related`), `/brands` (+ `/search`, `/{id}`),
   `/categories` (+ `/tree`, `/search`, `/{id}`), `/images`, `/product-specs/names`. IDs
   resolved live from list calls (no hard-coded IDs — TEST_PLAN §3). Uses the existing
   anonymous request fixtures.
2. **`contract.logged.api.spec.ts`** — one spec file so the run registers as few throwaway
   users as the fixtures allow (each `*RequestLogged` use writes a permanent user):
   `POST /users/register`, `POST /users/login`, `GET /users/me`, cart lifecycle
   (`POST /carts`, `GET /carts/{id}`), favorites (`POST` + `GET /favorites`), invoices
   (`POST /invoices` via `createInvoiceWithApi()` arrange, `GET /invoices/{id}`), messages
   (`POST /messages`). Reuse the existing factories/fixtures for arranges
   (`registerUserWithApi()`, `addFavoritesWithApi()`, `createInvoiceWithApi()`,
   `sendMessageWithApi()`, `cartsRequest`) — no new arrange code.
3. **`contract.freshness.api.spec.ts`** — fetches the live docs JSON, runs the same
   `normalize()` (import it from the script — export the pure function), hashes, compares to
   the committed `src/api/schemas/spec.hash`. On mismatch, fails with:
   `"API docs changed — run 'npm run generate:api-schemas', review the diff, and re-run."`
   This is the piece that makes the setup _self-updating in effect_: docs drift becomes a
   visible, actionable test failure rather than silent staleness.

Out of scope for contract specs (consistent with existing scope decisions): admin-only
endpoints beyond what `*RequestAdmin` already GETs, catalog writes (negative-only rule),
`DELETE`s of shared data, error-response shapes (422/404 envelopes — could be a later phase).

## Implementation phases (each lands as its own green PR)

### Phase 1 — pipeline + anonymous contract specs

1. `npm i -D orval zod` (zod is needed at test runtime for the generated file; both stay in
   `devDependencies` like everything else here).
2. Add `scripts/generate-api-schemas.ts` + `scripts/schema-deviations.ts` (normalize exported
   as a pure function; runs under plain `node` on Node ≥ 23 type stripping).
3. Add npm script: `"generate:api-schemas": "node scripts/generate-api-schemas.ts"`.
4. Generate and commit `src/api/schemas/toolshop.zod.ts` + `spec.hash`.
5. Exclude the generated file from lint/format noise: add `src/api/schemas/toolshop.zod.ts`
   to `.prettierignore` and eslint `ignorePatterns` (in `.eslintrc.json`); it must still pass
   `tsc:check` (verify — the spike output is clean TS).
6. Add `src/api/utils/schema.util.ts` (`expectToMatchSchema` + issue formatter).
7. Add `tests/api/contract/contract.anonymous.api.spec.ts` + `contract.freshness.api.spec.ts`.
8. Record the three spike-found doc mismatches in `PRODUCT_EXPLORATION.md`; the overlay
   entries cite the new sections.
9. Update `TEST_PLAN.md` (coverage map + `@contract` tag) and `CLAUDE.md` (one paragraph in
   the API-layer section: what `src/api/schemas/` is, that it's generated — never hand-edited —
   and the regeneration command).

### Phase 2 — authenticated contract specs

10. `tests/api/contract/contract.logged.api.spec.ts` per the design above, reusing existing
    factories. Budget: this file should register at most 1–2 throwaway users total.

### Phase 3 (optional, later) — deepen

- Error-shape contracts (422 `UnprocessableEntityResponse`, 404 `ItemNotFoundResponse`) —
  the spec documents them; validate on the _existing_ negative specs' responses via
  `expectToMatchSchema` rather than new arranges.
- Sprinkle `expectToMatchSchema` into existing happy-path specs where the response is already
  in hand (e.g. `products.read.api.spec.ts`), replacing field-by-field shape assertions while
  keeping the behavioural ones (sorting, filtering, relatedness).
- Consider generating request/response **types** from the same pipeline to eventually replace
  the hand-written `src/api/models/*.api.model.ts` (orval can emit TS types alongside zod).
  Not now — keep the first landing small.

## Verification

- `npm run generate:api-schemas` twice in a row → second run produces no git diff
  (determinism).
- `npx playwright test --project=api tests/api/contract` → anonymous + freshness specs green.
- Mutate one field in a committed schema by hand and re-run → the corresponding contract spec
  fails naming the field (proves assertions bite); revert.
- Temporarily remove one overlay entry and regenerate → `GET /products/{id}` contract fails on
  `specs`/`slug` (proves the overlay is load-bearing); revert.
- `npm run lint`, `npm run format:check`, `npm run tsc:check` all pass (pre-commit gate).

## Risks / limitations (accepted)

- **The spec's own quality bounds the contract.** No `required` in the source docs means our
  required-ification is an _interpretation_ (documented field ⇒ expected field). It's the
  interpretation that makes the tests worth having, and the overlay absorbs the places it's
  wrong.
- **A docs deploy changes `spec.hash`** even for cosmetic edits → freshness test fails until
  regeneration. That's by design (drift should be visible), and remediation is one command.
- **OpenAPI 3.2 normalization is a workaround** that will be needed until swagger-parser-based
  tooling supports 3.2; if the docs later add 3.2-only constructs beyond `query` ops, the
  normalizer grows. The freshness test guarantees we notice.
