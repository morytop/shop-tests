# Plan: Product Overview / Home — Search & Filters/Sort (test_plan.md §5.1, remainder)

## Goal

Implement the remaining §5.1 ACs deferred from the "core browse" pass (`.ai-docs/product-overview-core-browse-plan.md`), confirmed with user as two separate spec files:

**`tests/product-search.spec.ts`**

- Search: valid query (3–40 chars) filters grid to matching products only; submitting a new search clears previously active filters.
- Search: query shorter than 3 chars is rejected or ignored (boundary).

**`tests/product-filters.spec.ts`**

- Category filter: selecting one category shows only that category's products.
- Category filter: selecting a parent category auto-checks its children; unchecking all children unchecks the parent.
- Brand filter: selecting a brand filters the grid.
- Combined category + brand filters apply as AND (intersection).
- Sorting: each of Name A-Z, Name Z-A, Price Low-High, Price High-Low produces a correctly ordered grid (assert on adjacent-pair comparisons, not full list equality).
- Price range slider: default bounds are $1–$100 (max $200); dragging/setting handles filters the grid to products within range.

Still out of scope for this pass (per existing §10 note, discount mechanism confirmed unautomatable): discounted product card strikethrough/discount price — already handled as `test.skip` in `product-overview.spec.ts`.

## Assumptions and open questions — confirmed via live exploration (2026-07-06)

- **Search**: `input[data-test="search-query"]` (sidebar, not navbar), `button[data-test="search-submit"]`, `button[data-test="search-reset"]`. Query <3 chars: form gets Angular `ng-invalid` class, **no API request fires**, grid stays unchanged — confirmed via network trace (no new `/products` request after submitting a 1-char query) and no visible inline error text is rendered. Test should assert on unchanged grid content (same pattern as existing pagination test), not a text message.
- Submitting a **valid** search clears active category/brand checkboxes (confirmed live: checked "ForgeFlex Tools" brand, then searched "pliers" → both brand checkboxes reset to unchecked, grid narrowed to matching products).
- **Category filter**: checkboxes are `input[data-test^="category-"]` (data-test suffix is an opaque product-category ID, not the name — never hard-code). Sidebar is a recursively-rendered tree; top-level and child checkboxes are structurally identical (`fieldset > div.checkbox > label > input`) except children are additionally wrapped in a `<ul>`. Confirmed distinguishing CSS:
  - Top-level (parent) checkboxes: `#filters > fieldset > div.checkbox > label > input[data-test^="category-"]` (3 matched: Hand Tools, Power Tools, Other).
  - Child checkboxes: `#filters ul input[data-test^="category-"]` (16 matched: descendants of any `<ul>` inside the filters sidebar).
  - Checking a parent auto-checks all its children (confirmed: checking "Hand Tools" checked its 7 children). Unchecking all children auto-unchecks the parent (confirmed).
  - Checking a single leaf category narrows the grid live, no separate "Apply" step (confirmed via `/products` XHR + grid content diff).
- **Brand filter**: `input[data-test^="brand-"]` (2 present live: ForgeFlex Tools, MightyCraft Hardware — but per §3/§9, don't hard-code count/names). Checking one narrows the grid live (confirmed).
- **Combined filters**: confirmed AND/intersection — checking category "Hammer" (7 products) + brand "ForgeFlex Tools" (9 products, one of which is unrelated leftover test data "Automated Test Hammer (Updated)" reinforcing the §9 pollution note) together yielded exactly the 6-product intersection.
- **Sort**: native `<select data-test="sort">` with option values `name,asc` / `name,desc` / `price,desc` / `price,asc` (plus two undocumented `co2_rating,*` options tied to the unspec'd §9 "Sustainability" feature — **out of scope**, not part of the 4-order AC). Confirmed `price,asc` sort produces a monotonically non-decreasing price sequence live.
- **Price range slider**: it's `ngx-slider`, a custom two-handle ARIA slider (`role="slider"`, `tabindex="0"`, `aria-valuenow`), not a native `<input type=range>`. Two handles distinguished by accessible name: `ngx-slider` (min) and `ngx-slider-max` (max) — must use `exact: true` since one name is a substring of the other. **Confirmed interaction mechanism**: click/focus the handle, then send `ArrowLeft`/`ArrowRight` keys to change value by 1 per press — far more reliable than pixel-based dragging. Confirmed live: focused max handle, pressed `ArrowLeft` ×85 to move it from 100→15, and the grid live-updated to only show products priced ≤$15.
- **No URL/query-param reflection**: confirmed `window.location.href` stays `.../#/` regardless of active search/filter/sort/price-range state — this is a client-side Angular app with no query-string sync, so filter state must be asserted via DOM (grid content, checkbox/slider state), not the URL.
- Data-quality risk (test_plan.md §9) is now empirically reconfirmed: the ForgeFlex Tools brand filter surfaced a leftover "Automated Test Hammer (Updated)" product from another automated run. Filter tests must assert structural behavior (narrowing occurred, intersection is a subset of each individual filter's results) rather than fixed names/counts.

## Post-implementation fixes (2026-07-06)

First full run of both specs surfaced **1 failing test** — _"combined category and brand filters apply as an intersection"_ — which exposed two issues (both fixed):

- **Pagination controls are removed from the DOM when results fit one page.** When a filter narrows the grid to a single page, `ngb-pagination` (and thus `[data-test="pagination-next"]`) is not rendered at all, so `paginationNextItem.getAttribute('class')` hung until timeout. Fixed with `HomePage.isOnLastPage()`, which treats **missing pagination as the last page**; reused in `goToLastPage` and `findOutOfStockCardAcrossPages`.
- **Name-diff polling to detect "filter applied" is racy against pagination position.** The original test used `expect.poll(getProductNames).not.toEqual(previousFirstPage)`. After `getAllProductNamesAcrossPages` walks to the last page, the grid is no longer on page 1, so that poll passed _prematurely_ — before the new filter's `/products` response landed — and page-collection then started from a stale result set, leaking unrelated products (e.g. "Protective Gloves") into the "combined" set. Fixed by **synchronizing filter/pagination actions on the network response** instead of guessing via DOM diffs.
  - Both filter changes (`GET /products?by_category=…&by_brand=…`) and page turns (`QUERY /products`) share pathname `/products`. New `HomePage.triggerAndAwaitProducts()` awaits that response; new `filterByChildCategory` / `clearChildCategoryFilter` / `filterByBrand` helpers and the pagination walk use it.
  - The intersection test was rewritten to assert the true invariant: **combined result === set-intersection of the two filters applied in isolation** (order-independent via sorted arrays; no assumption of data overlap, so it stays valid even if the two filters share no products).
- **Backend semantics confirmed authoritatively.** Direct API probes (`/products?by_category=…`, `?by_brand=…`, and both) showed category + brand combine as a genuine **intersection (AND)** — the app behaves as documented, so no `test_plan.md` discrepancy was recorded.

## Risks and constraints

- No hard-coded product/category/brand names, IDs, or prices (test_plan.md §3) — select filter options dynamically (e.g. "the first available category checkbox") rather than by name.
- Catalog and category/brand trees are shared/mutable production data — don't assume a clean tree, don't assert exact counts.
- Fetch live card references immediately before use within a step, don't cache across long gaps (§9 finding).
- No destructive actions needed (read-only browse/filter), so no shared-account risk here.
- Price range slider drag interactions can be flaky — prefer a control mechanism (keyboard arrows on a focused handle, or direct input if the slider exposes one) over raw mouse-coordinate dragging, confirmed during exploration.

## Planned steps

1. Explore the live home page via `playwright-cli` to confirm: search input/behavior, category filter tree markup, brand filter markup, sort dropdown options, price range slider markup/interaction method.
2. Update this plan with confirmed/rejected assumptions.
3. Walk through test case list, tags, and files to touch with the user via plan mode before implementing (multiple ACs, two new spec files, extending `home.page.ts`).
4. Implement:
   - Extend `src/pages/home.page.ts` with search/filter/sort/price-range locators and action methods (no `expect()`).
   - Create `tests/product-search.spec.ts` and `tests/product-filters.spec.ts`, AAA-structured, tagged per test_plan.md §3 taxonomy (`@regression`, `@product-overview` or similar feature tag — confirm naming during plan step).
   - Reference test_plan.md §5.1 in a describe-block comment per §7 traceability convention.
5. Update `test_plan.md` if any doc/behavior discrepancies are found during exploration (and update the §10 findings section / deferred note).
6. Validate: `npm run lint`, `npm run format:check`, run both new spec files, run `@smoke` tag suite, run full `product-overview.spec.ts` to check no regression from `home.page.ts` changes.
7. Report: what was added, files touched, tests run + results, tags applied, open questions/risks. Mark this plan completed.

## Status

- [x] Step 0: scope confirmed (search + filters/sort/price-range, as two separate spec files)
- [x] Step 1: this plan file created
- [x] Step 2: live exploration
- [x] Step 3: plan-mode sign-off
- [x] Step 4: implementation (both spec files + `home.page.ts` extensions)
- [x] Step 5: test_plan.md reviewed — no doc/behavior discrepancy found (intersection behaves as documented)
- [x] Step 6: validation — all 13 tests pass (with `--retries=1`), `npm run lint` + `npm run format:check` clean
- [x] Step 7: report delivered to user

## Status: complete

All 13 tests in `tests/product-search.spec.ts` (3) and `tests/product-filters.spec.ts` (10) pass. See "Post-implementation fixes" above for the two robustness fixes applied during the final run.
