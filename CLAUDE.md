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

`USER_EMAIL`/`USER_PASSWORD` must be a real seeded account (`testUser1` in `src/test-data/user-data.ts`). The shared seeded accounts (`customer@`/`admin@practicesoftwaretesting.com`) are read-only fixtures — never use them in destructive tests; register a fresh user via `@faker-js/faker` instead (see `register.spec.ts`).

## Commands

```
npx playwright test                          # run all tests
npm run test:headed                          # headed browser
npm run test:ui                              # Playwright UI mode
npx playwright test tests/login.spec.ts      # single file
npx playwright test -g "reject login"        # single test by name
npx playwright test --grep @smoke            # by tag
npm run show-report                          # open last HTML report
npm run lint                                 # eslint, --max-warnings=0
npm run format / npm run format:check        # prettier
```

Husky's pre-commit hook runs `lint` and `format:check` — both must pass to commit.

## Architecture

- **Page Object Model**: `src/pages/*.page.ts`, one class per page, extending `BasePage` (`src/pages/base.page.ts`). Each declares `readonly PAGE_URL` (from `src/constants/page-urls.ts`) and inherits `goto()`. Shared cross-page pieces (e.g. the nav bar) live in `src/components/`.
- **Fixtures inject page objects into tests**: `src/fixtures/pages.ts` defines the `Pages` type and instantiates one of each page object per test; `src/fixtures/main.ts` extends Playwright's base `test` with them. Specs import `test` from `../src/fixtures/main` (not `@playwright/test`) to get page objects as fixture args, e.g. `async ({ registerPage, accountPage, loginPage }) => {...}`.
- **Adding a new page object**: create the `*.page.ts` class, then register it in both the `Pages` type and `pages` export in `src/fixtures/pages.ts` — nothing else needs to change.
- **Test data**: `src/test-data/user-data.ts` exposes env-backed fixed accounts; ad hoc data is generated per-test with `@faker-js/faker` rather than hard-coded, since tests run against shared production data (no hard-coded product IDs/names/prices, no assumptions about a clean category/brand tree — see `test_plan.md` §3).

## Test framework

Built on **Playwright Test**. Always check `playwright.config.ts` before writing tests — it defines `testDir` (`./tests`), `baseURL` (from `BASE_URL` env var), timeouts, the `chromium` project/device, and trace/video/screenshot-on-failure settings. `src/global-setup.ts` reloads `.env` with `override: true` before the run.

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
