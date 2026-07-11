# Admin dashboard smoke plan (§5.20)

**Status:** ✅ COMPLETED 2026-07-11 — ready for review. 14 tests green (`tests/admin/dashboard.spec.ts` 4,
`tests/admin/sections.spec.ts` 10), serially and in parallel; `@smoke` 19/19; lint/format/tsc clean. Findings
written up as `TEST_PLAN.md` §31; §5.20 status notes updated. All §5.20 CRUD remains deferred by scope decision.

## Goal

Implement the **read-only smoke sweep** of `TEST_PLAN.md` §5.20 (Admin dashboard) under `tests/admin/`,
tagged `@admin`. Confirmed scope with the user (2026-07-11):

1. Admin login lands on `/admin/dashboard` and the dashboard renders (sales chart + recent invoices list).
2. Each admin section page loads without error: Products, Categories, Brands, Orders, Users, Messages,
   Reports — plus the undocumented **Settings** page flagged in §9.
3. A non-admin (customer) user is redirected away from `/admin/dashboard` (§9 confirms this behavior;
   it is the natural negative half of the smoke check and costs nothing).

**Explicitly out of scope for this pass** (still deferred in §5.20, to be reported back, not silently added):
product/category/brand CRUD, order status changes, user disable/re-enable, admin message reply. All of
those mutate shared production data; the user scoped this pass to "smoke-level only".

## Admin credentials

The documented default accounts (https://testsmith-io.github.io/practice-software-testing/#/?id=default-accounts,
verified 2026-07-11) are:

| Role  | Email                                | Password    |
| ----- | ------------------------------------ | ----------- |
| admin | admin@practicesoftwaretesting.com    | `welcome01` |
| user  | customer@practicesoftwaretesting.com | `welcome01` |

Decision (user-confirmed): wire the admin account in as **new `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars**
(`.env-template`, `config/env.config.ts`, exposed as `adminUser` in `src/ui/test-data/user.data.ts`),
mirroring how `testUser1` is wired — not hard-coded into the repo.

This finally answers the §22 AC4 gap ("no admin password exists in config"). Note that §22's TOTP-denial
AC4 for `admin@` stays out of scope here — it is a §5.13 item, not §5.20.

## Live exploration results (2026-07-11, playwright-cli) — assumptions resolved

- **A1 CONFIRMED.** `admin@practicesoftwaretesting.com` / `welcome01` authenticates and lands directly on
  `/admin/dashboard` (single attempt, no failed logins — the account was never at risk of lockout).
- **A2 CONFIRMED.** Admin sections live in the collapsed account-name dropdown (`[data-test="nav-menu"]`, whose
  label is the admin's name **"John Doe"**). The admin links are in the DOM but `offsetParent === null` until the
  dropdown is clicked. There is no sidebar.
- **A3 PARTLY REJECTED — there is no `/admin/reports` page.** Real routes (from the menu's own `href`s):

  | `data-test`               | href                                     | `[data-test="page-title"]` |
  | ------------------------- | ---------------------------------------- | -------------------------- |
  | `nav-admin-dashboard`     | `/admin/dashboard`                       | `Sales over the years`     |
  | `nav-admin-brands`        | `/admin/brands`                          | `Brands`                   |
  | `nav-admin-categories`    | `/admin/categories`                      | `Categories`               |
  | `nav-admin-products`      | `/admin/products`                        | `Products`                 |
  | `nav-admin-orders`        | `/admin/orders`                          | `Order` ⚠ singular        |
  | `nav-admin-users`         | `/admin/users`                           | `Users`                    |
  | `nav-admin-messages`      | `/admin/messages`                        | `Messages`                 |
  | `nav-admin-settings`      | `/admin/settings`                        | `Settings`                 |
  | `nav-admin-statistics`    | `/admin/reports/statistics`              | `Statistics`               |
  | `nav-average-month-sales` | `/admin/reports/average-sales-per-month` | `Average sales per month`  |
  | `nav-average-week-sales`  | `/admin/reports/average-sales-per-week`  | `Average sales per week`   |

  Plus `nav-sign-out`. So §5.20's single "Reports" bullet is really **three** pages.

- **A4 CONFIRMED with a caveat.** Every admin page renders `<h1 data-test="page-title">` and a distinct
  `document.title` (`Brands List - …`, `Order`**s** ` List - …`, etc.). Six sections are tables
  (`table.table-hover`, **no `data-test` on table/rows/cells** — same shape as invoices §29 / messages §30):

  | Section    | Column headers                                                          |
  | ---------- | ----------------------------------------------------------------------- |
  | Brands     | `Id / Name / Slug / ""`                                                 |
  | Categories | `Id / Parent_id / Name / Slug / ""`                                     |
  | Products   | `Id / Name / Stock / Price / ""`                                        |
  | Orders     | `Invoice Number / Billing Address / Invoice Date / Status / Total / ""` |
  | Users      | `Id / Name / Email / ""`                                                |
  | Messages   | `Name / Subject / Status / Date` (no trailing blank column)             |

  Row action controls carry per-entity ids (`brand-<ULID>-edit`, `category-edit-<ULID>`, `product-edit-<ULID>`,
  `order-edit-<ULID>`, `user-edit-<ULID>`, `message-details-<ULID>`) — **note the inconsistent ordering**:
  brands use `<id>-edit`, everything else uses `edit-<id>`. Not needed for this read-only pass, recorded for a
  future CRUD pass.

- **Q1 ANSWERED.** `/admin/reports/statistics` renders four `<h4>` sections — **Top 10 Best Selling Categories**,
  **Top 10 Most Purchased Products**, **Customers By Country**, **Total Sales Per Country** — each a table.
  The two average-sales pages render a `<canvas>` chart plus a `[data-test="year"]` select. All render without
  error.

### Further findings

- **Dashboard contract.** `<h1 data-test="page-title">Sales over the years</h1>` + a `<canvas>` (the sales
  chart) + `<h2>Latest orders</h2>` over a `table.table-hover` with headers
  `Invoice Number / Billing Address / Invoice Date / Status / Total / ""`. It is fed by
  `GET /invoices?page=1&in=status,AWAITING_FULFILLMENT` and `GET /reports/total-sales-of-years?years=5`.
- 🚨 **The dashboard renders "No recent invoices." while the list is still loading** — the same pre-load race as
  the favorites (§26), invoices (§29) and messages (§30) lists. A naive assertion passes against the empty
  loading state. The page object must await the `GET /invoices` response (`gotoAndAwaitLoaded()` pattern).
  It also means the "Latest orders" list can be **legitimately empty** (it filters to `AWAITING_FULFILLMENT`),
  so the spec asserts the table's structure, never a row count.
- **A logged-in non-admin hitting `/admin/dashboard` is redirected to `/auth/login`** (verified with the seeded
  `customer@` account — a read-only check, sanctioned by §3), not to `/account` as one might expect. §9 only
  said "redirected away"; the target is now pinned.
- **Settings page** (`/admin/settings`, undocumented in v5 — §9) exposes `payment-endpoint`, `geolocation`,
  `co2-scale-toggle`, `eco-badge-toggle`, `settings-submit`, `clear-storage`, `back`. ⚠ This page can change
  **app-wide** configuration for every user of the shared site — this pass only asserts it loads and NEVER
  submits it.
- `[data-test="page-title"]` is the one locator common to every admin page, which is what makes a parameterized
  section sweep clean.

## Risks and constraints

- 🚨 **The admin account is shared, seeded, read-only fixture data (§3).** Every test in this pass must be
  strictly non-mutating: navigate + assert visible. No create/edit/delete, no order status change, no user
  disable. Never submit a form as admin.
- 🚨 **Lockout is real and account-scoped at 3 failed attempts (§20).** A typo'd admin password in `.env` would
  permanently lock the shared admin account for everyone. The password must be exact, and there must be **no**
  negative/failed-login test against the admin email in this pass.
- The seeded admin's TOTP denial branch (§22) means the admin cannot be enrolled in 2FA, so the login flow is a
  plain email+password → dashboard redirect.
- Catalog/user/order lists in admin are shared, mutable prod data (§9): assert **structural** properties (table
  present, ≥1 row, heading text) — never counts, names, ids, or prices.
- `fullyParallel: true`: several tests logging in as the same admin concurrently must not interfere. Login is
  stateless per browser context, so this should be safe — verify the sweep runs green in parallel.
- Admin session is **not** the `@logged` storageState user (that is a disposable customer), so these specs log
  in inline. They must **not** be tagged `@logged`.

## Planned steps

1. ~~Confirm scope with the user.~~ Done (read-only sweep; env-var admin creds).
2. Write this plan file. Done.
3. **Explore live** (playwright-cli): log in as admin, capture the dashboard's real heading/chart/recent-invoice
   locators, walk every admin section, record real routes, headings, `data-test` ids, and how the sections are
   reached from the nav. Also confirm the customer → `/admin/dashboard` redirect target. Fold results back into
   the "Assumptions" section above (confirmed/rejected).
4. Get design sign-off (plan mode) on the test list, page objects and tags.
5. Implement:
   - `config/env.config.ts` + `.env-template` + local `.env`: `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
   - `src/ui/test-data/user.data.ts`: `adminUser`.
   - `src/ui/constants/page-urls.ts`: `ADMIN_*` routes.
   - `src/ui/pages/admin-dashboard.page.ts` (+ any further admin page objects the sweep needs), registered in
     `src/ui/fixtures/page-object.fixture.ts`.
   - `tests/admin/dashboard.spec.ts` — the sweep, tagged `@admin @smoke`/`@regression` per the §3 taxonomy.
6. Update `TEST_PLAN.md`: §5.20 status note + a new numbered findings section (§31) with any doc/behavior
   discrepancies found; correct §22's "no admin password exists in config" note if the env vars land.
7. Validate: `npm run lint`, `npm run format:check`, `npm run tsc:check`, run `tests/admin/`, and re-run `@smoke`
   (the sweep touches shared `user.data.ts` / `env.config.ts` / `page-object.fixture.ts`).
8. Report and mark this plan completed.
