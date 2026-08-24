# Locator review refactor — action plan

## Goal

A batch of proposed locator/test cleanups was reviewed against favorites, discounts,
cart/invoice, privacy, product-detail, product-list, profile, and rentals. Per the
"never guess" rule, every claim was checked live against
https://practicesoftwaretesting.com with playwright-cli (registered a throwaway user,
inspected DOM via accessibility snapshots and `eval`) before any code changed — several
proposals turned out to need refinement or outright rejection once checked against the
real DOM, not just plausible-sounding.

## Findings (verified live, 2026-08-24)

### Favorites

- The empty-state element is a bare `<div>There are no favorites yet...</div>` — no
  `data-test`, no role, no class. `getByText(..., { exact: true })` beats the old
  `div.col > div:not(.card)` negative-CSS locator.
- A favorite card is `<div class="card mb-3" data-test="favorite-{id}">` — confirmed via
  `outerHTML`. This is already the exact pattern `CODING_STANDARDS.md` cites as the
  canonical example (`favoriteCards.getByTestId('product-name')`). **Rejected** the
  "delete button visible ⇒ assume a card" proposal — it doesn't scope/count cards
  correctly and conflates an action control with the card's identity. No code change.

### Discounts

- **Caught a naming bug in the proposal**: `addRentalToCart(index?, expectedBadgeCount?)`
  (`cart-action.fixture.ts`) takes a cart-badge-count as its 2nd argument, not a rental
  duration. `addRentalToCart(0, '2')` means "expect the cart badge to read 2 after this
  add" (1 product + 1 rental already in cart) — not "rent for 2 days". The proposed
  `RENTAL_DURATION_DAYS` constant name was **not** adopted.
- `CartPage.getFinancialSummary()` is a legitimate addition — the sanctioned "Page
  Object helper with a non-locator contract" exception in `CODING_STANDARDS.md`,
  precedented by `getProductPrices()`/`getPriceRangeMaxValue()` in
  `product-list.page.ts`. Returns `lineTotals: number[]` rather than the proposal's
  presumptive `productLinePrice`/`rentalLinePrice` field names — the method only knows
  DOM order, not which line is the rental; baking that assumption into field names would
  hide it instead of keeping it visible at the call site.

### `invoice-detail.page.ts`

- `subtotal`/`discount` are used (grep-confirmed) — only by `discounts.spec.ts`'s
  discounted-invoice test. Not dead code.
- **Rejected swapping `#subtotal`/`#additional_discount_percentage`/`#total` to
  `getByTestId`.** Placed a real discounted order (throwaway account: 1 product ×2 +
  1 rental → 15% combination discount, invoice `INV-2026000011`) and inspected the
  rendered inputs: **all three share the exact same `data-test="total"`** — already a
  documented bug (`PRODUCT_EXPLORATION.md` §5 Accessibility / §33), which explicitly
  says "The page object must use `#subtotal` / `#additional_discount_percentage` /
  `#total` ids." `getByTestId('total')` would match all three elements at once on a
  discounted invoice. The existing id-based locators are the deliberate, already-correct
  workaround — only the code comment was extended to cite this.

### Privacy

- Exactly 8 `<strong>` elements exist on the whole page, and Playwright's accessibility
  snapshot renders them as `strong "Information We Collect:"` etc. — Chromium exposes an
  implicit ARIA `strong` role for `<strong>` (HTML-AAM), so `getByRole('strong')` is a
  valid, equivalent, role-based swap for the raw tag selector.
- **Rejected** replacing the one `toHaveText(privacySectionTitles)` ordered-list
  assertion with 8 individual `getByText().toBeVisible()` checks: the test's own comment
  says the point is catching a section _added_ just as much as one _dropped_ — per-title
  presence checks would silently stop catching an addition (nothing asserts the total
  count). Kept the one full-array assertion; only swapped the underlying locator.
- **Kept `privacy.data.ts`** — matches the established `test-data/` convention
  (`address.data.ts`, `category.data.ts`: small, single-purpose, documented data files).
  Inlining the array into the spec would regress that convention, not simplify it.

### Product detail

- `productImage`: the main image is the only element on the page wrapped in a
  `<figure>` (related-product images are plain `<img>`, no `<figure>`). Swapped
  `img.figure-img` for `getByRole('figure').getByRole('img')`.
- Toasts: both variants share identical structure — outer
  `<div class="ngx-toastr toast-success|toast-error">` wrapping an inner
  `<div role="alert" aria-label="{message}">`, with **no role/label distinguishing
  success from error** — only the outer CSS class does, and the `aria-label` duplicates
  the full message text. Went through three iterations:
  1. `.locator('.toast-success').getByRole('alert')` / same for `.toast-error` — keeps
     the class (nothing else distinguishes success/error) but targets the real
     `role="alert"` leaf.
  2. User asked for pure `getByRole('alert')` with no CSS at all. Flagged that this
     makes `successToast`/`errorToast` identical locators, breaking the "no success
     toast leaked" assertions that depend on them being distinct; user accepted that
     tradeoff — landed on one `toast = page.getByRole('alert')` property, specs
     switched to `toBeVisible()` with the exact-text/counter-assertions dropped.
  3. **Running the suite against this caught a real bug in that design**: the
     "adding the same product to favorites twice" test failed with a strict-mode
     violation — `getByRole('alert')` resolved to _2_ elements (the first success toast
     was still fading out when the second click's error toast appeared). The user then
     suggested chaining `getByText`/`name` to distinguish the messages after all. Final
     form: `toastWithText: (text: string) => page.getByRole('alert', { name: text,
exact: true })` — a value-parametrized locator (the sanctioned CODING*STANDARDS
     pattern for a runtime-keyed locator), no CSS anywhere, and it restores full
     exact-message precision \_and* fixes the overlap bug (filtering by name always
     resolves to the one matching element even with two toasts on screen). The bare
     `toast` property was removed as dead once `toastWithText` covered every call site.
- `relatedProductCards`: related cards are `<a class="card">` with **no `data-test`**
  (unlike the main grid); each contains exactly one `<h5>`. Confirmed live: 4
  links-with-`h5` == 4 `a.card` elements == the 4 rendered related products, out of 32
  total links. Swapped to
  `getByRole('link').filter({ has: getByRole('heading', { level: 5 }) })`.

### Product list

- `productCards`: confirmed live that
  `getByRole('link').filter({ has: getByTestId('product-name') })` returns exactly the
  same elements as `a.card[data-test^="product-"]` (9 == 9, out of 39 total links on the
  home grid). Adopted — drops the raw attribute-prefix match for a role + semantic-child
  filter, consistent with the `checkedChildCategoryCheckboxes` `.and()` pattern already
  endorsed in `CODING_STANDARDS.md`.
- `waitForGrid`/`triggerAndAwaitProducts`/`goToNextPage`/`walkPages` being **private**
  is by design, not an oversight — no code change: only the composed public methods
  (`goToPage`, `goToLastPage`, `getAllProductNamesAcrossPages`, `find*CardAcrossPages`)
  are meant to be called from specs; making the internals public would let a spec call
  `goToNextPage()` directly and skip `walkPages`' loop guard.
- `MAX_PAGINATION_PAGES = 50` is a deliberate safety ceiling, not decoration — the
  catalog is shared, mutable production data (no seeded reset). Confirmed live the
  product grid currently runs 5 pages, and the same pagination component elsewhere
  (invoices) already reaches **11 pages** — added a comment recording this instead of
  changing the value.
- The `RegExp` anchors in `goToNextPage`/`goToPage` (`^${n}$`) are a real, demonstrated
  correctness need, **not overengineering**: confirmed live the invoices pagination
  (same component) currently renders `Page-10`/`Page-11`. An unanchored `hasText: '1'`
  filter on the single active `<li>` would substring-match an active item reading `"10"`
  or `"11"` — exactly what the anchor prevents. Added a comment; no logic change.
- `getSliderValue`'s `.and(page.locator('[aria-valuenow]'))` is **already** the
  best-practice idiom — confirmed live both range-slider handles expose
  `role="slider"` + `aria-label` + `aria-valuenow`; `.and()` isn't picking a different
  element, it's the "wait until this same handle also has the attribute" pattern
  `CODING_STANDARDS.md` itself endorses as the good example
  (`checkedChildCategoryCheckboxes`). Added a comment; no logic change.

### Profile

- `totpQrCode = page.locator('qrcode canvas')`: confirmed live the DOM is
  `<qrcode><div class="qrcode"><canvas>...</canvas></div></qrcode>` — no `data-test`,
  role, or `aria-label` anywhere in the subtree (`<canvas>` can't carry alt text).
  Genuinely the only option; added a comment recording that it was checked, not left as
  an unexplained CSS selector.
- `FIRST_NAME_SELECTOR` / `waitForProfileLoaded()`: kept the raw selector. Considered
  replacing it with `locator.elementHandle()` passed into `waitForFunction` (avoids the
  string entirely), but Playwright's own docs call `ElementHandle` "inherently racy"
  versus Locators and its return type is nullable — not worth it to wait on one field's
  _value_ (which is what forces `waitForFunction` here in the first place: no Locator
  wait expresses "this input's value became non-empty"). Added a comment explaining both
  why the raw selector exists and why the ElementHandle alternative was rejected.

### Rentals

- `rentalCards = page.locator('[data-test^="product-"]')`: confirmed live each card is
  `<div class="row no-gutters" data-test="product-{id}" tabindex="0">` — no role, no
  label, no role-based parent to scope off (cards are plain siblings, no `list`/`group`
  wrapper). CODING_STANDARDS-sanctioned exception; added the missing justification
  comment (the file had none, unlike its siblings). No locator change.
- Side note, out of scope here: this is a real accessibility gap (a clickable,
  focusable `<div>` with no `button`/`link` role) worth a `PRODUCT_EXPLORATION.md`
  entry — not added as part of this refactor.

## Changes

1. `src/ui/pages/favorites.page.ts` — `emptyMessage` → `getByText(..., { exact: true })`.
2. `tests/ui/favorites.spec.ts` — AC1's `toHaveText(...)` → `toBeVisible()`.
3. `src/ui/pages/cart.page.ts` — new `getFinancialSummary()` returning
   `{ lineTotals, subtotal, discount, total }`.
4. `tests/ui/discounts.spec.ts` — named constants
   (`PRODUCT_CARD_INDEX`/`RENTAL_CARD_INDEX`/`CART_BADGE_AFTER_PRODUCT`/
   `CART_BADGE_AFTER_RENTAL`/`COMBINATION_DISCOUNT_RATE`) applied across all three
   tests; test 1 rewritten to use `getFinancialSummary()`.
5. `src/ui/pages/invoice-detail.page.ts` — comment only, citing the shared
   `data-test="total"` bug and why the ids must stay.
6. `src/ui/pages/privacy.page.ts` — `sectionTitles` → `getByRole('strong')`.
7. `src/ui/pages/product-detail.page.ts` — `productImage` →
   `getByRole('figure').getByRole('img')`; `successToast`/`errorToast` merged into
   `toastWithText: (text) => page.getByRole('alert', { name: text, exact: true })`;
   `relatedProductCards` →
   `getByRole('link').filter({ has: getByRole('heading', { level: 5 }) })`.
   `tests/ui/product-detail.spec.ts` updated to match: each toast assertion now calls
   `toastWithText(exact message).toBeVisible()` in place of the old `toHaveText(...)`.
8. `src/ui/pages/product-list.page.ts` — `productCards` →
   `getByRole('link').filter({ has: getByTestId('product-name') })`; explanatory
   comments added to `MAX_PAGINATION_PAGES`, the two `RegExp` anchors, and
   `getSliderValue` (no logic changes).
9. `src/ui/pages/profile.page.ts` — comments added to `totpQrCode` and
   `FIRST_NAME_SELECTOR`/`waitForProfileLoaded()` (no logic changes).
10. `src/ui/pages/rentals.page.ts` — comment added to `rentalCards` (no logic change).

## Out of scope (follow-ups)

- `PRODUCT_EXPLORATION.md` entry for the rental card's missing button/link role —
  flagged, not filed.
- Retrofitting `getFinancialSummary()` into the discounted-invoice test (test 3 in
  `discounts.spec.ts`), which only reads `subtotal`/`discount`, not the full summary.

## Verification

1. `npm run lint` / `npm run tsc:check` — both green.
2. `npx playwright test tests/ui/favorites.spec.ts tests/ui/discounts.spec.ts
tests/ui/privacy.spec.ts tests/ui/product-detail.spec.ts tests/ui/profile.spec.ts
tests/ui/totp-setup.spec.ts tests/ui/rentals.spec.ts` against both the `chromium` and
   `chromium-logged` projects.

## Status

Completed 2026-08-24. `npm run lint`, `npm run format:check`, `npm run tsc:check` all
green. Ran every touched/dependent spec against the live app (`chromium` +
`chromium-logged` + `setup` projects): `favorites.spec.ts`, `discounts.spec.ts`,
`privacy.spec.ts`, `product-detail.spec.ts`, `profile.spec.ts`, `totp-setup.spec.ts`,
`rentals.spec.ts`, `product-overview.spec.ts`, `product-filters.spec.ts`,
`category.spec.ts`, `product-search.spec.ts` — all passed (a couple of unrelated
"Tearing down context exceeded the test timeout" flakes on retry, an infra teardown
issue independent of these changes). One real bug was caught and fixed mid-run: an
earlier iteration of the toast locator (plain `getByRole('alert')`) threw a strict-mode
violation in the favorite-twice test because a fading first toast and the new second
toast were both on screen — see Product detail §3 above.
