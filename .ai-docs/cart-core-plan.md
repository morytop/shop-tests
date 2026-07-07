# Plan: Cart core (test_plan.md §5.5, `tests/cart.spec.ts`)

## Goal

Implement the **core** subset of §5.5 "Cart" acceptance criteria confirmed with the user (2026-07-07).
In scope this pass (AC1–AC5):

1. **AC1** — Cart displays Item/Quantity/Price/Total/Actions columns once an item is added.
2. **AC2** — Changing quantity recalculates line total and cart total, with a
   **"Product quantity updated."** confirmation.
3. **AC3** — Deleting an item removes it and recalculates the cart total.
4. **AC4** — Empty cart shows **"Your shopping cart is empty"**.
5. **AC5** — "Proceed"/checkout advances only when the cart has ≥1 item (gating).

**Excluded / deferred (user decision, not gaps):**

- **AC6** — Per-item discount badge (original + discounted price): the same server-side/IP-determined
  `is_location_offer` discount that §10 and §12 already documented as **unautomatable** from CI. Skipped.
- **AC7 / AC8** — 15% rental+non-rental combination discount and its removal. Deferred to a follow-up
  pass (would extend the same `CartPage`).

## Context / what already exists (surveyed 2026-07-07)

- `src/pages/cart.page.ts` — a **minimal `CartPage`** (`extends BasePage`, `PAGE_URL = /checkout`) created for
  §5.4: has `bookmarks` (navbar), `productTitles` (`[data-test="product-title"]`), `rentalItemLabel`. §5.5 is
  expected to extend this with quantity/total/delete behaviour (per its own doc comment). Already registered in
  `src/fixtures/pages.ts` (type + export).
- `ProductDetailPage` (`src/pages/product-detail.page.ts`) — `addToCart()`, `setQuantity`, quantity stepper,
  `cartToast` (`.toast-message`). Detail pages reached by clicking a live card (no hard-coded id, §9).
- `ProductListPage` / `HomePage` — `clickProductCard(index)` to reach a product detail from the grid.
- `NavbarComponent` — `cartLink` (`nav-cart`), `cartQuantity` (`cart-quantity`, absent until cart non-empty).
- The rentals AC3 test already proves the guest add-to-cart → `/checkout` cart step flow works, and that the
  add is async (must wait for the cart badge before navigating). Reuse that pattern.
- Cart is a **guest, per-context localStorage cart** (§12) — starts empty, deterministic per test, safe to
  mutate. No account needed for AC1–AC5.

## Assumptions — confirmed via live exploration (2026-07-07)

- [x] The cart step at `/checkout` renders **one** `<table>` (role `table`) with column headers
      **Item / Quantity / Price / Total / (empty)**. The 5th "Actions" column header is **blank** — the AC's
      "Actions" label does not exist (discrepancy). Headers are `<th>` (role `columnheader`).
- [x] Per-line `data-test` hooks confirmed: `product-title` (span), `product-quantity` (**editable**
      `input[type=number] min=1 max=99`), `product-price` (unit, `$X.XX`), `line-price` (line total, `$X.XX`).
      Grand total is `[data-test="cart-total"]` (a `<td>`, `$X.XX`). One product row per item in `<tbody>`.
- [x] **Delete control has no `data-test`, no accessible name, no `href`** — it's an `<a class="btn btn-danger">`
      with an `aria-hidden` xmark icon, one per row in the last cell. No usable role/label → locate via a CSS
      chain scoped off the table: `table a.btn-danger` (permitted by CODING_STANDARDS when role/label can't
      express it). Deleting fires a **"Product deleted."** toast (bonus; AC3 only requires removal + recalc).
- [x] **AC2 requires a `change`/blur to commit, not just `fill`.** Typing into `product-quantity` updates the
      **line-price** display immediately (ngModel input binding) but does **not** persist or update `cart-total`
      or show the toast until the input **blurs**. `fill()` alone reverts on reload. On blur: `line-price` and
      `cart-total` both recalc and the ngx-toastr `.toast-message` reads **"Product quantity updated."**
      (verified: qty 1→3 on a $14.15 item → line `$42.45`, total `$42.45`). → page-object `updateQuantity`
      must `fill` **then** `blur`.
- [x] AC2 recalculation is exact: line total = unit price × qty, grand total = Σ line totals (verified
      two-item cart: `$28.30 + $12.01 = $40.31`). Assert arithmetic read back from the DOM within the test
      (unit price is stable within a single test; never hard-code it — §3/§9).
- [x] **AC3**: deleting one of two items removes that row (2→1), the other row remains, and `cart-total`
      recalculates to the survivor's line total (verified `$40.31` → `$12.01`).
- [x] **AC4 copy differs from the plan.** Empty cart shows **"The cart is empty. Nothing to display."** in a
      bare `<p>` (no `data-test`), NOT the documented "Your shopping cart is empty" (discrepancy). Locate via
      `getByText('The cart is empty. Nothing to display.')`.
- [x] **AC5 gating**: with ≥1 item, `[data-test="proceed-1"]` ("Proceed to checkout") is **visible & enabled**
      and clicking it advances to the **Sign in** step (the login `[data-test="email"]`/`login-submit` become
      **visible** — they exist in the DOM on the cart step but are hidden until you proceed, so visibility is a
      valid discriminator). With an **empty** cart, `proceed-1` is **absent** (count 0) — the wizard can't be
      advanced. Deleting the **last** item reverts to the empty-cart `<p>` and removes the navbar cart badge.

## Design decisions (finalized after exploration)

- **Extend the existing `CartPage`** (no new page object). Add locators:
  `columnHeaders` (`getByRole('table')` → `.getByRole('columnheader')`), `quantityInputs`
  (`[data-test="product-quantity"]`), `productPrices` (`[data-test="product-price"]`), `linePrices`
  (`[data-test="line-price"]`), `cartTotal` (`[data-test="cart-total"]`), `deleteButtons`
  (cart table `a.btn-danger`), `proceedButton` (`[data-test="proceed-1"]`), `emptyCartMessage`
  (`getByText('The cart is empty. Nothing to display.')`), `signInEmail` (`[data-test="email"]` — the AC5
  "advanced" signal), and `updateToast` (`.toast-message`, reused). Keep existing `productTitles`.
- Action methods (no `expect()`): `updateQuantity(index, value)` = fill nth quantity input **then blur**;
  `removeItem(index)` = click nth delete button; `proceedToCheckout()` = click `proceedButton`.
- **Reuse `.toast-message`** for both the update and delete confirmations, consistent with
  `ProductDetailPage.cartToast`.
- **Setup flow (guest cart)**: `homePage.goto()` → `clickProductCard(0)` → `productDetailPage.addToCart()` →
  wait for `bookmarks.cartQuantity` (async add) → `cartPage.goto()`. For the two-item AC3 test, add two
  distinct products by clicking two different cards (index 0 and 1), waiting for the toast/badge between adds
  (a second add fired before hydration silently no-ops — learned live). Select cards dynamically, no cached
  id (§3, §9).
- Prices read from the DOM (`$14.15`) — parse with a `$`-stripping helper in the spec; assert format
  `/^\$\d+\.\d{2}$/` and arithmetic, never a hard-coded amount.

## Risks and constraints

- Shared/mutable production catalog (§3, §9): no hard-coded product name/price/id — select the first product
  dynamically and read prices back from the DOM within the test.
- Cart is guest/session-local (§3, §12): assert on line/label presence and within-test arithmetic, **not**
  absolute cart counts carried across tests. Each test starts from an empty per-context cart.
- Add-to-cart / quantity update are async cart writes: wait for the badge/toast before asserting or
  navigating (learned in §13).
- No account mutation — AC1–AC5 are fully guest-cart; never touch shared seeded accounts (§3).
- Doc/behavior discrepancies (e.g. actual column headers, exact copy) must be folded back into `test_plan.md`
  (§9-style) per CLAUDE.md.

## Planned steps

1. [x] Step 0 — scope confirmed (AC1–AC5; defer AC6 unautomatable, AC7/AC8 follow-up).
2. [x] Step 1 — this plan file.
3. [x] Step 2 — live-explored the `/checkout` cart step: columns, quantity update + toast, delete, empty-cart
       message, proceed gating; captured stable locators; noted 3 discrepancies (blank Actions header,
       empty-cart copy, blur-to-commit).
4. [ ] Step 3 — assumptions folded back above; plan-mode sign-off for the design.
5. [x] Step 5 — extended `CartPage`; wrote `tests/cart.spec.ts` (5 tests, AAA, `tag` option, traceability).
6. [x] Step 6 — added `test_plan.md` §14 (findings + 3 discrepancies).
7. [x] Step 7 — validated: lint clean, format:check clean; `cart.spec.ts` 5/5; `@smoke` 12/12.
8. [x] Step 8 — reported.

## Status: complete (2026-07-07)

### Final test set (5 tests, all green)

- `cart lists an added item with Item/Quantity/Price/Total columns` (@regression) — AC1; asserts the blank
  5th header.
- `changing quantity recalculates line and cart total with a confirmation` (@regression) — AC2; fill+blur,
  "Product quantity updated." toast, arithmetic total.
- `deleting an item removes it and recalculates the cart total` (@regression) — AC3; two-item cart.
- `emptying the cart shows the empty-cart message` (@regression) — AC4; add→delete, real copy.
- `Proceed is available only with items and advances to the sign-in step` (@smoke @regression) — AC5.

### Key implementation notes

- Quantity commit is on blur, not keystroke — `updateQuantity` fills then blurs (see §14).
- Empty message only renders post-emptying; pristine cart is blank → AC4 adds+deletes, AC5 gating uses the
  pristine cart's absent `proceed-1`.
- Delete control has no role/label/`data-test` → CSS `getByRole('table').locator('a.btn-danger')`.
- Lint: avoided `?? ''` in test bodies (playwright/no-conditional-in-test) by using `innerText()`
  (non-null) for read-backs; `parsePrice` takes a `string`.

### Validation results

- `npm run lint` + `npm run format:check`: clean.
- `tests/cart.spec.ts`: 5/5 pass.
- `@smoke` (AC5 test is @smoke; shared `CartPage` touched): 12/12 pass.
