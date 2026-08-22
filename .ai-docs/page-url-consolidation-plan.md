# Page-URL consolidation — action plan

## Goal

Eliminate page-object classes whose entire body was a single
`readonly PAGE_URL = PAGE_URLS.X;` field, and nothing else — pure boilerplate that existed
only to give the fixture layer a distinct type per URL. `BasePage.PAGE_URL` is consumed
solely by `goto()` (`this.page.goto(this.PAGE_URL)`), so there is no behavior tying a URL
to a distinct class; the URL can be a constructor argument on the shared base instead.

## Findings

Nine leaf classes across three groups matched the "PAGE_URL only" shape exactly:

- `AdminBrandsPage`, `AdminCategoriesPage`, `AdminMessagesPage`, `AdminOrdersPage`,
  `AdminProductsPage`, `AdminUsersPage` — all extended `AdminListPage`.
- `AdminAverageSalesPerMonthPage`, `AdminAverageSalesPerWeekPage` — both extended
  `AdminSalesReportPage`.
- `HomePage` — extended `ProductListPage`.

Each was a 6-line file (2 imports + a one-field class), and each also cost an import line,
a `Pages` type field, and a 3-line factory in
`src/ui/fixtures/page-object.fixture.ts` — about 100 lines of duplication for "one shared
page shape, nine different URLs." A grep across `src/`, `tests/`, and `config/` confirmed
nothing outside `page-object.fixture.ts` imported these 9 classes by name — specs only
ever consume them via the fixture property (e.g. `adminBrandsPage`) and inherited members
(`goto()`, `pageTitle`, `columnHeaders`, `rows`, `yearSelect`, `salesChart`,
`productCards`, …) — so they were safe to delete outright.

A fourth, near-miss group (`HandToolsPage`, `PowerToolsPage`, `OtherPage`,
`SpecialToolsPage`, all extending `ProductListPage`) was _not_ collapsed: each adds one
`heading: Locator` beyond `PAGE_URL`, so they remain distinct classes — but their
constructors now forward the URL to `ProductListPage` instead of re-declaring their own
`PAGE_URL` field, since the base class's constructor signature changed underneath them.

## Changes

1. **`src/ui/pages/admin-list.page.ts`** — dropped `abstract`; added
   `readonly PAGE_URL: string` and a second constructor param `pageUrl: string`, assigned
   before the existing `table`/`columnHeaders`/`rows` locator init. Doc comment updated:
   the six admin-list sections differ only by URL, so this class is instantiated directly
   with the matching `PAGE_URLS.ADMIN_*` constant.
2. **`src/ui/pages/admin-sales-report.page.ts`** — same treatment: dropped `abstract`,
   added `readonly PAGE_URL: string` + `pageUrl` constructor param, same doc-comment
   update for the two average-sales reports.
3. **`src/ui/pages/product-list.page.ts`** — dropped `abstract`, added
   `readonly PAGE_URL: string`, and a required second constructor param `pageUrl: string`
   assigned immediately after `super(page)`. Every other member (grid/filter/search/sort/
   pagination logic) is unchanged. Doc comment now says the home page is this class
   instantiated directly with `PAGE_URLS.HOME`, while category pages subclass it only to
   add a heading and forward their URL through `super(page, PAGE_URLS.X)`.
4. **Deleted** (9 files): `admin-brands.page.ts`, `admin-categories.page.ts`,
   `admin-messages.page.ts`, `admin-orders.page.ts`, `admin-products.page.ts`,
   `admin-users.page.ts`, `admin-average-sales-per-month.page.ts`,
   `admin-average-sales-per-week.page.ts`, `home.page.ts`.
5. **`hand-tools.page.ts`, `power-tools.page.ts`, `other.page.ts`,
   `special-tools.page.ts`** — removed each class's own `readonly PAGE_URL = PAGE_URLS.X;`
   line; their constructors now call `super(page, PAGE_URLS.X)`. `heading` unchanged.
6. **`src/ui/fixtures/page-object.fixture.ts`**:
   - Removed the 9 deleted imports; added `AdminListPage`, `AdminSalesReportPage`,
     `ProductListPage`, and `PAGE_URLS`.
   - Retyped the 9 `Pages` fields to the shared base classes (e.g.
     `adminBrandsPage: AdminListPage;`, `adminAverageSalesPerMonthPage:
AdminSalesReportPage;`, `homePage: ProductListPage;`) — fixture property names are
     unchanged, so no spec needed touching.
   - Each factory now instantiates the base class directly with its `PAGE_URLS` entry,
     e.g. `new AdminListPage(page, PAGE_URLS.ADMIN_BRANDS)`,
     `new AdminSalesReportPage(page, PAGE_URLS.ADMIN_AVERAGE_SALES_PER_MONTH)`,
     `new ProductListPage(page, PAGE_URLS.HOME)`.

## Out of scope

- The 4 category-page cousins (`HandToolsPage` et al.) keep their own class — they carry
  real extra content (`heading`) beyond the URL, so collapsing them into a
  URL+heading data map was judged unnecessary churn for this pass.

## Verification

1. `npm run tsc:check`, `npm run lint`, `npm run format:check` — all clean.
2. `npx playwright test tests/admin/sections.spec.ts tests/ui/smoke/homepage.spec.ts tests/ui/category.spec.ts`
   — 18 tests, all passed (one pre-existing data-timing flake on "messages list loads",
   unrelated to this change, passed on retry).

## Status

Completed 2026-08-22. Lint/format/tsc green; all 18 tests across the three affected specs
pass.
