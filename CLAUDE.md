# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Playwright + TypeScript end-to-end test suite for the **Toolshop** demo app (https://practicesoftwaretesting.com/#/, source: https://github.com/testsmith-io/practice-software-testing). Tests run against the public production site as a black box — no seeded DB access.

`TEST_PLAN.md` is the living test plan: scope, out-of-scope items, data strategy, the tag taxonomy, and a full feature-area → spec-file mapping. Much of it is now implemented — `tests/ui/` holds `login`, `register`, `forgot-password`, `change-password`, `profile`, `totp-setup`, `cart`, `category`, `checkout-address`, `checkout-e2e`, `checkout-payment`, `checkout-signin`, `favorites`, `product-detail`, `product-filters`, `product-overview`, `product-search`, and `rentals` specs plus `smoke/{homepage,menu}`, `tests/admin/` holds the read-only `dashboard`/`sections` admin smoke sweep, and `tests/api/` holds `users.smoke`; check the per-section status notes in `TEST_PLAN.md` for what each area covers and what's still deferred. TOTP has no spec file of its own: enrolment lives in `totp-setup.spec.ts`, while logging in with a code is covered inside `login.spec.ts`. Check it before writing tests for a feature area, and update its coverage map when adding specs.

`PRODUCT_EXPLORATION.md` is the companion doc: the single consolidated record of what the live app actually does — every doc/behavior discrepancy, the production bugs and security/accessibility smells, the unautomatable items, and the recurring test-design traps. Read it before writing tests for a feature area, and record any further doc/behavior mismatch there (not in `TEST_PLAN.md`). Per-spec implementation notes live in `.ai-docs/*-plan.md`.

## Setup

```
npm install
npx playwright install --with-deps chromium
npx husky
cp .env-template .env   # then set BASE_URL, USER_EMAIL, USER_PASSWORD, ADMIN_EMAIL, ADMIN_PASSWORD
```

`USER_EMAIL`/`USER_PASSWORD` must be a real seeded account (`testUser1` in `src/ui/test-data/user.data.ts`). `ADMIN_EMAIL`/`ADMIN_PASSWORD` are the seeded admin (`adminUser`, documented default `admin@practicesoftwaretesting.com` / `welcome01`), used only by the `@admin` specs. The shared seeded accounts (`customer@`/`admin@practicesoftwaretesting.com`) are read-only fixtures — never use them in destructive tests; register a fresh user via `@faker-js/faker` instead (see `register.spec.ts`). Admin specs in particular must never submit a form (the `/admin/settings` form is app-wide) and must never send the admin a wrong password — 3 failed attempts lock an account permanently.

> **`testUser1` is normally `customer@practicesoftwaretesting.com` itself** — it reads straight from `USER_EMAIL`, so it is _not_ a safe stand-in for "some logged-in user". Any test that mutates its account (password change/reset, TOTP enable, profile edit, disable) must register its own throwaway user instead. Anything that mutates the `@logged` `storageState` session user is also suspect: `tests/setup/login.setup.ts` shares one user across every `@logged` spec in a run.

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

The suite is being refactored toward a layered `src/ui` + `src/api` structure (see `.ai-docs/refactor-layered-architecture-plan.md`). Current state (through Phase 6 — utils, models, factories, the API layer, `storageState`/`@logged` auth, and spec parameterization all exist):

- **Path aliases** (`tsconfig.json`): import via `@src/*` (→ `src/*`) and `@config/*` (→ `config/*`), not deep relative paths. Same-directory siblings may stay relative (`./base.page`). Playwright's esbuild resolves these directly.
- **Config layer** (`config/`): `env.config.ts` loads `.env` (`override: true`) and exports fail-fast, typed `BASE_URL`/`API_URL`/`USER_EMAIL`/`USER_PASSWORD` via `requireEnvVariable()`. `BASE_URL` is the UI host; `API_URL` (`https://api.practicesoftwaretesting.com`) is the separate REST API host the `src/api` layer targets. `global.setup.ts` (wired as `globalSetup`) does a connectivity check against `BASE_URL`.
- **Page Object Model**: `src/ui/pages/*.page.ts`, one class per page, extending `BasePage` (`src/ui/pages/base.page.ts`). Each declares `readonly PAGE_URL` (from `src/ui/constants/page-urls.ts`) and inherits `goto()`. Some pages share an intermediate abstract base rather than extending `BasePage` directly — the home/overview page and every per-category page (`hand-tools`, `power-tools`, `special-tools`, `other`) extend `ProductListPage` (`product-list.page.ts`), which holds the shared grid/filter/search/sort/pagination logic; concrete subclasses only supply their own `PAGE_URL`. `ProductListPage` itself is abstract and so is not registered as a fixture. Shared cross-page pieces (e.g. the nav bar) live in `src/ui/components/` (`navbar.component.ts`).
- **Fixtures inject page objects into tests**: `src/ui/fixtures/page-object.fixture.ts` defines the `Pages` type and exports `pageObjectTest` (Playwright's base `test` extended with one instance of each page object). Global chrome components that render on every page are injected the same way rather than duplicated as fields on page objects: `navbar` (`NavbarComponent`) and `chatWidget` (`ChatWidgetComponent`) are fixtures — specs take `navbar` as an arg for nav links, the cart badge, and the language selector. A second UI fixture layer adds reusable _actions_ on top of the page objects: `src/ui/fixtures/cart-action.fixture.ts` extends `pageObjectTest` into `cartActionTest`, injecting an `addProductToCart(index?, expectedBadgeCount?)` arrange helper shared by the cart and checkout specs (open home → add the product at `index` → await the cart badge via `navbar.waitForCartQuantity()`), and `src/ui/fixtures/admin-action.fixture.ts` extends it into `adminActionTest` with the `loginAsAdmin()` arrange step shared by the admin specs. `src/merge.fixture.ts` composes fixtures via `mergeTests(cartActionTest, adminActionTest, requestObjectTest)` — UI page objects + cart/admin actions and API request objects — and re-exports `expect` (the action fixtures already re-export the page objects, since they extend them). Specs import `{ expect, test }` from `@src/merge.fixture` (not `@playwright/test`) to get all of these as args, e.g. `async ({ registerPage, loginPage }) => {...}`, `async ({ addProductToCart, cartPage, navbar }) => {...}`, or `async ({ usersRequest, loginRequest }) => {...}`.
- **Adding a new page object**: create the `*.page.ts` class under `src/ui/pages/`, then register it in both the `Pages` type and `pageObjectTest` in `src/ui/fixtures/page-object.fixture.ts` — nothing else needs to change.
- **Test data / utils / models / factories**: `src/ui/test-data/` holds fixed data (`user.data.ts` env-backed accounts, `address.data.ts`, `category.data.ts`); `src/ui/utils/` holds pure helpers (`price.util.ts`, `sort.util.ts`); `src/ui/models/` holds typed data shapes (`user`/`address`/`category`); `src/ui/factories/` builds faker data (`prepareRandomUser()`, `makeValidAddress()`). Ad hoc data is generated per-test with `@faker-js/faker` rather than hard-coded, since tests run against shared production data (no hard-coded product IDs/names/prices, no assumptions about a clean category/brand tree — see `TEST_PLAN.md` §3).
- **API layer** (`src/api/`): mirrors the UI layer — `requests/` (`BaseRequest` + `UsersRequest`/`LoginRequest`/`TotpRequest`, hitting `API_URL`), `models/` (snake_case wire payloads), `factories/` (`prepareRandomUserPayload()`/`registerUserWithApi()` reuse the UI `prepareRandomUser()` as the single data source; `getAuthorizationHeader()` → Bearer token; `registerUserWithTotpEnabled()` registers a throwaway user and enrols it in TOTP over the API, for specs that need a 2FA account as a precondition), `fixtures/request-object.fixture.ts` (injects `usersRequest`/`loginRequest`), and `utils/api.util.ts` (the `apiUrls` map of absolute endpoint URLs, since the API host differs from the UI `baseURL`). API factories are the one sanctioned place for `expect()` outside specs. `TotpRequest` is constructed with an auth header rather than injected as a fixture, so it is reached through the factory, not as a test arg.
- **Specs** live under `tests/ui/` (with `tests/ui/smoke/`) and `tests/api/`.
- **Auth via `storageState`** (`playwright.config.ts` project graph): the `setup` project (`tests/setup/login.setup.ts`) registers a fresh user via the API factory, logs in through the UI, and saves the session to `tmp/session.json` (`STORAGE_STATE`, gitignored). The `chromium-logged` project (`dependencies: ['setup']`, `grep: /@logged/`, `storageState`) runs `@logged`-tagged specs already authenticated; the `chromium` project (`grepInvert: /@logged/`) runs everything else. Tag a spec `@logged` to have it start from the saved session instead of logging in inline.

## Test framework

Built on **Playwright Test**. Always check `playwright.config.ts` before writing tests — it defines `testDir` (`./tests`), `baseURL` (imported from `@config/env.config`), timeouts, the `chromium` project/device, and trace/video/screenshot-on-failure settings. `config/global.setup.ts` runs a connectivity check before the run. Run `npm run tsc:check` to typecheck (`tsc --noEmit --strict`).

## Coding standards

**Always follow `CODING_STANDARDS.md`** for Page Object implementation (no `expect()` in page objects — assertions belong only in `*.spec.ts`), Arrange-Act-Assert test structure, comment philosophy (why, not what), locator strategy, and fixture usage patterns. Don't restate those rules here — read that file directly.

## Test tagging

Tag tests using Playwright's native `tag` option, not title-embedded strings (existing specs use the older `@name`-in-title convention — prefer the `tag` option for new tests). Keep tags aligned with the taxonomy in `TEST_PLAN.md` (`@smoke`, `@regression`, `@checkout`, `@auth`, `@admin`, `@a11y`, plus feature tags like `@login`/`@register`).

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
