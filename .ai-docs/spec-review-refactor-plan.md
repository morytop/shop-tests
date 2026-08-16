# Spec review follow-up — grouped verdicts & phased refactor plan

**Status:** approved plan, not yet implemented (2026-08-16). Phases are sized to one PR each and are independent enough to land in order 0 → 6.

**Origin:** a manual review of the UI spec suite (~40 comments across 18 spec files). Every comment was verified against the code, the per-spec `.ai-docs/*-plan.md` rationale, `PRODUCT_EXPLORATION.md`, and `TEST_PLAN.md` before a verdict. Verdicts are either **change** (mapped to a phase) or **keep** (with the argument recorded here). Verification also surfaced a handful of latent races the review didn't mention — they are folded into the same phases.

Two decisions were confirmed with the reviewer up front:

- Scope of the immediate task: this document plus the new **Assertions** section in `CODING_STANDARDS.md`. The refactor itself runs later, phase by phase.
- The new fresh-user fixture (Group G) logs in by **API token injection** (the proven `logged-session.fixture.ts` mechanics), not by driving the login form. The login form keeps its dedicated coverage in `login.spec.ts`.

---

## Part 1 — Verdicts by group

### Group A — URL assertions → strings, not regexes (change, Phase 2)

`toHaveURL(string)` resolves the expected string against `baseURL` and matches the full URL exactly. The app is plain path-routed (no `/#/`), and the flagged routes carry no query/fragment — so **static routes need no regex at all**.

| Site                                                      | Today                                                                              | Becomes                                                                                                                                                    |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `login.spec.ts:57,84,118`                                 | `toHaveURL(new RegExp(\`${PAGE_URLS.LOGIN}$\`))`                                   | `toHaveURL(PAGE_URLS.LOGIN)`                                                                                                                               |
| `forgot-password.spec.ts:30`                              | same pattern                                                                       | `toHaveURL(PAGE_URLS.FORGOT_PASSWORD)`                                                                                                                     |
| `admin/dashboard.spec.ts:26,134`                          | same pattern                                                                       | `toHaveURL(PAGE_URLS.ADMIN_DASHBOARD / LOGIN)`                                                                                                             |
| `privacy.spec.ts:22,36`                                   | literal `/\/privacy$/`                                                             | `toHaveURL(PAGE_URLS.PRIVACY)`                                                                                                                             |
| `change-password.spec.ts:194`                             | literal `/\/auth\/login/` + `{ timeout: 15000 }`                                   | `toHaveURL(PAGE_URLS.LOGIN)`; drop the timeout — it is a no-op (`expect.timeout` is already globally `15_000`)                                             |
| `category.spec.ts:46`                                     | ``new RegExp(`/category/${slug}$`)``                                               | add a `url` field to `categories` in `category.data.ts` (values from `PAGE_URLS.*_TOOLS`/`OTHER`) → `toHaveURL(category.url)`                              |
| `chat-widget.spec.ts:114` / `product-overview.spec.ts:30` | `/\/product\/\w+$/` vs `/\/product\/[A-Za-z0-9]+/` — two different, one unanchored | one shared, commented `PRODUCT_DETAIL_URL_REGEX` next to `PAGE_URLS` (the id is dynamic, so a regex is genuinely needed here — but named and defined once) |

The `new RegExp(PAGE_URLS.X + '$')` idiom was also only safe by accident: the values are unescaped, and `PAGE_URLS.HOME` (`'/'`) would produce `/$/`, matching any URL ending in a slash. Strings remove the whole class of problem.

### Group B — "unclear what this checks" format regexes → named constants (change, Phase 0)

The regexes are correct; they are just anonymous. Extract to a commented constants module (`src/ui/constants/formats.ts`):

- `USD_PRICE_REGEX = /^\$\d+\.\d{2}$/` — listing cards, cart rows, and chat result cards render `$19.99`. Used in `cart.spec.ts:33-34`, `chat-widget.spec.ts:86-88`.
- `BARE_PRICE_REGEX = /^\d+\.\d{2}$/` — the detail page renders a bare `14.15`; the `$`-less format is a documented per-surface discrepancy (PRODUCT_EXPLORATION §12), not an oversight. Used in `product-detail.spec.ts:33`.
- `TOTP_SECRET_REGEX = /^[A-Z2-7]{16}$/` — google2fa mints 16 base32 characters (80 bits); the assertion pins the shape, not a value. Currently duplicated between `totp-setup.spec.ts:39` (assertion) and `profile.page.ts:81` (wait gate) — both import the constant.
- `DATE_TIME_REGEX` already lives named-and-commented in `date.util.ts` — no change.

### Group C — bare `expect()` → web-first assertions (change most; keep four, with arguments)

28 bare non-locator `expect(` calls were catalogued. Conversions:

- **Counts > 0** (`rentals.spec.ts:17`, `product-overview.spec.ts:12`, `product-filters.spec.ts:22/36/73`): `await expect(locator.first()).toBeVisible()`. In rentals this also fixes a real race — `count()` fires right after `goto()` with only the heading awaited, so a slow grid XHR yields 0 and the follow-up `toHaveCount(cardCount)` chain compounds the stale read.
- **Chat result cap 1..5** (`chat-widget.spec.ts:83-84`): `await expect(chatWidget.productCards.first()).toBeVisible()` (≥ 1) plus `await expect(chatWidget.productCards.nth(5)).toHaveCount(0)` (≤ 5, "there is no sixth card") — fully auto-retrying, and the ≤ 5-not-=== 5 constraint from `chat-widget-find-product-plan.md` A3 is preserved.
- **"grid shows only matching products"** (`product-search.spec.ts:14` poll): add a parameterized locator to `ProductListPage`, e.g. `productCardsNotMatchingName(term)` = `productCards.filter({ hasNot: <name locator filtered by term> })`, and assert `toHaveCount(0)` + `first().toBeVisible()`. Auto-retrying, and the poll disappears. ⚠ Implementation-time live check (playwright-cli): if server search also matches _descriptions_, "every name contains the term" is the wrong invariant — then assert "results include the searched product" instead. Also replace the hard-coded `'pliers'` with a term derived from a live product name (the chat-widget spec already models this), per the suite's no-hard-coded-catalog-data rule.
- **Pagination page-2 compare** (`category.spec.ts:99`, `product-overview.spec.ts:44`): the root cause is `goToPage()` not awaiting the `/products` refetch (unlike `goToNextPage`). Fix `goToPage()` to run through `triggerAndAwaitProducts` and await the active-page indicator; the snapshot `expect(page2Names).not.toEqual(page1Names)` then compares two deterministic reads. The compare itself stays bare — two already-read arrays cannot be a locator assertion — but gains a failure message.

Kept, with arguments:

- **`expect(found).toBe(true)`** after `findInStockCardAcrossPages()` (4 sites): the helper is a multi-page walk with a deliberate boolean contract; no single locator assertion can express "somewhere across N pages". Improvement only: `expect(found, 'no in-stock product found across pages').toBe(true)` so a failure explains itself.
- **HTTP statuses 201/409/401** in the product-detail favorites tests: the component has no client-side auth guard — it always POSTs and picks its toast from the server reply (PRODUCT_EXPLORATION §27). The status is simultaneously the sync point (navigating straight to favorites can outrun the POST) and the only observable that distinguishes the three branches; the user-visible toast copy **is** asserted right next to it. Removing the status assert would weaken the test without making it more user-centric.
- **discounts `toBeCloseTo` arithmetic**: a documented decision (`discounts-plan.md` A3) — one sample can't pin the app's rounding direction, so the tests read subtotal/discount/total once from the DOM (after awaited state) and assert the _relationships_. Auto-retry doesn't apply to arithmetic over snapshot values, and re-reading wouldn't change them.
- **chat toggle quadrant check**: bounding-box vs viewport geometry has no locator-assertion equivalent, and the preceding `toBeVisible()` guarantees the box is measurable when the helper runs. Optional improvement to try live: `toHaveCSS('position', 'fixed')` + bottom/right offsets, which would be web-first — adopt it only if the widget's styles actually express placement that way.

### Group D — `expect.poll` reduced to the irreducible (change, Phase 4)

7 sites exist. After Group C, only **sorted-order** and **prices-≤-max** remain — numeric ordering has no locator-based form, so `expect.poll` is the right tool there (it _is_ an auto-retrying assertion). What changes is packaging, following the sanctioned `expectToMatchSchema()` precedent (`src/api/utils/schema.util.ts`: an assertion helper in `utils/` is legitimate because it _is_ the assertion):

- `src/ui/utils/grid-assert.util.ts` with `expectGridSorted(listPage, 'name' | 'price', 'asc' | 'desc')` and `expectPricesAtMost(listPage, max)`. Both guard non-empty and pass a `message`, fixing two current defects: five of the polls have no length guard (`isSorted([])` is vacuously `true`, so an empty grid passes), and none produce more than "expected true, received false" on failure.
- The flagged `sortCases` block collapses: the four read-and-check closures become `[['name','asc'], ['name','desc'], ['price','asc'], ['price','desc']]` looped over `expectGridSorted` — the name-vs-price conditional moves into the util, where conditionals are allowed.
- `category.spec.ts:61` uses the same helper.
- `getPriceRangeMaxValue()` returns `string | null` and `Number(null)` is `0` — a missing slider silently becomes "max price 0" and the poll times out with no clue. Make the page object wait for / throw on a missing `aria-valuenow` instead.

### Group E — locators leaking into specs (change, Phase 1)

- `favorites.spec.ts:121` `favoriteCards.filter({ hasText: removedName })` → parameterized `favoriteCardByName(name)` on `FavoritesPage` (value-parametrized locator properties are the sanctioned form in CODING_STANDARDS).
- `invoices.spec.ts:46-54` row + `getByRole('cell').nth(n)`, and the same idiom at `:113-120` → mirror the existing `messagesPage.messageRow(subject)` / `messageRowCell(...)` precedent with `invoiceRow(invoiceNumber)` + cell accessors on `InvoicesPage` / `InvoiceDetailPage`.

### Group F — `addToFavoritesAndAwaitResponse` naming (change, Phase 1)

Rename to `addToFavorites(): Promise<number>`. The method already does exactly one job — click and synchronize on the write, returning the status; it asserts nothing. The response-await is the sync point, not a second responsibility, so it stays inside; only the name stops advertising mechanics. The doc comment keeps the "why the response is the sync point" rationale.

### Group G — repeated register+login arrange → fixture (change, Phase 5; biggest win)

The reviewer's hunch is correct and understated: the `registerUserWithApi` + 6-line UI-login block is hand-rolled at **24 UI call sites** (change-password ×6, profile ×4, favorites/messages/invoices/totp-setup ×3 each, product-detail ×2, forgot-password/discounts ×1…). No UI fixture exists — only the API-side `loggedApiUser`. Add `src/ui/fixtures/user-action.fixture.ts` (the cart-action/admin-action pattern, merged in `merge.fixture.ts`):

- `loginAsFreshUser(): Promise<UserRegisterPayload>` — registers a throwaway user (existing `registerUserWithApi`), logs in via the API (`LoginRequest` + the `logged-session.fixture.ts` retry loop), injects the JWT into `localStorage`, and lands on the target page. Per-test minting sidesteps the 5-minute JWT TTL.
- Worker-scoped `workerUser` (registers once per worker via its own `APIRequestContext`) + a `loginAs(user)` action, for tests that provably mutate nothing **and never submit a wrong password**: the profile blank-field loop (×5 — client-side validation only, nothing saved), change-password AC1/AC2/AC3/AC5, the totp-setup display test. This cuts permanent registrations on the shared prod DB from ~24/run toward ~1/worker for those tests. Excluded on purpose: change-password AC4 (submits a wrong current password — lockout risk on a shared account) and AC6 (actually changes the password), plus every spec that files per-user data (favorites/messages/invoices/discounts) — those keep `loginAsFreshUser`.
- Every user the API registers is still permanent — the fixture must stay opt-in per test, exactly like the current inline block.

### Group H — magic strings & timeouts (keep, but name & unify; Phase 6)

- `'page.forgot-password.confirm'` — **keep**: this is a pinned production bug, not a typo in the test. The template reads `t('page.forgot-password.confirm')` while `en.json` defines `pages.…`, so transloco falls back to echoing the raw key (PRODUCT_EXPLORATION §3, bug row 3). The spec's header comment already says so; optionally extract the string to test-data with a JSDoc pointing at the bug entry so future readers meet the explanation before the literal.
- Banner timeouts — the underlying timers are real: the forgot-password alert is detached ~3 s after render (a `setTimeout`-driven `@if`, `forgot-password-plan.md`), the profile banner after ~5.4 s (PRODUCT*EXPLORATION §24). The 10 s / 8 s values are those timers plus headroom, not guesses. Change only consistency: both banners are \_detached*, so both assert `toHaveCount(0)` (forgot-password currently uses `toBeHidden`), and the headroom becomes a named `BANNER_DISMISS_TIMEOUT` constant whose comment explains the app-side timer.

### Group I — validation data placement (change, Phase 0)

`INVALID_EMAILS` is duplicated **verbatim** — same array, same comment — in `register.spec.ts:32` and `forgot-password.spec.ts:17-18`. Move `REQUIRED_FIELD_ERRORS`, `INVALID_EMAILS`, `VALID_EMAILS` into `src/ui/test-data/` (a `register.data.ts`, emails shared from it or an `email.data.ts`). This is the established convention, not a new one: `user.data.ts` already holds `PROFILE_VALIDATION_ERROR`, `CHANGE_PASSWORD_ERRORS`, and `PASSWORD_STRENGTH_LEVELS`.

### Group J — test-organization questions (keep, with arguments; small cleanups in Phase 6)

- **`privacy.spec.ts`** — keep, and keep it `@regression`, not `@smoke`. TEST_PLAN §4 defines smoke as the critical path (home, nav, login, register, add-to-cart → checkout, one admin check); a static prose page doesn't qualify. Deleting it buys nothing (near-zero runtime) and loses real regression guards: the route, the document title, and the 8 section headings. Its two literal `/\/privacy$/` regexes do get replaced by `PAGE_URLS.PRIVACY` (Group A).
- **Favorites tests in `product-detail.spec.ts`** — keep. TEST*PLAN maps ACs by \_page ownership*: §5.3 (product detail) lists the add-from-detail and logged-out ACs; §5.16 (favorites page) covers only `/account/favorites` and cross-references §5.3 so it isn't read as a gap. The tests drive `ProductDetailPage` and its toasts, and the placement was a user-confirmed scope decision recorded in `product-detail-favorites-plan.md`. Moving them would break AC↔spec traceability (TEST_PLAN §7) for no behavioral gain.
- **checkout-address 7× `toBeVisible`** — keep. Every line is auto-waiting and a failure names its exact field. The page already exposes a `textFields` record, so a loop is _possible_, but it trades per-field failure clarity for brevity — the wrong trade for an assert block.
- **profile field-by-field `toHaveValue` block** — same principle, but here the block is duplicated (AC1 and AC2 walk the same ten fields). Middle ground: keep per-field assertions but drive them from the existing `profilePage.profileFields` record plus an expected-values record built from the user — one data-driven loop per test instead of ten hand-written lines twice. While touching it, fix the type friction: `profileFields` is keyed by `keyof ProfileDetails` (8 keys) but indexed with `RequiredProfileField` (5 keys) declared independently.
- **profile blank-field loop registering 5 users** — the tests save nothing (client-side validation blocks the submit), so they are exactly the `workerUser` case from Group G: one user per worker serves all five.
- **change-password strength meter** — the in-test loop over `PASSWORD_STRENGTH_LEVELS` is a documented cost decision ("one test, not five: … five registrations for one typed field is waste"). The flagged `toHaveAttribute('style', width-regex)` asserts the right observable — the measured 20/40/60/80/100 % scale _is_ the meter's behavior (`change-password-plan.md` A2) — but its shape is inconsistent with `register.spec.ts:178` (`;` vs no `;`). Unify the shape, source the widths from the `PASSWORD_STRENGTH_LEVELS` table, and keep `activeLabel` as the primary user-visible assertion.
- **product-filters uncheck loop** — move into the page object as `clearAllChildCategoryFilters()`. Beyond taste, the current loop is subtly wrong: `checkedChildCategoryCheckboxes` is a live `:checked`-filtered locator, so iterating downward over a shrinking set only unchecks everything by accident. The robust form (uncheck `.first()` until the set is empty) is a wait/interaction pattern that belongs on the page object anyway.
- **intersection test** — keep the set-algebra design; "combined = exactly the intersection of each filter alone" has no simpler faithful formulation. Fix the asymmetric compare (`combinedNames` is a raw array while the expectation is `Set`-deduplicated — dedupe both) and say so in a comment.
- **`paginationNextItem` `toHaveClass(/disabled/)`** — verify live whether the link exposes `aria-disabled`; if yes, assert that (user-facing). If the Bootstrap `disabled` class on the `<li>` parent is the only DOM signal, keep the class assertion with a comment saying it is the only observable.
- **smoke tag placement** — `tests/ui/smoke/{homepage,menu}.spec.ts` carry `@smoke` in test titles rather than the `tag` option TEST_PLAN §3 mandates; migrate while touching tags.

## Latent issues found during verification (not in the review; folded into phases)

1. `rentals.spec.ts` pre-paint `count()` race (→ Phase 3 conversion fixes it).
2. `goToPage()` missing the `/products` refetch await — the _actual_ cause behind both flagged pagination compares (→ Phase 1).
3. Sorted-order polls pass vacuously on an empty grid — no length guard in 5 of 7 polls (→ Phase 4 helper guard).
4. `getPriceRangeMaxValue()` null → `Number(null) === 0` silent wrong bound (→ Phase 1).
5. `product-filters.spec.ts:8-24/59-75` call raw `.check()` instead of `filterByChildCategory` / `filterByBrand`, which exist precisely to await the refetch (→ Phase 3).
6. Suite-wide inconsistency of the two `/product/<id>` URL regexes (→ Phase 2).

---

## Part 2 — Phases

Each phase is one PR. Gate on `npm run lint` (`--max-warnings=0`), `npm run tsc:check`, and a targeted `npx playwright test <touched specs>` run against production.

### Phase 0 — Standards & constants

- `CODING_STANDARDS.md`: new **Assertions** section (web-first first; the conversion patterns; bare `expect` only for snapshots/arithmetic and always with a message; `expect.poll` last resort behind a named util with a non-empty guard; named format constants; timeout overrides only with a named constant + comment). _(Done together with this document.)_
- `src/ui/constants/formats.ts`: `USD_PRICE_REGEX`, `BARE_PRICE_REGEX`, `TOTP_SECRET_REGEX` (+ import in `profile.page.ts` to kill the duplicate).
- Move `REQUIRED_FIELD_ERRORS` / `INVALID_EMAILS` / `VALID_EMAILS` to `src/ui/test-data/`; forgot-password imports the shared emails.

### Phase 1 — Page-object sync & locator hygiene

- `search()` and `goToPage()` route through `triggerAndAwaitProducts` (goToPage additionally awaits the active-page indicator).
- `clearAllChildCategoryFilters()` on `ProductListPage`; `favoriteCardByName()` on `FavoritesPage`; `invoiceRow()`/cell accessors on the invoices pages.
- `addToFavoritesAndAwaitResponse()` → `addToFavorites()`.
- `getPriceRangeMaxValue()` null handling.

### Phase 2 — URL assertions

- All 12 `toHaveURL` sites per the Group A table; `category.data.ts` gains `url`; `PRODUCT_DETAIL_URL_REGEX` added; the no-op timeout dropped.

### Phase 3 — Web-first conversions

- Count assertions → `first().toBeVisible()`; chat 1..5 → `first().toBeVisible()` + `nth(5).toHaveCount(0)`; only-matching-products locator (+ live search-semantics check and the `'pliers'` → live-derived term change); pagination compares on the now-synced `goToPage`; failure messages on the kept bare asserts (`found`, statuses).
- Filter-narrowing tests switch from raw `.check()` to the awaiting page-object methods.

### Phase 4 — Grid assertion utils

- `src/ui/utils/grid-assert.util.ts`: `expectGridSorted`, `expectPricesAtMost` (guarded, messaged).
- `sortCases` collapses to a 4-tuple table; `category.spec.ts:61` and `product-filters.spec.ts:173` use the helpers.

### Phase 5 — User fixture

- `src/ui/fixtures/user-action.fixture.ts`: `loginAsFreshUser()` (API register + API token injection), worker-scoped `workerUser` + `loginAs(user)`; merge into `merge.fixture.ts`.
- Migrate the 24 call sites; apply `workerUser` only to the vetted non-mutating tests (list in Group G).
- Verify: full UI sweep + confirm the per-run registration count dropped.

### Phase 6 — Assorted spec cleanups

- Banner-dismiss unification (`toHaveCount(0)` + `BANNER_DISMISS_TIMEOUT`); optional extraction of the pinned i18n-key string to test-data.
- Profile `toHaveValue` blocks → data-driven over `profileFields`; `RequiredProfileField` type cleanup.
- Strength-meter width assertion shape unified with register.spec, widths sourced from `PASSWORD_STRENGTH_LEVELS`.
- Intersection-test dedupe + comment; `paginationNextItem` `aria-disabled` live check; smoke-tag migration to the `tag` option.

### Live checks to run during implementation (playwright-cli)

Search-by-description semantics; `aria-disabled` on the pagination next link; chat-toggle CSS placement (`position: fixed` + offsets); current banner detach timings.
