# Plan: Browse by Category (TEST_PLAN.md §5.2, `tests/category.spec.ts`)

## Goal

Implement §5.2 "Browse by Category". Two ACs:

1. Navigating via a **category link** loads the category page with the category name as title.
2. The **same filter/sort/pagination/price-range capabilities** present on the overview page are present and functional on a category page.

## Context / what already exists (surveyed 2026-07-06)

- `src/pages/home.page.ts` (`HomePage`) already implements the full product-grid + filters + search + sort + price-range + pagination interface (locators + action methods), built for §5.1. Exercised by `tests/product-overview.spec.ts`, `tests/product-search.spec.ts`, `tests/product-filters.spec.ts`.
- Category page objects already exist but are **bare navbar shells**: `HandToolsPage`, `PowerToolsPage`, `SpecialToolsPage` (has a `heading`), `OtherPage`. All extend `BasePage`, hold a `NavbarComponent` as `bookmarks`, and set `PAGE_URL` to `/category/<slug>`.
- `tests/smoke/menu.spec.ts` already asserts category page **titles** — but via direct `goto()` (URL nav), NOT via clicking a navbar link. §5.2 AC1 specifically wants **link-driven** navigation, so this is complementary, not duplicate.
- Category pages are the same Angular overview component as home, pre-filtered by category — so the grid/filter/sort/price/pagination sidebar is expected to be identical.

## Design decision (needs plan-mode sign-off)

The overview grid/filter machinery currently lives entirely in `HomePage`. Category pages need the identical interface for AC2. Rather than duplicate it, **extract the shared grid/filter/search/sort/price/pagination interface into an abstract `ProductListPage extends BasePage`**, then:

- `HomePage extends ProductListPage` — keeps `PAGE_URL = HOME`; its public locators/methods are unchanged, so §5.1 specs keep passing.
- The category page objects `extends ProductListPage` — inherit the whole grid interface, and each adds its own `heading` locator + keeps the `bookmarks` navbar.

This honors "reuse over duplicate" and makes AC2 literally exercise the same inherited code path. Trade-off: it's a refactor of `HomePage` (public API preserved) — the reason for plan-mode sign-off.

## Assumptions — confirmed via live exploration (2026-07-06)

- [x] Category page renders the **same left filter sidebar** as home: Sort `<select data-test="sort">` (same option values incl. `name,asc`/`price,asc`…), Price Range `ngx-slider` (min `ngx-slider`, max `ngx-slider-max`, bounds 0–200, default 1–100), Search, full Categories tree, Brands, plus `ngb-pagination`. Grid cards use the same `$X.XX` price format. So the entire `HomePage` grid interface applies verbatim.
- [x] Category page `<title>` becomes `"<Name> - Practice Software Testing - Toolshop - v5.0"` and a heading **`Category: <Name>`** renders in the content area (`getByRole('heading', { name: 'Category: Hand Tools' })`). Both are set **asynchronously** after load — Playwright's auto-retrying `toHaveTitle`/`toBeVisible` cover this (the existing `smoke/menu.spec.ts` relies on exactly this and passes). NOTE: the legacy `/#/category/...` hash URL does **not** hydrate title/heading; the page objects' non-hash `PAGE_URL` paths (`/category/hand-tools`) do — always use `goto()`, never a hash URL.
- [x] Nav-link flow works: the `nav-hand-tools`…`nav-special-tools` links live **inside the collapsed "Categories" dropdown** and are hidden until `nav-categories` is clicked. After opening the dropdown they're visible with hrefs `/category/<slug>` and text matching the category name. So AC1's "navigate via a category link" = open Categories dropdown → click the category link.
- [x] The category grid is **pre-scoped server-side** (hand-tools URL shows only hand-tool products, 5 pages), but the sidebar Categories checkboxes start **unchecked** (`checkedCategoryCount === 0`). So don't assert on a pre-checked box; assert context via the heading/title and the (structural) grid instead.

## Design refinements from exploration

- Put `bookmarks = new NavbarComponent(this.page)` on `ProductListPage` (the navbar is global, present on home too) so both `HomePage` and the category pages get it and the AC1 test can start from `homePage` and click into a category. Removes the duplicated `bookmarks` field from each category page.
- Add a small `openCategories()` action to `NavbarComponent` (click the dropdown) so the hidden category links become clickable — the spec then clicks the specific `*NavLink`.

## Scope to confirm with user (AC2 is broad)

§5.1 already exhaustively tests every filter/sort/price capability on the home page (13 tests). §5.2 AC2 is "same capabilities **present and functional**" on a category page — intent is a representative confirmation on the category page, not a re-run of all 13. Proposed representative set (one per capability), to confirm:

- AC1: nav-link click → category page + heading/title (per category, or a representative subset).
- AC2: on one representative category page — sort reorders grid, price-range narrows grid, brand filter narrows grid, pagination present/functional.

Open: cover all 4 categories for AC1 or just a representative one? Cover the full AC2 capability set or a smaller subset?

## Risks and constraints

- No hard-coded product/category/brand names, IDs, or prices (§3). Category **names** in headings/titles are app-owned UI strings tied to the fixed top-level catalog categories (Hand Tools / Power Tools / Other / Special Tools), so asserting those specific titles is acceptable (the smoke menu spec already does) — but product/brand contents stay structural.
- Shared/mutable production catalog (§9) — assert structural behavior (grid narrowed, order monotonic), not counts/names.
- Read-only browse — no shared-account/destructive risk.
- Refactor risk: `HomePage` public API must stay identical so §5.1 specs don't regress. Run all three §5.1 specs after refactor.

## Planned steps

1. [x] Survey existing code (done).
2. [ ] Live-explore a category page via playwright to confirm the assumptions above (sidebar present, heading text, nav-link click behavior, pre-applied filter).
3. [ ] Update this plan with confirmed/rejected assumptions.
4. [ ] Plan-mode sign-off on: the `ProductListPage` extraction + the exact AC2 test set + category coverage.
5. [ ] Implement:
   - `src/pages/product-list.page.ts` — abstract `ProductListPage` with the extracted interface.
   - Refactor `HomePage` to extend it (public API preserved).
   - Enrich category page objects (extend `ProductListPage`, add `heading`).
   - `tests/category.spec.ts` — AAA, tagged per §3, reference §5.2 in a describe comment.
6. [ ] Update `TEST_PLAN.md` if any doc/behavior discrepancy found; mark §5.2 status.
7. [ ] Validate: `npm run lint`, `npm run format:check`, run `category.spec.ts`, the three §5.1 specs (regression from the refactor), and `@smoke`.
8. [ ] Report + mark this plan complete.

## Status: complete (2026-07-06)

- [x] Step 0 scope confirmed; [x] Step 1 plan; [x] Step 2 exploration; [x] Step 3 sign-off (plan mode).
- [x] Step 5 implemented: `ProductListPage` extraction, `HomePage` thin subclass, 4 category pages enriched, `navbar.openCategories()`, `tests/category.spec.ts`.
- [x] Step 6 `TEST_PLAN.md` updated (new §11 + §10 regression note + §9-type discrepancies).
- [x] Step 7 validated.

### Final test set (7 tests, all green)

- AC1 ×4: `<Category> nav link opens its category page titled by the category name` (URL + `Category: <Name>` heading), for Hand/Power/Other/Special Tools.
- AC2 sort: `category page sorts its grid by Price (Low - High)`.
- AC2 absence: `category page omits the price range slider and search box` (documents the discrepancy — price range + search are overview-only).
- AC2 pagination: `category page paginates to a different set of products on page 2`.

### Scope changes from exploration

- Dropped the `<title>` assertion from AC1 (Special Tools never sets `document.title`; covered per-category by the smoke menu spec).
- Replaced the planned price-range AC2 test with an **absence assertion** (user-confirmed): the category page has no price-range slider or search box.

### Validation results

- `npm run lint` + `npm run format:check`: clean.
- `tests/category.spec.ts`: 7/7 pass.
- `@smoke`: 9/9 pass.
- §5.1 regression (`product-overview`/`product-search`/`product-filters`): 17/18 pass; the 1 failure — `product-overview` "last page's next pagination control is disabled" — is **pre-existing and app-driven**, reproduced identically on the original pre-refactor code (see `TEST_PLAN.md` §10 regression note). Not caused by this work.
