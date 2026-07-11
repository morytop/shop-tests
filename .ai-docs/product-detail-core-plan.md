# Plan: Product Detail — core (TEST_PLAN.md §5.3, `tests/product-detail.spec.ts`)

## Goal

Implement the **core** subset of §5.3 "Product Detail" confirmed with the user (2026-07-07).
In scope this pass:

1. Display fields: image, name, description, price, **category badge**, **brand badge** shown.
2. Quantity stepper: default 1; `+`/`-` increment/decrement; `-` at 1 stays at 1.
3. Manual quantity entry: typed value applied and clamped to [1, 999999999] (below-1, far-above-max, valid mid).
4. Add to cart: success message "Product added to shopping cart." + cart badge/count updates.
5. Out-of-stock non-rental: "Add to Cart" disabled, "Out of stock" shown in red.
6. Related products section present below main content.

**Excluded / deferred (user decision, not gaps):**

- Discounted product (strikethrough + discount % badge) — unautomatable, §10 confirmed (server/IP-side).
- Rental duration slider + price recalc — deferred to a follow-up pass.
- Favorites logged-in (add + already-added) and logged-out (Unauthorized) — deferred (needs auth setup).

## Context / what already exists (surveyed 2026-07-07)

- No `product-detail.page.ts` and no `tests/product-detail.spec.ts` yet.
- `ProductListPage` (`src/pages/product-list.page.ts`) already knows how to reach a detail page:
  `productCards` (`a.card[data-test^="product-"]`), `clickProductCard(index)`, and
  `findOutOfStockCardAcrossPages()` (walks pages to surface an out-of-stock card). Product cards link to
  `/product/<id>` (asserted in `product-overview.spec.ts`).
- Confirmed stable listing locators from §10: `product-name`, `product-price`, `out-of-stock`.
- Navbar component (`src/components/navbar.ts`) is the shared header; cart badge lives in the header.
- Fixtures: register any new page object in both the `Pages` type and `pages` export in `src/fixtures/pages.ts`.
- Auth pattern (for future favorites pass): register via faker (`register.spec.ts`), login via `LoginPage.login`.

## Assumptions — confirmed via live exploration (2026-07-07)

- [x] Display locators: name `[data-test="product-name"]` (h1); price `[data-test="unit-price"]` — **bare number** e.g. `14.15`, no `$` (unlike the listing card's `product-price` "$X.XX"); description `[data-test="product-description"]`; main image `img.figure-img` (only one on the page; related cards use `card-img-top`); **category badge `[aria-label="category"]`** and **brand badge `[aria-label="brand"]`** (`span.badge.rounded-pill`, no `data-test`) → use `getByLabel('category'|'brand')`.
- [x] Stepper: input `[data-test="quantity"]` (type=number, min=1 **max=99**, default 1); `[data-test="increase-quantity"]` / `[data-test="decrease-quantity"]`. Confirmed: dec at 1 stays 1; inc 1→2→3; dec 3→2.
- [x] **Manual-entry clamp is [1, 99], NOT the documented [1, 999999999].** Verified with real `fill()`: `0`→`1`, `-5`→`1`, `100000`→`99`, `50`→`50`. §5.3 AC wording is inaccurate — record as a discrepancy and assert the real [1,99] bounds.
- [x] Add to cart: `[data-test="add-to-cart"]`; success is an ngx-toastr toast — inner `.toast-message` `[role="alert"]`, text exactly **"Product added to shopping cart."**; cart badge in the navbar is `[data-test="nav-cart"]` with `[data-test="cart-quantity"]` — **absent when the cart is empty**, appears after first add (guest cart is per-context localStorage, so fresh/deterministic per test).
- [x] Out-of-stock non-rental (found live via API `in_stock:false, is_rental:false`, reached by clicking the listing's out-of-stock card): `[data-test="add-to-cart"]` present but **`disabled`**; `[data-test="out-of-stock"]` text "Out of stock", class `text-danger` (red, rgb(202,11,0)). Quantity/`+`/`-` still rendered.
- [x] Related products: `<h2>Related products</h2>` (no `data-test`) → `getByRole('heading', { name: 'Related products' })`; its cards are `a.card` (reuse `productCards`-style structure).

## Design decisions

- New `src/pages/product-detail.page.ts` (`ProductDetailPage extends BasePage`). Detail pages have a **dynamic** `/product/<id>` URL and are always reached by **clicking a product card** from a listing (never a hard-coded id, per §9). `PAGE_URL` set to the base `/product` (added to `page-urls.ts`) only to satisfy the abstract contract; `goto()` is not the entry path — documented in a JSDoc.
- Cart badge belongs to the shared header → add `cartQuantity` (and `cartLink`) to `NavbarComponent`; access via `productDetailPage.bookmarks.cartQuantity`.
- Out-of-stock detail reached by reusing `ProductListPage.findOutOfStockCardAcrossPages()` then clicking `homePage.outOfStockCard` — fully live, no cached id.
- Toast locator kept generic (`.toast-message`); the expected string lives in the spec assertion (no `expect`/hard-coded text in the POM).

## Risks and constraints

- Shared/mutable production catalog (§3, §9): no hard-coded product name/price/id. Select the product
  dynamically (first card, or first out-of-stock card). Fetch the live product link immediately before use.
- Add-to-cart mutates a **cart**, not shared account data — safe for guest/session; no login needed for core ACs.
- Cart badge counts are session-local; assert relative change (0 → N or increments), not an absolute shared count (§3).
- Clamp AC: assert structural behavior (value floored/capped), not a specific catalog-dependent value.
- Read-only display ACs — no destructive risk.

## Planned steps

1. [x] Step 0 scope confirmed (Core, defer rental+favorites).
2. [x] Step 1 this plan file.
3. [ ] Step 2: live-explore a product detail page (in-stock + out-of-stock) via playwright to confirm all locators/behavior above.
4. [ ] Step 3: update this plan with confirmed/rejected assumptions; plan-mode sign-off on the test set + new page object.
5. [ ] Step 5: implement
   - `src/pages/product-detail.page.ts` (`ProductDetailPage extends BasePage`) — locators + action methods, no `expect()`.
   - Register in `src/fixtures/pages.ts` (type + export).
   - Cart badge locator likely belongs on `NavbarComponent` (shared header) — add there if so.
   - `tests/product-detail.spec.ts` — AAA, tags per §3, reference §5.3 / v5 AC in a describe comment.
6. [ ] Step 6: update `TEST_PLAN.md` (new implementation-findings section + any doc/behavior discrepancy).
7. [ ] Step 7: validate — `npm run lint`, `npm run format:check`, run the new spec + `@smoke`; run listing specs if `ProductListPage`/navbar touched.
8. [ ] Step 8: report + mark this plan complete.

## Status: complete (2026-07-07)

- [x] Step 0 scope confirmed (Core, defer rental+favorites); [x] Step 1 plan; [x] Step 2 live exploration; [x] Step 3 assumptions confirmed.
- [x] Step 5 implemented: `src/pages/product-detail.page.ts`, `NavbarComponent` cart locators, `PAGE_URLS.PRODUCT`, fixtures registration, `tests/product-detail.spec.ts`.
- [x] Step 6 `TEST_PLAN.md` updated (new §12 + clamp/price/badge discrepancies).
- [x] Step 7 validated.

### Final test set (6 tests, all green)

- `detail page shows image, name, price, description, category and brand` (@regression).
- `quantity stepper defaults to 1, increments/decrements, and floors at 1` (@regression).
- `manual quantity entry is clamped to [1, 99]` (@regression) — asserts the real bounds, not the documented [1, 999999999].
- `adding to cart shows a confirmation and updates the cart badge` (@smoke @regression).
- `out-of-stock product disables add-to-cart and shows the out-of-stock label` (@regression).
- `detail page shows a related products section` (@regression).

### Validation results

- `npm run lint` + `npm run format:check`: clean.
- `tests/product-detail.spec.ts`: 6/6 pass.
- `@smoke` (incl. the new add-to-cart smoke test; `NavbarComponent` was touched): 10/10 pass.
