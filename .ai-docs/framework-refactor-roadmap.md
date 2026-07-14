# Framework Refactoring Roadmap

> Revised 2026-07-13 after a code-verification pass: Phases 1↔2 swapped, Phase 6.4 mechanism
> corrected (no per-project worker cap exists), findings A6/B9/B10 added, Phase 3 extended
> (walker dedup, `response.ok()`, single `API_PATHS` source), Phase 8 recommendation recorded.

Structured analysis of the Playwright + TypeScript suite and a phased plan to act on it.
Each phase is isolated and small enough to land as its own PR without breaking the suite; every
phase ends on a green `lint` / `tsc:check` / `@smoke` gate.

**Scope note:** this is a _framework_ refactor (architecture, DRY, stability, Playwright idioms).
It must not change what any test asserts or which app behaviour it covers. The catalogue of
production discrepancies lives in `test_plan.md` / `PRODUCT_EXPLORATION.md`; nothing here touches that.

---

## Part 1 — Findings

### A. Stability & Flakiness

| #   | Finding                                                                                                                                                                                                                                                                                                                                                    | Where                                                                                                                                                                                                                                                                            | Severity |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| A1  | **No hardcoded sleeps** — waits are all response/locator based. Keep it that way; this is the suite's biggest existing strength.                                                                                                                                                                                                                           | (whole suite)                                                                                                                                                                                                                                                                    | ✅ good  |
| A2  | **`actionTimeout: 0`** — no per-action cap, so a stuck click rides the full 60s test timeout before failing. A tighter action timeout fails faster and more legibly.                                                                                                                                                                                       | `playwright.config.ts:20`                                                                                                                                                                                                                                                        | med      |
| A3  | **`retries: 0`** on a suite whose own notes document real shared-backend contention flakiness (order-placing specs, `test_plan.md` §33). A CI-only retry would absorb known-transient infra failures without masking logic bugs.                                                                                                                           | `playwright.config.ts:15`                                                                                                                                                                                                                                                        | med      |
| A4  | **Duplicated, inconsistent `waitForResponse` URL-matching.** ~8 page objects hand-roll `waitForResponse(r => new URL(r.url()).pathname.endsWith('/x'))`; others use `r.url().includes('/x')`. Two matchers for one job is both duplication and a subtle correctness risk (`includes` matches substrings anywhere in the URL).                              | `product-list.page.ts:137`, `favorites.page.ts:56`, `messages.page.ts:36`, `invoices.page.ts:39`, `product-detail.page.ts:119`, `admin-dashboard.page.ts:47`, `login.page.ts:41`, `forgot-password.page.ts:49`, `checkout-address.page.ts:63,87`, `chat-widget.component.ts:108` | med      |
| A5  | **Fragile structural selectors** that a role/testid can't express: `.locator('..')` parent-hops for pagination, `ul.pagination li.active`, `div.col > div:not(.card)`, `a.btn-danger`, `.toast-message`, `.strength-bar .fill`. Most are documented as unavoidable — the risk is they're scattered and un-named, so a DOM change hits many files silently. | `product-list.page.ts:70-74`, `cart.page.ts:44`, `favorites.page.ts:34`, `profile.page.ts:122`                                                                                                                                                                                   | low      |
| A6  | **Response waits accept error responses.** Every `waitForResponse` predicate matches on URL only, so a 500/422 satisfies the wait and the test fails later on an unrelated DOM assertion with a misleading message. Centralising the matcher (Phase 3) makes an optional `response.ok()` check free and improves failure legibility.                       | same call-sites as A4                                                                                                                                                                                                                                                            | med      |

### B. Maintainability & DRY

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Where                                                                                                                                                                                                                                                  | Severity |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| B1  | **`new NavbarComponent(this.page)` duplicated in 11 page objects**, in _two_ styles (class-field `bookmarks = …` vs `readonly bookmarks: NavbarComponent` assigned in the constructor). The navbar is global — it should be one injected fixture (`navbar`), exactly like `chatWidget` already is. This is the flagship item.                                                                                                                                                                                                                                                                                                                         | `product-list.page.ts:41`, `cart.page.ts:33`, `checkout-{address,signin,payment}.page.ts`, `product-detail.page.ts:35`, `rentals.page.ts:24`, `admin.page.ts:21`, `login.page.ts:9`, `register.page.ts:10`, `contact.page.ts:23`, `privacy.page.ts:19` | **high** |
| B2  | **`page.locator('[data-test="…"]')` everywhere** instead of Playwright's first-class test-id API. `testIdAttribute` is not configured, so every locator repeats the `[data-test="…"]` wrapper and the raw attribute string. `page-title` appears in 7 files, the 6 address fields in 4 files each, `email`/`password`/`totp-code`/`verify-totp` in multiple.                                                                                                                                                                                                                                                                                          | (all page objects)                                                                                                                                                                                                                                     | **high** |
| B3  | **Two locator-definition styles coexist.** Some POMs use class-field initializers (`emailInput = this.page.locator(...)`, e.g. `login.page.ts`), others declare `readonly` + assign in the constructor (`cart.page.ts`, `checkout-address.page.ts`). `CODING_STANDARDS.md` mandates the constructor style; ~7 files violate it.                                                                                                                                                                                                                                                                                                                       | `login.page.ts`, `register.page.ts`, `contact.page.ts`, `privacy.page.ts`, `profile.page.ts` (mixed)                                                                                                                                                   | med      |
| B4  | **The same locator wears three different property names** — `heading` / `title` / `pageTitle` all point at `[data-test="page-title"]` across `profile`, `favorites`, `cart`, `admin`, `invoices`, `messages`. Inconsistent vocabulary makes specs harder to read and cross-reference.                                                                                                                                                                                                                                                                                                                                                                 | multiple page objects                                                                                                                                                                                                                                  | med      |
| B5  | **Cross-page locator duplication that wants a component object.** (a) TOTP: `totp-code` + `verify-totp` + a `submitTotpCode()` method are copy-pasted in `LoginPage` and `ProfilePage`. (b) Password strength meter: `.strength-bar .fill` + `.strength-labels span.active` in `ProfilePage` and (the register locators in) `RegisterPage`. (c) Billing/profile address fields overlap heavily.                                                                                                                                                                                                                                                       | `login.page.ts:18-19,48`, `profile.page.ts:64-65,122-124`, `register.page.ts`                                                                                                                                                                          | med      |
| B6  | **35 near-identical fixture entries** in `page-object.fixture.ts` (`x: async ({page}, use) => use(new X(page))`). Playwright needs static keys for typing, but the body is pure boilerplate a small `pageFixture(Ctor)` helper can collapse.                                                                                                                                                                                                                                                                                                                                                                                                          | `page-object.fixture.ts:78-184`                                                                                                                                                                                                                        | low      |
| B7  | **Magic path/method strings** scattered as response-match fragments (`/products`, `/favorites`, `/postcode-lookup`, `/products/search`, `/users/login`, `/invoices`, `/messages`, `/totp/setup`), plus payment-method literals (`'cash-on-delivery'`) and the `maxPages = 50` constant repeated 4× in one file. `apiUrls` centralises API-_host_ URLs but not these UI-side fragments.                                                                                                                                                                                                                                                                | `product-list.page.ts:178,224,237,250`, `cart-action.fixture.ts:110`, various                                                                                                                                                                          | med      |
| B8  | **`makeValidAddress()` → `fillAddressViaLookup(...)` block duplicated** across two flows in the cart-action fixture. Minor, but it's the same three-line arrange twice.                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `cart-action.fixture.ts:72-77,101-106`                                                                                                                                                                                                                 | low      |
| B9  | **The cross-page walk loop is quadruplicated**, not just its `maxPages` constant: `getAllProductNamesAcrossPages`, `goToLastPage`, `findOutOfStockCardAcrossPages`, `findInStockCardAcrossPages` are four copies of the same loop differing only in the per-page action. A private `walkPages(visit)` helper collapses them — and exposes a `waitForGrid()` inconsistency: `getAllProductNamesAcrossPages` is the _only_ walker that skips it, which looks like the exact pre-load race its own comment describes. Verify that's deliberate (post-filter callers whose result set may legitimately be empty) and make the intent explicit via a flag. | `product-list.page.ts:176-258`                                                                                                                                                                                                                         | med      |
| B10 | **Docs drift:** `merge.fixture.ts` composes _three_ fixtures (`cartActionTest`, `adminActionTest`, `requestObjectTest`), but CLAUDE.md (and the first draft of this doc) describe two. `adminActionTest`/`loginAsAdmin` exists and the admin specs it serves are navbar consumers too (Phase 2). Update CLAUDE.md's architecture note alongside Phase 2.                                                                                                                                                                                                                                                                                              | `src/merge.fixture.ts`, `CLAUDE.md`                                                                                                                                                                                                                    | low      |

### C. Performance

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Where                                                       | Severity |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------- |
| C1  | **`fullyParallel: true`, auto workers** — already correct and a strength.                                                                                                                                                                                                                                                                                                                                                                                                                                | `playwright.config.ts:14,16`                                | ✅ good  |
| C2  | **Order-placing specs contend on the shared prod backend** under full parallelism (documented, `test_plan.md` §33: the postcode geocoder + invoice API slow under concurrent load, failing a _different_ test each run). ⚠ Playwright has **no per-project `workers` cap** (`workers` is config-level only), so a "capped-worker project" cannot be expressed — isolation must come from a **split CI run**: `--grep-invert @order` at full parallelism, then `--grep @order --workers=2`. See Phase 6. | `checkout-e2e`, `invoices`, `discounts`, `checkout-address` | med      |
| C3  | **`setup` logs in through the UI** to capture the session. Correct for fidelity, but it's the one UI round-trip in the auth path; if setup time matters it can seed `storageState` from an API token instead. Low priority — only worth it if setup becomes a bottleneck.                                                                                                                                                                                                                                | `login.setup.ts`                                            | low      |
| C4  | **Reporter is `html` only.** Adding `list` (local) and a CI reporter (`github`/`blob`) improves signal with no runtime cost.                                                                                                                                                                                                                                                                                                                                                                             | `playwright.config.ts:17`                                   | low      |
| C5  | **No network mocking** — by design (black-box vs. production, `test_plan.md` §2/§3). Not an issue; noted so it isn't "fixed" by mistake.                                                                                                                                                                                                                                                                                                                                                                 | —                                                           | ✅ n/a   |

### D. Playwright Best Practices

| #   | Finding                                                                                                                                                                                           | Where                        | Severity |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------- |
| D1  | **Adopt `testIdAttribute: 'data-test'` + `getByTestId('x')`** (the idiomatic form of B2). One config line unlocks replacing every `page.locator('[data-test="x"]')` with `page.getByTestId('x')`. | `playwright.config.ts` `use` | **high** |
| D2  | **Global component injected as a fixture** (B1) — `chatWidget` already follows this; `NavbarComponent` should too.                                                                                | `page-object.fixture.ts`     | high     |
| D3  | **Standardise the network-wait matcher** on `new URL(url).pathname` (A4) — avoid `includes()`, which can match a query param or an unrelated path segment.                                        | (see A4)                     | med      |
| D4  | **Keep assertions out of page objects / helpers** — currently respected; the API factories are the one sanctioned `expect()` exception. Preserve this through every phase.                        | (whole suite)                | ✅ good  |

---

## Part 2 — Phased Roadmap

Ordering rationale: do the two high-impact, mechanical, low-risk moves first — **`getByTestId`
before the navbar fixture**, because the testid swap is a pure find-and-replace that touches all
11 page objects the navbar phase edits again; doing it first means the navbar diffs land on
already-converted files and the navbar component itself is converted once, not twice. Component
extraction and style normalisation come after, when there's less duplication to reconcile.
Config/stability tuning and the comment strip are independent and can land any time.

Each phase: **Goal · Steps · Files · Validation · Risk.** Validation is always at least
`npm run lint && npm run tsc:check && npx playwright test --grep @smoke`; phases touching a specific
area also run that area's spec(s).

### Phase 0 — Baseline & guardrails (no behaviour change)

- **Goal:** capture a known-green starting point and make later diffs reviewable.
- **Steps:** run `lint` / `tsc:check` / `@smoke` and record the result; branch from `main`.
- **Risk:** none.
- **✅ Baseline recorded 2026-07-13** (from `main` @ `e86f020`): `lint` clean, `tsc:check` clean,
  `@smoke` **19/19 passed** in 2.4m (setup + chromium + chromium-logged projects).

### Phase 1 — Adopt `getByTestId` _(B2/D1)_

- **Goal:** kill the `[data-test="…"]` wrapper repetition; make locators idiomatic. First because it's a pure find-and-replace that shrinks every later diff — including Phase 2's, which re-edits the same 11 page objects.
- **Steps:**
  1. Add `use: { testIdAttribute: 'data-test' }` to `playwright.config.ts`.
  2. File-by-file, replace `this.page.locator('[data-test="x"]')` → `this.page.getByTestId('x')`. Leave the genuinely-structural CSS locators (A5) untouched.
  3. Do it in batches by area (auth pages, checkout pages, admin pages, components) so each batch is a small reviewable diff and its specs can be run.
- **Files:** every page object + both components; config.
- **Validation:** `@smoke` after each batch; full run at the end of the phase.
- **Risk:** low — purely a locator-syntax swap, behaviour identical. `getByTestId` resolves to the same `[data-test]` selector.
- **✅ Implemented 2026-07-13** on `refactor/phase-1-get-by-testid` (4 commits: components+config, auth/account, shop/checkout, admin/docs — 166 locators converted). Kept as CSS: the 4 prefix selectors (`product-`, `brand-`, `favorite-`) and `profile.page.ts`'s `FIRST_NAME_SELECTOR` (feeds `document.querySelector` in `waitForFunction`). Batch 1 validated with `@smoke` (18/19 + the known §33 guest-checkout contention flake, green on solo re-run); batches 2–4 gated on `lint`/`tsc:check` only — **full-suite validation still to run** (owner running separately).

### Phase 2 — Navbar as an injected fixture _(flagship; B1/D2)_

- **Goal:** one `NavbarComponent` instance injected as a `navbar` fixture; delete the 11 duplicated `bookmarks` fields.
- **Steps (each sub-step is independently green — keep them as separate commits):**
  1. Register `navbar: NavbarComponent` in `Pages` + `pageObjectTest` (mirror the existing `chatWidget` entry). Additive — nothing consumes it yet.
  2. Migrate specs from `somePage.bookmarks.X` to the `navbar` fixture arg (8 specs: `category`, `language`, `checkout-e2e`, `product-detail`, `rentals`, `admin/dashboard`, plus `menu`/`homepage` smoke if they use it). Remember `adminActionTest`/`loginAsAdmin` and the admin `sections` spec are consumers too (B10).
  3. Handle the **one internal consumer**: `ProductDetailPage.addToCartAndAwaitBadge()` uses `this.bookmarks.cartQuantity`. A page object can't take a fixture, so either (a) keep a single private `NavbarComponent` there, or (b) move the badge-wait into the `cart-action` fixture where the navbar is available. Prefer (b) for consistency with the "global component = fixture" rule.
  4. Delete `bookmarks` from `ProductListPage`, `AdminPage`, `cart`, `checkout-{address,signin,payment}`, `login`, `register`, `contact`, `privacy`, `rentals`, `product-detail`. `bookmarks` is a misnomer for a navbar anyway — no surviving private field may keep the old name.
  5. Update the `CODING_STANDARDS.md` example that references `productDetailPage.bookmarks.cartQuantity`, and CLAUDE.md's stale "two fixtures" description of `merge.fixture.ts` (B10).
- **Files:** `page-object.fixture.ts`, the 11 page objects above, ~8 specs, `CODING_STANDARDS.md`, `CLAUDE.md`.
- **Validation:** `@smoke` + `category` + `language` + `product-detail` + `rentals` + `admin`.
- **Risk:** low/mechanical, but wide — do it as ~3 commits (register → migrate specs → delete fields) so a regression is easy to bisect.
- **✅ Implemented 2026-07-13** on `refactor/phase-2-navbar-fixture` (3 commits: register `navbar` fixture + `NavbarComponent.waitForCartQuantity()` → migrate 7 specs + `cart-action.fixture` → delete the 12 `bookmarks` fields). Step 3 resolved via option (b): `ProductDetailPage.addToCartAndAwaitBadge()` deleted; the badge wait is `navbar.waitForCartQuantity()`, called by the cart-action fixture (`checkout-signin.spec` now uses `addProductToCart()`). `CODING_STANDARDS.md` example and CLAUDE.md fixtures bullet updated (B10). Gated on `lint`/`tsc:check`; browser validation runs separately (owner).

### Phase 3 — Extract shared network + constant helpers _(A4/A6/B7/B9/D3)_

- **Goal:** one wait helper, one home for path/enum magic strings, one page-walk loop.
- **Steps:**
  1. Add `waitForApi(page, pathname, { method?, ok? })` (e.g. in `src/ui/utils/network.util.ts`) that awaits `new URL(url).pathname.endsWith(pathname)`, optional method, and an optional `response.ok()` check (A6) — so an error response fails the wait legibly instead of satisfying it. Replace all ~10 hand-rolled `waitForResponse` blocks (A4). Standardises matching away from `includes()`.
  2. Define the endpoint paths **once**: an `API_PATHS` map (`{ LOGIN: '/users/login', POSTCODE_LOOKUP: '/postcode-lookup', … }`) from which _both_ `src/api/utils/api.util.ts`'s `apiUrls` (`${API_URL}${API_PATHS.X}`) and the UI-side wait fragments derive — the two lists currently overlap (`/users/login`, `/totp/*`) and can drift apart.
  3. Extract per-file magic: `MAX_PAGINATION_PAGES` class constant in `product-list.page.ts` (4 call-sites); a `PaymentMethod` union/const for `'cash-on-delivery'` et al.
  4. **Dedupe the page walkers (B9):** collapse the four near-identical loops in `product-list.page.ts` into a private `walkPages(visit: () => Promise<boolean>)` helper with an explicit wait-for-first-card flag. While there, resolve the `waitForGrid()` inconsistency — `getAllProductNamesAcrossPages` is the only walker that skips it; confirm that's deliberate (post-filter callers whose result set may legitimately be empty) and encode the decision in the flag rather than by omission.
- **Files:** new `network.util.ts` + `API_PATHS` constants; `api.util.ts`; the ~8 page objects/components from A4; `cart-action.fixture.ts`; `product-list.page.ts`.
- **Validation:** `@smoke` + the specs behind the touched page objects (product-list-backed, favorites, messages, invoices, checkout).
- **Risk:** low — behaviour-preserving; the matcher change from `includes` → `pathname.endsWith` is a tightening, verify the postcode-lookup and users/login waits still fire. The `ok` check is opt-in per call-site, so no wait gets stricter silently.
- **✅ Implemented 2026-07-13** on `refactor/phase-3-network-helpers` (4 commits: helpers → 11 call-site migrations → walker dedup → `PaymentMethod` union). `waitForApi` supports `{ method, ok }` but **no call site opts into `ok` yet** (behaviour-preserving; several waits deliberately capture error responses). Q4 resolved: `getAllProductNamesAcrossPages` skipping the first-card wait **is deliberate** — all callers run it post-filter (possibly-empty result set) and the one post-goto spec waits for the first card itself; now explicit via `walkPages`'s `waitForFirstCard` flag. Gated on `lint`/`tsc:check`; browser validation runs separately (owner).

### Phase 4 — Component objects for repeated form clusters _(B5)_

- **Goal:** collapse cross-page locator/method duplication into small component objects (the `NavbarComponent`/`ChatWidgetComponent` pattern).
- **Steps (each component independently):**
  1. `TotpFormComponent` — `totp-code`, `verify-totp`, `submitTotpCode()`; reuse in `LoginPage` and `ProfilePage`.
  2. `PasswordStrengthComponent` — `.strength-bar .fill`, `.strength-labels span.active`; reuse in `ProfilePage` and `RegisterPage`.
  3. (Evaluate, don't force) a shared address-field cluster for `CheckoutAddressPage`/`ProfilePage` — they differ (country `<select>` vs free-text `<input>`), so only extract the truly-identical fields if it stays clean.
- **Files:** new `src/ui/components/*`; `login`, `profile`, `register`, maybe `checkout-address`.
- **Validation:** `login`, `totp-setup`, `change-password`, `profile`, `register` specs.
- **Risk:** med — touches auth-critical pages; keep each component a separate commit and run its specs.
- **✅ Implemented 2026-07-14** on `refactor/phase-4-form-components` (3 commits: `TotpFormComponent`
  → `PasswordStrengthComponent` → the Phase 5 style fold). Both components are page-scoped and
  instantiated by their owning page objects (not fixtures — they aren't global chrome).
  `PasswordStrengthComponent` takes a `Page | Locator` root, so the profile page scopes it to its
  change-password form while the register page matches page-wide. **Step 3 resolved: address cluster
  NOT extracted** — the only identical pieces across `checkout-address`/`profile`/`register` are four
  one-line testid locators; everything around them diverges (country `<select>` vs free text, the
  postcode-lookup awaits, differing field sets), so a shared component fails the "stays clean" bar.
  Phase 5 folded in for the three open files: `login`/`register`/`profile` converted to
  constructor-assigned locators, `ProfilePage.heading` → `pageTitle` (B4). Validated with the five
  affected specs (`login`, `totp-setup`, `change-password`, `profile`, `register`): **34/34 passed**
  in 2.8m, plus `lint`/`tsc:check` per commit.

### Phase 5 — Normalise POM style & vocabulary _(B3/B4)_

- **Goal:** one locator-definition style (constructor-assigned, per `CODING_STANDARDS.md`) and one name for one thing (`pageTitle` for `[data-test="page-title"]`, `heading` for role headings).
- **Steps:** convert the ~7 class-field POMs to constructor style, deleting the now-redundant empty constructors the class-field style leaves behind (e.g. `login.page.ts:21-23` is just `super(page)`); rename `title`/`heading`→`pageTitle` where it's the page-title testid; update the handful of spec references.
- **Shrink it by folding:** Phase 2 rewrites all 11 navbar-holding page objects and Phase 4 rewrites `login`/`profile`/`register` — do the style conversion and renames opportunistically in those phases when a file is already open. Standalone Phase 5 then covers only the leftovers nothing else touched.
- **Files:** `login`, `register`, `contact`, `privacy`, `profile`, `favorites`, `invoices`, `messages`, `cart` + their specs (minus whatever Phases 2/4 already reconciled).
- **Remaining after the Phase 4 fold:** `forgot-password.page.ts` is the last class-field-style POM;
  the B4 `pageTitle` renames in files Phase 4 didn't touch (`account`, `favorites`, `cart`, `admin`,
  `invoices`, `messages`) are still open.
- **Validation:** `@smoke` + each renamed area's spec.
- **Risk:** low but churny — pure rename/restructure. Do last so it reconciles the fewest remaining duplicates. Optional if time-boxed.

### Phase 6 — Config & stability tuning _(A2/A3/C2/C4)_

- **Goal:** faster failure, absorbed infra flakiness, better reporting.
- **Steps:**
  1. `actionTimeout: 15_000` (from `0`).
  2. `retries: process.env.CI ? 1 : 0`.
  3. Reporter → `[['list'], ['html', { open: 'never' }]]` (+ a CI reporter if wanted).
  4. (Optional, C2) tag order-placing specs `@order`. ⚠ Playwright cannot cap workers per project (`workers` is config-level only), so the isolation mechanism is a **split CI run**: `--grep-invert @order` at full parallelism, then `--grep @order --workers=2`. Land the retry (step 2) first and measure — only add the split if those specs still fail on retry.
- **Files:** `playwright.config.ts` (+ tag additions and the CI pipeline if doing C2).
- **Validation:** full suite once, twice if chasing the C2 contention.
- **Risk:** low; retries can _hide_ a real flake, so pair with a note to investigate any spec that only passes on retry.

### Phase 7 — Fixture-registration boilerplate _(B6, optional)_

- **Goal:** collapse the 35 repetitive fixture bodies via a `pageFixture(Ctor)` helper while keeping static keys/types.
- **Risk:** low; purely internal to `page-object.fixture.ts`. Optional polish.

### Phase 8 — Strip code comments _(cross-cutting; scope confirmed)_

- **Decision (confirmed):** remove **all** comments — `//`, `/* */`, and JSDoc `/** */` — from every `.ts` file, keep functional directives, and update `CODING_STANDARDS.md` to match. Land as its own commit; execute only on go-ahead.
- **Goal:** remove comments from all `.ts` code files, per request.
- **Steps:**
  1. Remove `//`, `/* */`, and JSDoc `/** */` comments from `src/**` and `tests/**` and `config/**`.
  2. **Preserve functional directives** — the `eslint-disable-next-line` in `tests/ui/discounts.spec.ts:153` must stay, or `lint --max-warnings=0` fails. (No `@ts-*` / `prettier-ignore` directives exist elsewhere.)
  3. Run `format` so spacing left by removed block comments is normalised.
  4. Reconcile `CODING_STANDARDS.md` — its "Code Comments" section currently _mandates_ meaningful `why` comments; a no-comments policy contradicts it, so that section must be updated in the same change.
- **Files:** effectively all `.ts` files (~82 carry comments) + `CODING_STANDARDS.md`.
- **Validation:** `lint` / `format:check` / `tsc:check` / full suite.
- **Risk:** **medium and low-reversibility.** These comments encode hard-won production quirks (the `§`-references, the async-hydration and pre-load-race explanations). The knowledge is preserved in `test_plan.md` / `PRODUCT_EXPLORATION.md` / `.ai-docs/`, but the inline pointers vanish. Recommend landing this as its **own** final PR, after the structural refactors, so review isn't drowned by a whole-tree comment diff. **Confirm scope before executing** (all comments incl. JSDoc, vs. keep JSDoc class headers) — see the open question below.
- **Recommendation (added on review):** this is the one phase that makes the suite _worse_ as scoped. The comments in `product-list.page.ts` / `checkout-address.page.ts` sit exactly where the next editor needs them (stale-lookup overwrites, response-ordering races, the in-stock product-picking rule); the docs preserve the facts but not the pointer from the code that depends on them. A narrower "strip _what_-comments, keep _why_-comments" pass matches `CODING_STANDARDS.md` and loses nothing. **Re-confirm the full-strip decision before executing.**

---

## Part 3 — Sequencing summary

```
Phase 0  baseline
Phase 1  getByTestId                 ← pure mechanical, shrinks every later diff
Phase 2  navbar fixture              ← flagship DRY win
Phase 3  network/const helpers + page-walk dedup
Phase 4  component objects (totp, strength)
Phase 5  POM style/naming            ← mostly folded into 2/4; leftovers only
Phase 6  config & stability
Phase 7  fixture boilerplate         ← optional
Phase 8  comment strip               ← own PR, last; re-confirm scope first
```

Phases 1–3 deliver the bulk of the DRY/best-practice win and are all low-risk. 4–7 are refinements.
8 is independent and gated on a scope decision.

## Open questions / decisions to confirm

1. ~~**Comment strip scope.**~~ **Decided:** strip _all_ comments incl. JSDoc, keep the one `eslint-disable` directive, update `CODING_STANDARDS.md` (Phase 8). **Review recommendation:** narrow to "strip _what_, keep _why_" — re-confirm before executing (see Phase 8).
2. ~~**C2 contention.**~~ **Recommendation:** land the Phase 6 CI retry first and measure; only add the split `@order` CI invocation if those specs still fail on retry. (Per-project worker caps don't exist in Playwright, so the split run is the only real mechanism.)
3. ~~**Phase 5.**~~ **Recommendation:** keep it, but fold the conversions/renames into Phases 2 and 4 wherever those already rewrite a file; run Phase 5 standalone only for the leftovers.
4. ~~**B9 `waitForGrid()` gap.**~~ **Resolved (Phase 3):** deliberate — every caller runs it after a filter change whose `/products` fetch was already awaited and whose result set may legitimately be empty; the one post-`goto` use waits for the first card in the spec. Now explicit via `walkPages`'s `waitForFirstCard` flag.
