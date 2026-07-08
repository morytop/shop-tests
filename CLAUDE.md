# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Playwright + TypeScript end-to-end test suite for the **Toolshop** demo app (https://practicesoftwaretesting.com/#/, source: https://github.com/testsmith-io/practice-software-testing). Tests run against the public production site as a black box — no seeded DB access.

`test_plan.md` is the living test plan: scope, out-of-scope items, data strategy, the tag taxonomy, and a full feature-area → spec-file mapping (most spec files it describes don't exist yet — only `register.spec.ts`, `login.spec.ts`, and the two `smoke/` specs are implemented). It also documents real discrepancies found between the app's docs and actual production behavior. Check it before writing tests for a feature area, and update it when adding specs or finding further doc/behavior mismatches.

## Setup

```
npm install
npx playwright install --with-deps chromium
npx husky
cp .env-template .env   # then set BASE_URL, USER_EMAIL, USER_PASSWORD
```

`USER_EMAIL`/`USER_PASSWORD` must be a real seeded account (`testUser1` in `src/ui/test-data/user.data.ts`). The shared seeded accounts (`customer@`/`admin@practicesoftwaretesting.com`) are read-only fixtures — never use them in destructive tests; register a fresh user via `@faker-js/faker` instead (see `register.spec.ts`).

## Commands

```
npx playwright test                          # run all tests
npm run test:headed                          # headed browser
npm run test:ui                              # Playwright UI mode
npx playwright test tests/ui/login.spec.ts   # single file
npx playwright test -g "reject login"        # single test by name
npx playwright test --grep @smoke            # by tag
npm run show-report                          # open last HTML report
npm run lint                                 # eslint, --max-warnings=0
npm run format / npm run format:check        # prettier
```

Husky's pre-commit hook runs `lint` and `format:check` — both must pass to commit.

## Architecture

The suite is being refactored toward a layered `src/ui` + `src/api` structure (see `.ai-docs/refactor-layered-architecture-plan.md`). Current state (through Phase 6 — utils, models, factories, the API layer, and `storageState`/`@logged` auth all exist; only optional parameterization polish remains):

- **Path aliases** (`tsconfig.json`): import via `@src/*` (→ `src/*`) and `@config/*` (→ `config/*`), not deep relative paths. Same-directory siblings may stay relative (`./base.page`). Playwright's esbuild resolves these directly.
- **Config layer** (`config/`): `env.config.ts` loads `.env` (`override: true`) and exports fail-fast, typed `BASE_URL`/`API_URL`/`USER_EMAIL`/`USER_PASSWORD` via `requireEnvVariable()`. `BASE_URL` is the UI host; `API_URL` (`https://api.practicesoftwaretesting.com`) is the separate REST API host the `src/api` layer targets. `global.setup.ts` (wired as `globalSetup`) does a connectivity check against `BASE_URL`.
- **Page Object Model**: `src/ui/pages/*.page.ts`, one class per page, extending `BasePage` (`src/ui/pages/base.page.ts`). Each declares `readonly PAGE_URL` (from `src/ui/constants/page-urls.ts`) and inherits `goto()`. Shared cross-page pieces (e.g. the nav bar) live in `src/ui/components/` (`navbar.component.ts`).
- **Fixtures inject page objects into tests**: `src/ui/fixtures/page-object.fixture.ts` defines the `Pages` type and exports `pageObjectTest` (Playwright's base `test` extended with one instance of each page object). `src/merge.fixture.ts` composes fixtures via `mergeTests(pageObjectTest, requestObjectTest)` — page objects (UI) and API request objects — and re-exports `expect`. Specs import `{ expect, test }` from `@src/merge.fixture` (not `@playwright/test`) to get both kinds of fixture as args, e.g. `async ({ registerPage, loginPage }) => {...}` or `async ({ usersRequest, loginRequest }) => {...}`.
- **Adding a new page object**: create the `*.page.ts` class under `src/ui/pages/`, then register it in both the `Pages` type and `pageObjectTest` in `src/ui/fixtures/page-object.fixture.ts` — nothing else needs to change.
- **Test data / utils / models / factories**: `src/ui/test-data/` holds fixed data (`user.data.ts` env-backed accounts, `address.data.ts`, `category.data.ts`); `src/ui/utils/` holds pure helpers (`price.util.ts`, `sort.util.ts`); `src/ui/models/` holds typed data shapes (`user`/`address`/`category`); `src/ui/factories/` builds faker data (`prepareRandomUser()`, `makeValidAddress()`). Ad hoc data is generated per-test with `@faker-js/faker` rather than hard-coded, since tests run against shared production data (no hard-coded product IDs/names/prices, no assumptions about a clean category/brand tree — see `test_plan.md` §3).
- **API layer** (`src/api/`): mirrors the UI layer — `requests/` (`BaseRequest` + `UsersRequest`/`LoginRequest`, hitting `API_URL`), `models/` (snake_case wire payloads), `factories/` (`prepareRandomUserPayload()`/`registerUserWithApi()` reuse the UI `prepareRandomUser()` as the single data source; `getAuthorizationHeader()` → Bearer token), and `fixtures/request-object.fixture.ts` (injects `usersRequest`/`loginRequest`). API factories are the one sanctioned place for `expect()` outside specs.
- **Specs** live under `tests/ui/` (with `tests/ui/smoke/`) and `tests/api/`.
- **Auth via `storageState`** (`playwright.config.ts` project graph): the `setup` project (`tests/setup/login.setup.ts`) registers a fresh user via the API factory, logs in through the UI, and saves the session to `tmp/session.json` (`STORAGE_STATE`, gitignored). The `chromium-logged` project (`dependencies: ['setup']`, `grep: /@logged/`, `storageState`) runs `@logged`-tagged specs already authenticated; the `chromium` project (`grepInvert: /@logged/`) runs everything else. Tag a spec `@logged` to have it start from the saved session instead of logging in inline.

## Test framework

Built on **Playwright Test**. Always check `playwright.config.ts` before writing tests — it defines `testDir` (`./tests`), `baseURL` (imported from `@config/env.config`), timeouts, the `chromium` project/device, and trace/video/screenshot-on-failure settings. `config/global.setup.ts` runs a connectivity check before the run. Run `npm run tsc:check` to typecheck (`tsc --noEmit --strict`).

## Coding standards

**Always follow `CODING_STANDARDS.md`** for Page Object implementation (no `expect()` in page objects — assertions belong only in `*.spec.ts`), Arrange-Act-Assert test structure, comment philosophy (why, not what), locator strategy, and fixture usage patterns. Don't restate those rules here — read that file directly.

## Test tagging

Tag tests using Playwright's native `tag` option, not title-embedded strings (existing specs use the older `@name`-in-title convention — prefer the `tag` option for new tests). Keep tags aligned with the taxonomy in `test_plan.md` (`@smoke`, `@regression`, `@checkout`, `@auth`, `@admin`, `@a11y`, plus feature tags like `@login`/`@register`).

```typescript
test('reject login with incorrect credentials', { tag: ['@auth', '@login'] }, async ({ loginPage }) => {
  ...
});

test('register with correct data and login', { tag: ['@smoke', '@auth', '@register'] }, async ({ registerPage }) => {
  ...
});
```

## Conventional commits

```
<type>: <description>
```

Types: `feat` (new feature/test), `fix` (bug fix), `docs`, `test`, `chore` (deps/config/maintenance).

Rules: lowercase, no trailing period, imperative mood ("add" not "added"), keep under 50 characters.

Examples: `feat: add smoke test for homepage title`, `fix: correct login button selector`, `test: add account lockout test`, `chore: update playwright to v1.61.0`.
