# Refactor Plan — shop-tests → layered (ui/api) architecture

## Context

`shop-tests` is a Playwright + TypeScript E2E suite for the Toolshop demo app. The
current `src/` is a single flat layer (`pages/`, `components/`, `constants/`,
`fixtures/`, `test-data/`) with **no** `utils/`, `factories/`, `models/`, `config/`,
or API layer. As coverage has grown, spec files have accumulated things that don't
belong in them:

- **Duplicated pure helpers** — `parsePrice` in 3 specs (in two inconsistent variants),
  `isSortedBy` in 2 specs, plus an inline `localeCompare` name-sort in a third.
- **Inline data + faker blocks** — the `validAddress` literal, and the 12-field faker
  user-registration block duplicated across `register.spec.ts` and
  `checkout-address.spec.ts` (same password/DOB recipes).
- **Inline data models** — the `CategoryName` union + slug table.
- **A 12-positional-argument `RegisterPage.register()`** that every caller must line up.
- **UI-only auth** — the logged-in checkout test re-registers a user through the UI every
  run; there is no `storageState`.

The goal is to evolve — **incrementally, keeping the suite green after every phase** —
toward the layered structure proven by the reference project
`pw2-codebase/.../L11-solution-ddt-gui`: a `src/ui` + `src/api` mirror joined by a
`merge.fixture`, faker **factories** producing typed **models**, shared **utils**, a
**config** layer, path aliases, and a `storageState`-backed `@logged` auth pattern. This
is not a rewrite — existing Page Objects, the fixture-injection mechanism, and the
black-box test approach all stay; we relocate and extract around them.

Decisions locked with the user:

1. **Mirrored `src/ui` + `src/api`** split (not flat).
2. **API layer = scaffold + one real use**: `BaseRequest`, users/login requests, a
   register-user-via-API factory, wired into auth setup.
3. **Add `tsconfig.json` with path aliases** (`@src/*`, `@config/*`).
4. **Add `storageState` + `@logged`** setup-project pattern.

---

## Target structure

```
config/
    env.config.ts                 # requireEnvVariable() + typed BASE_URL/USER_EMAIL/USER_PASSWORD; dotenv override
    global.setup.ts               # connectivity check + stale session cleanup (moved from src/global-setup.ts)
  tmp/
    .gitkeep                      # session.json lives here (gitignored)
  src/
    merge.fixture.ts              # export test = mergeTests(pageObjectTest, requestObjectTest)
    ui/
      pages/                      # all existing *.page.ts (moved from src/pages)
      components/
        navbar.component.ts       # moved from src/components/navbar.ts
      constants/
        page-urls.ts              # moved from src/constants
      models/
      user.model.ts             # RegisterUser, LoginUser
      address.model.ts          # Address, AddressTextField
      category.model.ts         # CategoryName, Category
    factories/
      user.factory.ts           # prepareRandomUser() + UserFactory.randomUser(page)
      address.factory.ts        # makeValidAddress()
    fixtures/
      page-object.fixture.ts    # current src/fixtures/pages.ts logic
    test-data/
      user.data.ts              # testUser1 (from config/env.config)
      address.data.ts           # ADDRESS_MAX_LENGTHS
    utils/
      price.util.ts             # parsePrice
      sort.util.ts              # isSorted (numeric + string comparators)
  api/
    requests/
      base.request.ts           # BaseRequest superclass
      users.request.ts          # UsersRequest.post(payload)
      login.request.ts          # LoginRequest.post(loginData)
    models/
      user.api.model.ts         # UserRegisterPayload
      login.api.model.ts        # LoginData
      headers.api.model.ts      # Headers
    factories/
      user-register.api.factory.ts    # adapts prepareRandomUser() -> wire payload
      authorization-header.api.factory.ts  # login -> Bearer header
    fixtures/
      request-object.fixture.ts # injects usersRequest / loginRequest
    utils/
      api.util.ts               # apiUrls map
tests/
  ui/                           # existing specs move here
  api/                          # future api specs (empty scaffold for now)
  setup/
    login.setup.ts              # registers via API, logs in, saves storageState
tsconfig.json                   # baseUrl "." + paths @src/* @config/*
playwright.config.ts            # STORAGE_STATE const + project graph (setup -> chromium-logged)
```

Reference files to model each new file on (read before writing):

- `pw2-codebase/.../L11-solution-ddt-gui/config/env.config.ts` — `requireEnvVariable`.
- `.../src/api/requests/base.request.ts` + `articles.request.ts` — request-object shape.
- `.../src/api/factories/authorization-header.api.factory.ts` — login→Bearer.
- `.../src/api/fixtures/request-object.fixture.ts` — anon vs `Logged` request variants.
- `.../src/merge.fixture.ts` — `mergeTests`.
- `.../tests/ui/setup/login.setup.ts` + its `playwright.config.ts` project graph.

---

## Phase 0 — Tooling foundation (no behavior change)

1. Add root `tsconfig.json`: `baseUrl: "."`, `paths: { "@src/*": ["src/*"], "@config/*": ["config/*"] }`, plus `module: "CommonJS"`, `target: "ESNext"`, `strict: true`, `esModuleInterop: true`, `skipLibCheck: true`. Playwright's esbuild reads these paths directly — no runtime resolver needed.
2. Add `"tsc:check": "tsc --noEmit --strict"` to `package.json` scripts (add `typescript` devDep if not already transitively present). Add to the husky/CI checks.
3. Create `tmp/.gitkeep`; add `tmp/session.json` (or `tmp/*.json`) to `.gitignore`.
4. Confirm `.prettierrc.json` import-sort plugin still orders alias imports acceptably (the trivago plugin sorts `@src`/`@config` groups fine).

**Verify:** `npx tsc --noEmit` passes; `npx playwright test` unchanged (all green). Commit: `chore: add tsconfig with path aliases`.

---

## Phase 1 — Establish the `ui/` + `api/` skeleton and move existing files

This is the one large, atomic move. Do it as a single commit so the suite is green
before and after. No logic changes — pure relocation + import rewrites to aliases.

1. **Config layer:**
   - Create `config/env.config.ts` with `requireEnvVariable()` exporting `BASE_URL`, `USER_EMAIL`, `USER_PASSWORD`, and `dotenv.config({ override: true })` at top (replaces the `?? '[NOT SET]'` fallbacks — fail-fast instead).
   - Move `src/global-setup.ts` → `config/global.setup.ts`; repurpose it for a connectivity check + stale `session.json` cleanup (dotenv now lives in `env.config`). Update `globalSetup` path in `playwright.config.ts`.
   - Change `playwright.config.ts` `baseURL` to import `BASE_URL` from `@config/env.config`.
2. **Move UI files** (update every import to `@src/...`):
   - `src/pages/*` → `src/ui/pages/*`
   - `src/components/navbar.ts` → `src/ui/components/navbar.component.ts` (rename class file per reference convention; class name `NavbarComponent` unchanged)
   - `src/constants/page-urls.ts` → `src/ui/constants/page-urls.ts`
   - `src/test-data/user-data.ts` → `src/ui/test-data/user.data.ts` (now sources `USER_EMAIL`/`USER_PASSWORD` from `@config/env.config`; type `testUser1` as `LoginUser` in Phase 3).
   - `src/fixtures/pages.ts` → `src/ui/fixtures/page-object.fixture.ts` (keep the `Pages` type + `pages` export mechanism verbatim; only the imports change to aliases). Export a `pageObjectTest = base.extend<Pages>({ ...pages })`.
3. **Create `src/merge.fixture.ts`:** `export const test = mergeTests(pageObjectTest);` and `export { expect } from '@playwright/test';` (API fixture added in Phase 5). This replaces `src/fixtures/main.ts`.
4. **Move specs** `tests/*.spec.ts` → `tests/ui/*.spec.ts` (and `tests/smoke` stays under `tests/ui/smoke` or top-level `tests/ui`). Update each spec's import from `../src/fixtures/main` → `@src/merge.fixture`, and `expect` import to come from `@src/merge.fixture`. Adjust `testDir`/`testMatch` in `playwright.config.ts` if needed (keep `testDir: './tests'`).

**Verify after move:** `npm run lint` (max-warnings=0), `npx tsc --noEmit`, `npx playwright test` — all green. Commit: `refactor: split src into ui/api layers with aliases`.

---

## Phase 2 — Extract pure utils (kills the biggest duplication)

1. `src/ui/utils/price.util.ts` → `export function parsePrice(text: string): number` using the **canonical `.trim()` variant** (reconcile the two inconsistent copies to the more robust one): `Number(text.replace('$', '').trim())`.
2. `src/ui/utils/sort.util.ts`:
   - `export function isSorted(values: number[], comparator: (a: number, b: number) => boolean): boolean` (the existing `isSortedBy` body).
   - Add a string-aware companion so the name-sort tests reuse it instead of inline `localeCompare`, e.g. `export function isSortedByString(values: string[], direction: 'asc' | 'desc'): boolean`.
3. Update consumers, deleting local copies:
   - `tests/ui/cart.spec.ts` — remove local `parsePrice`, import it.
   - `tests/ui/category.spec.ts` — remove local `parsePrice` + `isSortedBy`, import both.
   - `tests/ui/product-filters.spec.ts` — remove local `parsePrice` + `isSortedBy`; import; and replace the two inline `localeCompare` name-sort `expect.poll` blocks with `isSortedByString`.

**Verify:** targeted runs — `npx playwright test tests/ui/cart.spec.ts tests/ui/category.spec.ts tests/ui/product-filters.spec.ts`; then `npm run lint`. Commit: `refactor: extract price and sort utils`.

---

## Phase 3 — Extract data models

1. `src/ui/models/user.model.ts`:
   - `export interface RegisterUser { firstName; lastName; dateOfBirth; country; street; postcode; houseNumber; city; state; phone; email; password }` (all `string`).
   - `export interface LoginUser { email: string; password: string }`.
2. `src/ui/models/address.model.ts`: move `Address` and `AddressTextField` out of `checkout-address.page.ts` into here; the page object imports them back (keeps the POM free of exported data types). Move `ADDRESS_MAX_LENGTHS` (validation data, not a type) to `src/ui/test-data/address.data.ts`; both the page and the boundary-loop spec import it from there.
3. `src/ui/models/category.model.ts`: `export type CategoryName = 'Hand Tools' | 'Power Tools' | 'Other' | 'Special Tools';` and `export interface Category { name: CategoryName; slug: string }`. Move the `categories` table into `src/ui/test-data/category.data.ts` (or keep it in the spec but typed from the model). Update `category.spec.ts` to import the union/table.
4. Type `testUser1` in `user.data.ts` as `LoginUser`.

**Verify:** `npx tsc --noEmit`; run `category.spec.ts` + `checkout-address.spec.ts`. Commit: `refactor: extract user, address, category models`.

---

## Phase 4 — Extract factories + collapse `RegisterPage.register()`

1. `src/ui/factories/user.factory.ts` (models on the reference `UserFactory` + the user's own example):
   - `export function prepareRandomUser(): RegisterUser` — the centralized faker block (single home for the DOB recipe `birthdate({min:18,max:65,mode:'age'}).toLocaleDateString('en-CA')` and the password recipe `password({length:20, pattern:/^[a-z ,.'-]+$/i, prefix:'1!'})`).
   - `export class UserFactory { async randomUser(page: Page): Promise<RegisterUser> { const data = prepareRandomUser(); const registerPage = new RegisterPage(page); await registerPage.goto(); await registerPage.register(data); return data; } }` — matches the user's requested shape (generate → navigate → register → return).
2. `src/ui/factories/address.factory.ts`:
   - `export function makeValidAddress(): Address` returning the current `validAddress` literal (Germany/12345/…). Keep it a fixed literal, not faker — the postcode-lookup path needs a real country/postcode pair.
3. **Refactor `RegisterPage.register()`** from 12 positional params to `register(user: RegisterUser): Promise<void>` (destructure inside). This removes the positional-argument fragility and pairs with the model/factory.
4. Update callers:
   - `register.spec.ts` — replace the inline faker block with `const user = prepareRandomUser();` then `registerPage.register(user)` / `loginPage.login(user.email, user.password)`.
   - `checkout-address.spec.ts` — replace the inline faker block + positional `register(...)` with the factory; replace the `validAddress` literal with `makeValidAddress()`; keep the guest-checkout faker trio inline or add a tiny `prepareGuest()` helper if desired.

**Verify:** run `register.spec.ts` + `checkout-address.spec.ts`; `npm run lint`; `npx tsc --noEmit`. Commit: `refactor: add user/address factories, typed register()`.

---

## Phase 5 — API layer scaffold + register-via-API factory

1. `src/api/utils/api.util.ts`: `export const apiUrls = { usersUrl: '/users', loginUrl: '/users/login' } as const;` (confirm exact Toolshop API paths against the running app before hard-coding — the app is a Laravel API under `/`; verify with the Playwright MCP or a quick `request.get`).
2. `src/api/models/`: `user.api.model.ts` (`UserRegisterPayload` — wire field names, likely `first_name`/`last_name`/`dob`/`address`/`phone`/`email`/`password`), `login.api.model.ts` (`LoginData`), `headers.api.model.ts` (`Headers`). Confirm payload shape against the app's OpenAPI/observed requests.
3. `src/api/requests/base.request.ts`: `BaseRequest` holding `protected request/url/headers` + generic `get()`, per reference.
4. `src/api/requests/users.request.ts` (`UsersRequest.post(payload)`) and `login.request.ts` (`LoginRequest.post(loginData)`), each binding its `apiUrls` entry via `super()`.
5. `src/api/factories/user-register.api.factory.ts`: `prepareRandomUserPayload()` that calls `prepareRandomUser()` (UI factory = single source of random data) and **remaps** to the wire `UserRegisterPayload`. Optionally `createUserWithApi(usersRequest)`.
6. `src/api/factories/authorization-header.api.factory.ts`: `getAuthorizationHeader(request)` → `LoginRequest.post` → `Bearer <access_token>`.
7. `src/api/fixtures/request-object.fixture.ts`: inject `usersRequest`, `loginRequest` (and a `Logged` variant if needed). Export `requestObjectTest`.
8. Wire into `src/merge.fixture.ts`: `mergeTests(pageObjectTest, requestObjectTest)`.

**Verify:** write one throwaway `tests/api/users.smoke.spec.ts` asserting `register → 201` and `login → 200 + access_token`, run it, then keep it as the seed api spec. Commit: `feat: add api layer scaffold and register-via-api factory`.

---

## Phase 6 — storageState `@logged` auth pattern

1. `playwright.config.ts`: add `export const STORAGE_STATE = path.join(__dirname, 'tmp/session.json');`; define projects graph:
   - `setup` (testMatch `**/*.setup.ts`),
   - `chromium-logged` (`grep: /@logged/`, `dependencies: ['setup']`, `use: { storageState: STORAGE_STATE }`),
   - `chromium` non-logged (`grepInvert: /@logged/`).
2. `tests/setup/login.setup.ts`: register a fresh user via the **API factory** (fast, no UI), then establish the session (UI login or API token → `context.storageState({ path: STORAGE_STATE })`), saving to `tmp/session.json`.
3. Refactor `checkout-address.spec.ts` "logged-in user reaches billing" test: tag it `@logged` and drop the in-test register→login→wait dance — it now inherits the saved session. (Keep an assertion that the sign-in step recognizes the session.)
4. `config/global.setup.ts` already clears stale `session.json` (from Phase 1) so each run re-seeds.

**Verify:** `npx playwright test --project=setup --project=chromium-logged`; full `npx playwright test`. Commit: `feat: add storageState auth setup and @logged project`.

---

## Phase 7 — Parameterization polish (optional, low-risk)

1. `tests/ui/smoke/menu.spec.ts`: convert the repeated nav-link assertions to a data-driven `for (const item of menuItems)` table (per the user's note re: Playwright parameterized tests).
2. `product-filters.spec.ts`: collapse the four near-identical sort `expect.poll` blocks (Name asc/desc, Price asc/desc) into one parameterized table over `{ sortValue, kind, direction }`, driven by `isSorted`/`isSortedByString`.
3. Optionally extract the ~9×-repeated "add first product to cart then goto cart" arrange block into a small UI helper/fixture (e.g. `addProductToCart(index)`), if it reads cleaner — CODING_STANDARDS already flags this repetition.

**Verify:** run the affected specs; `npm run lint`. Commit: `test: parameterize menu and sort specs`.

---

## Cross-cutting rules to preserve (from CODING_STANDARDS.md)

- **No `expect()` in page objects / factories** — assertions stay in `*.spec.ts` (API factories may use `expect().toPass()` for polling, per the reference — that's the one sanctioned exception and lives in the api layer, not a POM).
- **Explicit return types on every function/method** (`explicit-function-return-type` is `error`).
- **Locators remain `readonly` properties**, never returned from getters.
- **No conditionals in `test()` bodies** (`playwright/no-conditional-in-test`); push nullable/branching into POM methods or utils.
- **Arrange-Act-Assert** with blank-line separation, no AAA comment markers.
- Keep the existing rich JSDoc/discrepancy comments (e.g. the `TEST_PLAN.md §` cross-refs) intact when moving files.
- Update `TEST_PLAN.md` (data-strategy / structure sections) and `CLAUDE.md` (Architecture section) to describe the new `ui`/`api`/`config` layout once Phase 1 lands.

## Global verification

After each phase (husky pre-commit already runs the first two):

```
npm run lint            # eslint, --max-warnings=0
npm run format:check    # prettier
npx tsc --noEmit        # new in Phase 0
npx playwright test     # or targeted specs for the phase
```

Each phase is an independently committable, green checkpoint — the suite never goes red
between commits, satisfying the "get there incrementally" constraint.
