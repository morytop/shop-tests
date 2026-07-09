# Product detail — replace positional card selection in the cart-driving ACs — action plan

## Goal

Fix the suite weakness recorded in `test_plan.md` §26/§27: three tests in `tests/ui/product-detail.spec.ts` reach for
`clickProductCard(0)` and then drive **cart** controls, so they break whenever another engineer mutates a product to
the front of the shared grid (exactly what happened with `UpdatedProduct-test_products`, an out-of-stock item that
disabled the cart controls, then reverted on its own).

The three tests:

1. `quantity stepper defaults to 1, increments/decrements, and floors at 1`
2. `manual quantity entry is clamped to [1, 99]`
3. `adding to cart shows a confirmation and updates the cart badge`

Each must select a product **by the property it needs** — in stock, and offering a quantity stepper rather than a
rental duration slider — the way `findOutOfStockCardAcrossPages()` already selects by property for the out-of-stock
AC. Scope confirmed by the user: these three tests only.

## Assumptions and open questions

- **A1.** `ProductListPage` already has `outOfStockLabelSelector`, `outOfStockLabels`, `outOfStockCard` (filtered by
  `has:`) and `findOutOfStockCardAcrossPages()`. The inverse — a card **without** the out-of-stock label — should be
  expressible as `productCards.filter({ hasNot: outOfStockLabelSelector }).first()`. (To verify.)
- **A2.** Do rental products appear in the home/overview grid at all? If they do, an in-stock card can still land on a
  rental detail page, which renders a **duration slider instead of the quantity stepper** — fatal for tests 1 and 2.
  If rentals are excluded from the overview grid, "in stock" alone is a sufficient predicate. **Must verify against
  the live grid / the product API (`is_rental`), not assumed.**
- **A3.** Is an in-stock card guaranteed to exist on **page 1** of the default grid? If not, the helper must walk
  pages like `findOutOfStockCardAcrossPages()` does. Cheaper and more likely: assert one exists on page 1 and only
  add a walk if the live data says otherwise.
- **A4.** Test 3 also asserts the cart badge reaches `'1'`. That is independent of which product is chosen, but the
  chosen product must be addable (in stock). Discounted products are fine — the badge counts items, not price.
- **Open question:** should the new selection live as a `ProductListPage` method (a `goto()` + pick + click flow) or
  as a locator plus an existing `clickProductCard`-style action? Prefer a locator + a thin action, matching how
  `outOfStockCard` is a locator that the spec clicks directly.

## Risks and constraints

- **This edits three currently-passing tests.** The catalog reverted, so all 9 tests in `product-detail.spec.ts` pass
  today. A regression here would be invisible against "it passed before" — so all 9 must pass after, and the new
  selection must be demonstrated to actually pick a non-first card when the first is unsuitable (otherwise the fix is
  untested and indistinguishable from the status quo).
- **The bug is not currently reproducible** — the mutated product is gone. To prove the fix works I must **simulate**
  the hazard rather than wait for it: temporarily route/stub the products response, or verify the locator against a
  grid where a known out-of-stock product sits first (e.g. by sorting), rather than trusting that it "would" work.
- No hard-coded catalog data (§3/§9) — the predicate is structural (absence of the out-of-stock label), never a name
  or id.
- Shared `ProductListPage` is the base of the home page and every category page, so any addition there is inherited by
  `category.spec.ts`, `product-overview.spec.ts`, `product-filters.spec.ts`, `product-search.spec.ts`. Additive only.
- No `expect()` in page objects. `playwright/no-conditional-in-test` forbids `if`/ternary/`?.`/`??` in test bodies —
  any "find the first suitable card" logic must live in the page object.
- `CODING_STANDARDS.md`: locators are `readonly` properties assigned in the constructor, never built by a getter.

## Planned steps

1. Write this plan file. ✅
2. Survey `src/ui/pages/product-list.page.ts`, `product-detail.page.ts`, and the three tests.
3. **Explore live** (`playwright-cli` + the products API) to resolve A2/A3: whether rentals appear in the overview
   grid, whether `is_rental`/`in_stock` are exposed, and whether page 1 always holds a suitable card. Fold findings
   back into this file.
4. Design sign-off via plan mode (touches a shared base page object + rewrites three existing tests).
5. Implement the locator/method on `ProductListPage`; rewrite the three tests' Arrange to use it.
6. Update `test_plan.md`: close the §26 follow-up note, record the outcome.
7. Validate: `lint`, `format:check`, `tsc:check`; run all of `product-detail.spec.ts`; **prove the fix** by simulating
   an unsuitable first card; re-run the specs sharing `ProductListPage`.
8. New branch → conventional commit → PR.

## Exploration findings (2026-07-09) — resolves A1–A4

- **A1 CONFIRMED.** `ProductListPage` already holds `outOfStockLabelSelector` and builds `outOfStockCard` as
  `productCards.filter({ has: outOfStockLabelSelector }).first()`. The inverse is `filter({ hasNot: ... })`, and
  `findOutOfStockCardAcrossPages()` gives the exact walk shape (`waitForGrid` → count → `isOnLastPage` →
  `goToNextPage`) to mirror.
- **A2 RESOLVED — rentals can never appear in the overview grid.** `ProductService.getProductsNew()` always sends
  `is_rental=false` (`params.set('is_rental', isRental ? 'true' : 'false')`, default `false`); rentals are fetched by
  a separate call with `is_rental=true`. Confirmed against the API: the default `/products` returns 0 rentals, while
  `?is_rental=true` returns 3 (Excavator, …). ⇒ **"in stock" alone is a sufficient predicate**; no rental check is
  needed, and a card picked from the overview grid can never land on a duration-slider detail page.
- **A3 RESOLVED.** Live page 1 holds 9 cards, 8 in stock and 1 out of stock (`Long Nose Pliers`) — so a page-1-only
  locator would work _today_. But that is precisely the assumption this task exists to remove: nothing stops another
  engineer's mutation from filling page 1 with out-of-stock items. ⇒ implement the **page-walking** variant,
  symmetric with `findOutOfStockCardAcrossPages()`.
- **A4 CONFIRMED.** The cart badge assertion is product-independent; the chosen product need only be addable.
  Discounted products are fine (the badge counts items).

## Design (for sign-off)

**`src/ui/pages/product-list.page.ts`** — additive only, inherited by home + every category page:

- `inStockCard` locator, assigned in the constructor next to `outOfStockCard`:
  `productCards.filter({ hasNot: outOfStockLabelSelector }).first()`.
- `findInStockCardAcrossPages(): Promise<boolean>` — the same walk as `findOutOfStockCardAcrossPages()`, reusing the
  private `waitForGrid()` / `isOnLastPage()` / `goToNextPage()`.

**`tests/ui/product-detail.spec.ts`** — in the three cart-driving tests only, replace

```ts
await homePage.goto();
await homePage.clickProductCard(0);
```

with the property-based Arrange already used by the out-of-stock test:

```ts
await homePage.goto();
const found = await homePage.findInStockCardAcrossPages();
expect(found).toBe(true);
await homePage.inStockCard.click();
```

The other tests keep `clickProductCard(0)`: display fields, related products and the three favorites tests are all
indifferent to stock (an out-of-stock product can still be favorited), and `findOutOfStockCardAcrossPages()` already
serves the out-of-stock AC.

## Proving the fix (not just re-running a green suite)

The hazard is **not currently reproducible** — the mutated product reverted, so all 9 tests pass on `main` today and
would pass with or without this change. Re-running them therefore proves nothing. I will additionally stub the
overview grid's `/products` response in a **throwaway spec** so that an out-of-stock product sits at index 0, then
assert that `findInStockCardAcrossPages()` + `inStockCard` select a _different_ card than `clickProductCard(0)` would
— i.e. that the old code would have failed and the new code does not. The throwaway spec is deleted afterwards.

## Status

**COMPLETED 2026-07-09 — ready for review.** A1–A4 resolved, design signed off, all three tests converted.

Files touched: `src/ui/pages/product-list.page.ts` (`inStockCard` + `findInStockCardAcrossPages()`, additive),
`tests/ui/product-detail.spec.ts` (three Arrange blocks + header comment), `test_plan.md` (§26 note closed, new §28).

Validation: `lint` / `format:check` / `tsc:check` clean; `product-detail.spec.ts` 9/9; `category.spec.ts` 7/7 in
isolation.

**The fix was proven, not just re-run.** A throwaway spec stubbed the grid's `/products` response to put a genuinely
out-of-stock product at index 0 (detail responses left real). Under that stub `clickProductCard(0)` hit a **disabled**
add-to-cart — reproducing the original failure — while `findInStockCardAcrossPages()` + `inStockCard` picked a
different product with an **enabled** add-to-cart. Throwaway spec deleted afterwards.

**Open, unconfirmed:** `category.spec.ts` failed 2 tests once when four `ProductListPage` specs ran together (25 tests
in parallel); it passes 7/7 alone on both this branch and clean `main`. Almost certainly load-induced flake — nothing
here changes any code path `category.spec.ts` exercises — but the four-file combo was **not** re-run on clean `main`
as a control (stopped at the user's request). Recorded in §28.
