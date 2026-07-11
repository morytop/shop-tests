# Favorites (§5.16) — action plan

## Goal

Implement `tests/ui/favorites.spec.ts` covering all three ACs of `TEST_PLAN.md` §5.16:

1. Empty state message when no favorites.
2. Adding a product from the detail page surfaces it on the favorites page with image / name / truncated description.
3. Removing a favorite updates the list immediately.

Scope confirmed by the user: **§5.16 only**. The two deferred §5.3 favorites ACs that belong to
`product-detail.spec.ts` (logged-in add success + "already in favorites"; logged-out "Unauthorized") stay deferred and
will be reported as a remaining gap, not implemented here.

## Assumptions and open questions

- **A1.** Favorites live at `/account/favorites` and need a **new page object** (`src/ui/pages/favorites.page.ts`,
  extending `BasePage`) plus registration in both the `Pages` type and `pageObjectTest` in
  `src/ui/fixtures/page-object.fixture.ts`, and a new `PAGE_URL` entry in `src/ui/constants/page-urls.ts`. (To verify —
  the account area already has `account.page.ts` / `profile.page.ts`, so the URL constant pattern exists.)
- **A2.** "Add to favourites" is on the product detail page (British spelling per §9's 2026-07-05 finding, line 314),
  so `product-detail.page.ts` likely needs an `addToFavourites()` action + button locator added. Whether it already
  has one is unverified. (To verify.)
- **A3.** The empty-state copy for AC1 is undocumented in `TEST_PLAN.md` — must be read off the live app, not guessed.
- **A4.** AC2's "truncated description" — the truncation rule (character count? CSS ellipsis? server-side substring?)
  is undocumented. Must be measured live. If it's pure CSS ellipsis there is no text assertion to make and the AC
  becomes "description is displayed"; if it's a server/JS substring, assert the truncation contract.
- **A5.** AC3's "updates the list immediately" — unverified whether removal is optimistic client-side or a page
  refetch, and whether a confirmation dialog intercedes. Must be observed live.
- **Open question:** is there a favorites count/badge anywhere that other specs assert on? If so, parallel-safe
  assertions matter (§3 forbids asserting absolute counts from a shared session).

## Risks and constraints

- **Destructive by definition (`TEST_PLAN.md` §3).** All three ACs mutate a user's favorites collection.
  - Never `testUser1` — per `CLAUDE.md` it reads straight from `USER_EMAIL` and **is** the shared seeded
    `customer@practicesoftwaretesting.com` account.
  - Never the `@logged` `storageState` session user — `tests/setup/login.setup.ts` shares one user across every
    `@logged` spec in a run, so a favorites add/remove there would race other specs.
  - ⇒ **Every test registers its own throwaway user** via `registerUserWithApi(usersRequest)` and logs in inline,
    exactly as `profile.spec.ts` / `change-password.spec.ts` do. This includes AC1 (empty state), which additionally
    _requires_ a user with a guaranteed-empty favorites list — only a fresh user gives that.
- **No hard-coded catalog data (§3 / §9).** The product used in AC2/AC3 must be picked from the live grid at runtime
  (e.g. the first card), and its name/description read from the page, not asserted against a literal.
- `playwright/no-conditional-in-test` is enforced (`--max-warnings=0`): no `if` / ternary / `?.` / `??` in test bodies.
- No `expect()` in page objects; sync via `waitFor()`.
- Favorites tests are parallel with the rest of the suite — assertions must be scoped to the test's own user's list,
  which fresh registration guarantees.

## Planned steps

1. Write this plan file. ✅
2. Survey existing code: `product-detail.page.ts` / `product-detail.spec.ts`, `account.page.ts`, `profile.spec.ts`
   (throwaway-user precedent), `page-urls.ts`, `page-object.fixture.ts`, `user.factory.ts` / `api` factories.
3. **Explore live** with the `playwright-cli` skill on a freshly-registered throwaway user, resolving A1–A5:
   the favorites page URL + DOM contract, the empty-state copy, the "Add to favourites" button contract and its
   success message, the favorites row/card markup (image/name/description), the truncation rule, and the removal
   interaction + whether the list updates without a reload. Fold findings back into this file.
4. Get design sign-off via plan mode (new page object + fixture change + 3 tests is beyond a trivial addition).
5. Implement: `favorites.page.ts`, `page-urls.ts` + `page-object.fixture.ts` registration, any
   `product-detail.page.ts` additions, `tests/ui/favorites.spec.ts` (AAA, per-test AC comment per §7, tagged per §3).
6. Update `TEST_PLAN.md`: mark §5.16 implemented, record any new doc/behavior discrepancy in §9.
7. Validate: `npm run lint`, `npm run format:check`, `npm run tsc:check`; run the new spec; run `@smoke`; re-run
   `product-detail.spec.ts` (and any other spec importing a page object I touch).
8. New branch → conventional commit → PR.

## Live exploration findings (2026-07-09) — resolves A1–A5

Explored with `playwright-cli` against a throwaway API-registered user (`fav.1783628363@example.com`), then confirmed
against the app source the user pointed at (`../practice-software-testing/sprint5/UI`, prod is v5.0 → `sprint5`).

- **A1 CONFIRMED.** Route is `/account/favorites`, title `Favorites`. No favorites page object, no `PAGE_URL` entry,
  no navbar locator exists yet ⇒ new `favorites.page.ts` + `PAGE_URLS.FAVORITES` + fixture registration.
  Page contract (`app-favorites`):
  - `<h1 data-test="page-title">Favorites</h1>`
  - empty state: a bare `div.col > div` (**no `data-test`**) — locate structurally, assert the copy in the spec.
  - each favorite: `div.card[data-test="favorite-<favoriteId>"]` — note the id is the **favorite's** id, not the
    product's — containing `img.card-img` (`alt` = product name), `h5[data-test="product-name"]`,
    `p[data-test="product-description"]`, and `button[data-test="delete"]`.
  - **Not reachable from the `/account` dashboard** — that page only offers Profile / Invoices / Messages tiles.
    Favorites is reached via the navbar user menu (`[data-test="nav-my-favorites"]`) or the direct URL.
- **A2 CONFIRMED.** `product-detail.page.ts` has no favorites locator. The button is
  `[data-test="add-to-favorites"]` (American in the attribute) with the visible label **"Add to favourites"**
  (British — matches §9's 2026-07-05 note). Clicking it POSTs `/favorites` and raises an ngx-toastr
  `.toast-message` reading **"Product added to your favorites list."**; a second click on the same product yields
  **"Product already in your favorites list."** (both are §5.3 ACs — recorded here, _not_ asserted in this pass).
- **A3 RESOLVED.** Empty-state copy is exactly:
  `There are no favorites yet. In order to add favorites, please go to the product listing and mark some products as your favorite.`
- **A4 RESOLVED — it is a real substring, not CSS ellipsis.** `favorites.component.html` pipes the description
  through `| truncate: 250`, and `TruncatePipe.transform` is `text.length > length ? text.substring(0, length).trim() + '...' : text`
  (note the **`.trim()`** before the suffix). Verified live: a 738-char description rendered at 253 chars ending
  `irregularly...`, and `shown === full.slice(0,250) + '...'`. Short descriptions render in full with no ellipsis.
  `text-overflow` computes to `clip`, so there is no CSS truncation. ⇒ needs a `truncate()` util mirroring the pipe;
  the assertion then holds for both long and short descriptions without hard-coding any catalog text.
- **A5 RESOLVED — and it is a real flake trap.** `FavoritesComponent` initialises `favorites: Favorite[] = []` and the
  template guards the empty state with `@if (!favorites?.length)`, so **the "no favorites yet" message is rendered
  while `GET /favorites` is still in flight.** A naive AC1 assertion would pass before data ever loads, and would pass
  for a user who _does_ have favorites. ⇒ the page object must gate on the `GET /favorites` response, mirroring
  `ProductListPage.triggerAndAwaitProducts()`.
- **Removal (AC3) is a refetch, not an optimistic splice:** `deleteFavorite()` → `DELETE /favorites/{id}` → on success
  re-runs `loadFavorites()` (`GET /favorites`). Observed live: no confirmation dialog, no toast, no navigation — the
  card disappears in place, and removing the last one restores the empty-state message without a reload.
- **Open question closed:** there is no favorites counter/badge anywhere in the navbar, so nothing else in the suite
  can be perturbed by these tests.

## Design (for sign-off)

**`src/ui/constants/page-urls.ts`** — add `FAVORITES: '/account/favorites'`.

**`src/ui/utils/text.util.ts`** (new) — `truncate(text, length = 250, suffix = '...')`, mirroring the app's
`TruncatePipe` (including the `.trim()`). Pure, page-agnostic ⇒ a util, per CODING_STANDARDS.

**`src/ui/pages/favorites.page.ts`** (new, extends `BasePage`) — locators `title`, `emptyMessage`
(`app-favorites` → `div.col > div:not(.card)`), `favoriteCards`, `favoriteImages`, `favoriteNames`,
`favoriteDescriptions`, `deleteButtons` (each chained off `favoriteCards` in the constructor). Methods (no `expect()`):
`gotoAndAwaitLoaded()` (`Promise.all([waitForResponse(GET /favorites), goto()])`) and `removeFavorite(index)`
(plain click — the spec's auto-retrying `toHaveCount` is what proves the list updates without a reload).

**`src/ui/pages/product-detail.page.ts`** — add `addToFavoritesButton` + `addToFavoritesAndAwaitSaved()`, which awaits
the `POST /favorites` response so a following navigation can't outrun the write (same rationale as
`addToCartAndAwaitBadge`). Deliberately **not** touching `cartToast`: the toast copy is a §5.3 AC, out of scope here.

**`src/ui/fixtures/page-object.fixture.ts`** — register `favoritesPage` in the `Pages` type and `pageObjectTest`.

**`tests/ui/favorites.spec.ts`** (new) — `test.describe('Verify favorites')`, three tests, each registering its own
throwaway user via `registerUserWithApi` and logging in inline, all tagged `['@auth', '@favorites', '@regression']`
(`@favorites` is a new feature tag, consistent with §3's `@login`/`@register`/`@profile` precedent):

1. AC1 — a freshly-registered user sees the empty-state message and zero favorite cards.
2. AC2 — favorite the first product from its detail page; the favorites page shows exactly one card whose name matches,
   whose description equals `truncate(fullDescription)`, and whose image is visible with `alt` = the product name.
3. AC3 — favorite two products, remove the first; the list drops to one card in place (no reload), the remaining card
   is the second product, and the removed name is gone.

No product name/price/description is hard-coded — all are read from the live detail page at runtime (§3/§9).

## Status

**COMPLETED 2026-07-09 — ready for review.** A1–A5 resolved, design signed off, all three ACs implemented and
passing.

Files touched: `src/ui/constants/page-urls.ts`, `src/ui/utils/text.util.ts` (new),
`src/ui/pages/favorites.page.ts` (new), `src/ui/pages/product-detail.page.ts`,
`src/ui/fixtures/page-object.fixture.ts`, `tests/ui/favorites.spec.ts` (new), `TEST_PLAN.md` (§5.16 + new §26),
`CLAUDE.md` (spec list).

Validation: `lint` / `format:check` / `tsc:check` clean; `favorites.spec.ts` 3/3; AC1 3/3 under `--repeat-each=3`
(exercising the loading-race gate); `rentals.spec.ts` (shares `ProductDetailPage`) passing.

**Pre-existing failures, not caused by this change:** `product-detail.spec.ts` fails 3 tests (quantity stepper,
manual quantity clamp, add-to-cart confirmation) identically on clean `main` — the first home-grid card is now an
API-mutated, out-of-stock product. Recorded in `TEST_PLAN.md` §26 as a follow-up gap.

**Not run** (cut short at the user's request): `cart.spec.ts`, the `checkout-*` specs, and the `@smoke` tag.

**Still deferred:** the §5.3 product-detail favorites ACs (add-success / "already in favorites" toasts, logged-out
"Unauthorized"), per the confirmed scope.
