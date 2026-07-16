# E2E Test Plan — Practice Software Testing (Tool Shop)

**Application under test:** https://practicesoftwaretesting.com/#/
**Documented behavior source:** [practice-software-testing](../practice-software-testing) repo, `docs/user-stories/v5.md` (full production feature set).
**Observed behavior source:** `PRODUCT_EXPLORATION.md` (repo root) — the single consolidated record of what the live app actually does, every doc/behavior discrepancy, and the production bugs/smells found while building this suite.
**Automation:** Playwright + TypeScript, Page Object Model (`src/ui/pages`), fixtures in `src/ui/fixtures`.
**Scope:** UI end-to-end tests against the public site as a black box (no seeded DB access), plus API-observable outcomes (status codes, emails) where feasible via the UI.

> This file is the **plan**: scope, data strategy, the tag taxonomy, and the feature-area → spec-file
> coverage map. It no longer carries the running implementation-findings log — that content now lives
> in `PRODUCT_EXPLORATION.md`, and per-spec implementation decisions live in `.ai-docs/*-plan.md` and in
> each spec's header comment.

## 1. Objectives

- Verify the shopping flows a real customer relies on: browse → filter/search → product detail → cart → checkout → order confirmation.
- Verify account lifecycle: registration, login (incl. lockout/2FA/social), profile, password management, favorites, invoices, messages.
- Verify supporting features: contact form, chat widget, discounts (location & combination), multi-language, admin dashboard.
- Catch regressions on every deploy via a fast smoke suite, with deeper regression suites run less frequently (nightly / pre-release).

## 2. Out of scope

- Load/performance testing (`sprint5-performance` is a separate concern).
- Visual regression / pixel-diff testing.
- Native mobile apps.
- Exhaustive admin back-office CRUD (covered at a smoke level only — this is a QA-facing feature, not the customer-facing product).
- Real payment gateway integration (site uses fake/simulated payment processing — verify request/response contract only, not real money movement).
- Real email inbox verification (Mailtrap/Mailhog not available against production; assert on the UI-confirmed outcome instead, e.g. "confirmation email sent" message).
- Geo-location discount (server/IP-determined `is_location_offer` — not overridable client-side; see `PRODUCT_EXPLORATION.md` §7).

## 3. Test environment & data strategy

- Target: production site `https://practicesoftwaretesting.com` (`BASE_URL` in `.env`).
- Each test that needs an authenticated/mutable account (profile edits, password changes, favorites, invoices) must **register its own user via the API/UI factory** using `@faker-js/faker`, rather than relying on shared fixed accounts — production data is shared across anyone running these suites.
- The known seeded accounts `customer@practicesoftwaretesting.com` / `admin@practicesoftwaretesting.com` are reserved for:
  - Read-only checks (e.g., login success, admin dashboard access).
  - Explicitly-flagged behavior that only applies to them (TOTP setup denial).
  - They must **never** be used for destructive/mutating tests (password change, account edits, order placement) since they are shared across all test runs and other engineers/CI. Note `customer@` **is** `testUser1` (`USER_EMAIL`), so it is not a safe stand-in for "some logged-in user".
- Products/categories/brands are treated as read-only fixture data owned by the app; assert on structural properties (e.g., "grid has products", "price format is $X.XX") rather than hard-coded names/prices/IDs. Where a specific product is required (out-of-stock, rental), select it dynamically and fetch its live link/ID immediately before use — the shared catalog is polluted and mutable (`PRODUCT_EXPLORATION.md` §1).
- Tests must be independent and parallelizable (`fullyParallel: true`) — no shared mutable state, no assertions on absolute cart/favorites counts from a shared session.
- Use tags (`@smoke`, `@regression`, `@checkout`, `@auth`, `@admin`, `@a11y`, plus feature tags) via Playwright's `tag` option.

> **Destructive flows** — forgot-password (instant reset), account lockout (permanent at 3 fails),
> `/admin/settings` (app-wide config), and any account mutation (TOTP/order/password/profile/favorites/
> messages) — must only ever use a throwaway user. See `PRODUCT_EXPLORATION.md` §2 for the full list.

## 4. Test levels / suites

| Suite                                              | Trigger               | Contents                                                                                              |
| -------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------- |
| **Smoke** (`@smoke`)                               | Every push / PR       | Home page loads, nav works, login, register, add-to-cart → checkout happy path, one admin login check |
| **Regression** (`@regression`)                     | Nightly / pre-release | Everything in this plan                                                                               |
| **Targeted** (`@checkout`, `@auth`, `@admin`, ...) | On-demand, ad hoc     | Feature-scoped subset for fast local iteration                                                        |

## 5. Feature areas & test cases

Each area maps to a spec file under `tests/` and a page object under `src/ui/pages/`. Bullets are the
acceptance criteria; a terse `(actual: …)` note flags where production differs from the documented AC,
with the full explanation in `PRODUCT_EXPLORATION.md`. Status key: ✅ implemented · ⏭ deferred (by scope,
not a gap) · ⛔ unautomatable (see `PRODUCT_EXPLORATION.md` §7).

### 5.1 Product Overview / Home (`product-overview.spec.ts`, `product-search.spec.ts`, `product-filters.spec.ts`)

- Product grid renders image/name/price per card.
- Clicking a product card navigates to its detail page.
- Pagination: page 2 differs from page 1; last page's "next" is disabled.
- Search: valid query (3–40 chars) filters the grid; a new search clears active filters.
- Search: query < 3 chars is rejected/ignored (boundary).
- Category filter: one category narrows the grid; parent auto-checks children; unchecking all children unchecks the parent.
- Brand filter narrows the grid; combined category + brand apply as AND (intersection).
- Sorting: Name A-Z / Z-A, Price Low-High / High-Low each produce a correctly ordered grid.
- Price range slider: default $1–$100 (max $200) filters the grid.
- Discounted product card (strikethrough + discounted price). ⛔
- Out-of-stock card shows "Out of stock".

**Status:** ✅ all except the discounted card (⛔, `test.skip`).

### 5.2 Browse by Category (`category.spec.ts`)

- Category link loads the category page with the category name as heading/title.
- Same filter/sort/pagination as the overview page — _(actual: the category page omits the price-range slider and the search box; AC2 codifies that absence)_.

**Status:** ✅

### 5.3 Product Detail (`product-detail.spec.ts`)

- Image, name, description, price, category & brand badges displayed.
- Discounted product: strikethrough + discount % badge. ⛔
- Quantity stepper: default 1; `+`/`-`; `-` at 1 stays 1.
- Manual quantity entry clamped — _(actual: [1, 99], not the documented [1, 999999999])_.
- Add to cart: "Product added to shopping cart." + cart badge updates.
- Out-of-stock non-rental: Add to Cart disabled, "Out of stock" in red.
- Rental product: duration slider (1–10h) replaces qty stepper; total = rate × duration. ⏭ (recalc-on-drag)
- Favorites (logged in): add → 201 toast; repeat → 409 "already in favorites".
- Favorites (logged out): 401, "Unauthorized, can not add product to your favorite list." — _(docs' "Unauthorized..." is an abbreviation)_.
- Related products section present below main content.

**Status:** ✅ display / stepper / clamp / add-to-cart / OOS / related / favorites. ⛔ discount badge. ⏭ rental slider recalc.

### 5.4 Rentals (`rentals.spec.ts`)

- Rentals listing shows all rental products with image/name/description.
- Rental detail shows the duration slider instead of the qty stepper.
- Rental item in cart is labelled — _(actual: "Item for rent, price per hour", not "This is a rental item")_.
- Location-based discount on rental price. ⛔

**Status:** ✅ AC1–3. ⛔ location discount.

### 5.5 Cart (`cart.spec.ts`)

- Cart displays Item / Quantity / Price / Total / Actions columns — _(actual: the 5th "Actions" header is blank)_.
- Changing quantity recalculates line + cart total, "Product quantity updated." — _(commits on blur, not keystroke)_.
- Deleting an item removes it and recalculates.
- Empty cart message — _(actual: "The cart is empty. Nothing to display.", shown only after emptying; a pristine cart shows nothing)_.
- "Proceed" enabled only when cart has ≥ 1 item.
- Cart item with a discount shows a discount badge + original & discounted price. ⛔
- Rental + non-rental item earns a 15% combination discount with subtotal/discount/total breakdown.
- Removing all items of one type removes the 15% discount and reverts the total.

**Status:** ✅ AC1–5. ⛔ AC6. ✅ AC7/AC8 — implemented in `discounts.spec.ts` (§5.22), where the whole discount mechanism lives.

### 5.6 Checkout — Sign in step (`checkout-signin.spec.ts`)

- Guest proceeding from cart is shown a login form — _(actual: a tabbed panel, "Sign in" / "Continue as Guest")_.
- TOTP-enabled account: valid credentials prompt for a 6-digit code before proceeding. ⏭
- Valid credentials advance to billing address.
- Already-logged-in user sees — _(actual: "Hello {First} {Last}, you are already logged in...")_ — and proceeds to billing.

**Status:** ✅ AC1. ⏭ AC2 (checkout TOTP prompt). The logged-in / guest proceed paths (AC3/AC4) are exercised via §5.7 / §5.9.

### 5.7 Checkout — Billing address (`checkout-address.spec.ts`)

- All required fields present — _(actual: Country is a `<select>`, plus an extra "House number" field; no native `maxlength`/error text)_.
- Empty required field turns `ng-invalid` and disables "Proceed".
- Exceeding max length is rejected (street ≤70, city ≤40, state ≤40, postal ≤10, house_number ≤10).
- Filling all fields validly enables proceeding to payment.
- Logged-in user's address is pre-filled — _(actual: text fields pre-fill from a shared/stale value; the country `<select>` stays empty for an API-registered user)_.

**Status:** ✅ all 5 ACs.

### 5.8 Checkout — Payment (`checkout-payment.spec.ts`)

- Method dropdown: Bank Transfer, Cash on Delivery, Credit Card, Buy Now Pay Later, Gift Card.
- Bank Transfer: bank name (letters/spaces), account name (alphanumeric + `. ' -`), account number (digits) — valid + invalid per field.
- Credit Card: number `XXXX-XXXX-XXXX-XXXX`, expiry `MM/YYYY` future, CVV 3–4, holder letters/spaces — _(actual: pattern-only, not required; holder shows no error text)_.
- Credit Card past expiry → "Expiration date must be in the future."
- Buy Now Pay Later: installments 3/6/9/12.
- Gift Card: number + validation code — _(actual: exactly 16 / exactly 4 chars, stricter copy)_.
- Cash on Delivery: no additional fields.
- Switching payment method resets the form.
- Successful order (one happy path per method; ≥ Credit Card + Cash on Delivery): confirmation + cart cleared.

**Status:** ✅ AC1–8 (validation + reset). ✅ Cash-on-Delivery happy path (via §5.9). ⏭ per-method happy paths (Credit Card, etc.).

### 5.9 End-to-end checkout (`checkout-e2e.spec.ts`) — critical path, `@smoke`

- Guest: browse → add to cart → checkout → guest details → address → Cash on Delivery → confirmation (invoice number) → cart emptied.
- Logged-in: add to cart → checkout skips login → pre-filled address → payment → confirmation.

**Status:** ✅ both ACs (Cash on Delivery; AC2 also `@logged`).

### 5.10 Registration (`register.spec.ts`)

- All required fields enforced.
- Password requirements list highlights each rule live — _(actual: always visible, not focus-gated)_.
- Password strength indicator (Weak 20% → Excellent 100%). 🐛 **broken in prod** (stuck at 0%).
- Duplicate email — _(actual: "A customer with this email address already exists.")_.
- Successful registration → login page; a distinct new user can then log in.
- Invalid email format rejected client-side.

**Status:** ✅ AC1/AC2/AC4/AC5/AC6. 🐛 AC3 pinned as a production bug.

### 5.11 Login (`login.spec.ts`)

- Valid credentials → `/account`.
- Valid admin credentials → `/admin/dashboard`. ⏭
- Invalid credentials → "Invalid email or password".
- Account lockout: attempts 1–3 invalid, 4th+ → "Account locked, too many failed attempts. Please contact the administrator." (uses a disposable account — permanent).
- Admin exempt from lockout. ⏭ (manual — can't lock the shared admin)
- Disabled account → "Account disabled." ⏭ (needs admin-disable precondition)
- TOTP-enabled account → 6-digit prompt; valid authenticates; invalid → "Invalid TOTP".
- "Sign in with Google" opens a 500×400 popup. ⏭

**Status:** ✅ valid / invalid / lockout / TOTP login. ⏭ admin redirect + exemption, disabled account, Google popup.

### 5.12 Forgot password (`forgot-password.spec.ts`) — ⚠ destructive (instant reset to `welcome02`, no token)

- Form accessible from login with an email field.
- Invalid/non-RFC email rejected client-side. 🐛 error box renders **empty**.
- Valid registered email → confirmation. 🐛 renders the raw i18n key `page.forgot-password.confirm`.
- Unregistered email → "The selected email is invalid."

**Status:** ✅ all 4 ACs (AC2/AC3 pin the two prod bugs).

### 5.13 Two-Factor Authentication setup (`totp-setup.spec.ts`)

- Fresh logged-in user sees the setup section ("Set up Two-Factor Authentication") with QR + secret.
- Valid 6-digit code → "TOTP verified and enabled successfully."
- Invalid code → error, not enabled. 🐛 the error tears down the setup UI.
- Seeded `customer@`/`admin@` denied TOTP setup ("Access denied...").

**Status:** ✅ AC1–3, AC4 for `customer@` (both seeded emails hit one 403 branch, so `admin@` adds no coverage).

### 5.14 Customer profile (`profile.spec.ts`)

- Profile shows current data.
- All editable fields update and persist; success fades ~5s.
- Email present but not editable — _(actual: `readonly`, not `disabled`)_.
- Required-field validation — _(actual: only 5 of 8 fields required; enforced server-side)_.

**Status:** ✅ all 4 ACs.

### 5.15 Change password (`change-password.spec.ts`) — ⚠ destructive

- Current / new / confirm fields.
- Strength indicator advances one step per criterion — _(works correctly here, unlike registration's §5.10)_.
- Mismatch → "The new password field confirmation does not match."
- Wrong current → "Your current password does not matches with the password."
- New == current → "New Password cannot be same as your current password."
- Valid change → success, then automatic logout after ~5s.

**Status:** ✅ all 6 ACs.

### 5.16 Favorites (`favorites.spec.ts`) — ⚠ destructive

- Empty-state message when no favorites — _(also renders while the list loads; enter via an await-load helper)_.
- Adding a product from detail surfaces it with image/name/truncated description (250-char `TruncatePipe`).
- Removing a favorite updates the list immediately (delete + refetch).

**Status:** ✅ all 3 ACs. (The detail-page favorites ACs are in §5.3.)

### 5.17 Invoices (`invoices.spec.ts`)

- Completed checkout appears in the paginated list with number/street/date/total — _(list "Billing Address" column is unreliable; number/date/total are pinned)_.
- Invoice detail shows number/date/total, full address, payment method + details, line items.
- Non-existent/foreign invoice ID → "This invoice doesn't exist."
- Discounted order's invoice shows subtotal/discount %/amount/total — _(order-level, not per-line; the "%" is only in the label)_.
- "Download PDF" enables when ready and triggers a real download. ⏭

**Status:** ✅ AC1–3. ✅ AC4 — implemented in `discounts.spec.ts` (§5.22). ⏭ AC5.

### 5.18 Messages (`messages.spec.ts`) — ⚠ destructive (a customer can't delete a message)

- Submitting a contact form while logged in surfaces the message in the list — _(Subject column shows the raw select value; body truncated at 50 chars; NEW badge; date)_.
- Message detail shows the original + chronological replies.
- Submitting a reply appends it — _(a customer can reply to their own thread; the first reply flips NEW → IN_PROGRESS)_.

**Status:** ✅ all 3 ACs.

### 5.19 Contact form (`contact.spec.ts` — extend `contact.page.ts`)

- Logged-in: name/email auto-filled & hidden — _(actual greeting: "Hello {name}, please fill out this form to submit your message.")_.
- Guest: name/email shown and required.
- Subject dropdown offers 6 options; message ≥ 50 chars — _(actual: also ≤ 250 chars; add a 250/251 boundary)_.
- Attachment: only `.txt`, exactly 0 KB; wrong-type / non-empty error copies.
- Valid submission (with and without attachment) → confirmation.

**Status:** ⏭ contact form itself deferred; message submission is exercised via §5.18.

### 5.20 Admin dashboard (`tests/admin/*.spec.ts`) — smoke-level only, `@admin`

- Admin login lands on `/admin/dashboard` with sales chart + recent invoices. ✅ `@smoke`
- Products / Categories / Brands / Orders / Users / Messages: list loads. ✅ (CRUD ⏭)
- Reports: general / monthly / weekly — _(three separate pages, not one Reports page)_. ✅
- Settings page loads — ⚠ never submitted (rewrites app-wide config). ✅
- Non-admin users redirected to `/auth/login`. ✅

**Status:** ✅ read-only smoke sweep (14 tests). ⏭ all CRUD (product/category/brand/order/user mutations, admin reply) — must only touch entities the test itself created, and must never submit `/admin/settings`.

### 5.21 Chat widget (`chat-widget.spec.ts`)

- Toggle visible bottom-right; opening shows the 4-option menu ("Find a product" / "Order a product" / "Checkout" / "Create support ticket"). ✅
- Find a product: search returns ≤ 5 cards; the card itself is the link — _(no "View Product" button)_. ✅
- Order a product → quantity → confirm → in cart. ⏭
- Checkout via chat (full flow). ⏭
- Checkout via chat with empty cart → "Your cart is empty". ⏭
- Support via chat (subject + message ≥ 50 + optional `.txt`). ⏭

**Status:** ✅ shell + Find-a-product. ⏭ order / checkout / support flows.

### 5.22 Discounts (`discounts.spec.ts`)

- Combination discount (rental + non-rental) — verified on the cart step through to the invoice (covers §5.5 AC7/AC8 and §5.17 AC4). ✅
- Location-based discount — server/IP-determined `is_location_offer`, not overridable client-side. ⛔ (ships as a permanent `test.skip`)

**Status:** ✅ combination discount. ⛔ location discount.

### 5.23 Multi-language (`language.spec.ts`)

- Language selector options — _(actual: 7 — DE, EL, EN, ES, FR, NL, TR; Greek is undocumented)_.
- Switching updates visible UI text (spot-check all four main-menu labels).
- Selection persists across reload/navigation (`localStorage`).
- First-visit browser-language auto-detection + English fallback. ⏭

**Status:** ✅ first 3 ACs. ⏭ auto-detection.

### 5.24 Privacy policy (`privacy.spec.ts`)

- `/privacy` loads and contains the expected sections — _(actual: no headings at all; 8 sections not 6; body not translated by the language selector)_.

**Status:** ✅

### 5.25 Accessibility & cross-cutting checks (`a11y.spec.ts`, `@a11y`)

- Run `@axe-core/playwright` against key pages (home, product detail, cart, checkout, login, register); no serious/critical violations.
- Basic keyboard navigation through the checkout flow.

**Status:** ⏭ not yet implemented. (Known a11y defects already surfaced: missing `<h1>` on `/privacy`, nameless cart delete control, duplicated `data-test="total"` on invoice detail — see `PRODUCT_EXPLORATION.md` §5.)

### 5.26 API suite (`tests/api/**`, `@api`)

REST coverage of the Toolshop API (`API_URL`, a separate host from the UI), run browserless as its
own project: `npx playwright test --project=api`. Phased in `.ai-docs/api-tests-plan.md`; the layer
doubles as the arrange path for UI specs (`registerUserWithApi`, `registerUserWithTotpEnabled`).

| Area                                                 | Spec                                             | Coverage                                                                                                                            | Status |
| ---------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Users — register/login                               | `users/users.smoke.api.spec.ts`                  | Register → login → Bearer token round-trip                                                                                          | ✅     |
| Products — reads                                     | `products/products.read.api.spec.ts`             | List envelope, paging, by-id, unknown-id 404, related, search, brand/category filter, price sort                                    | ✅     |
| Product specs — reads                                | `products/products.specs.read.api.spec.ts`       | Specs per product, spec by id, distinct spec names                                                                                  | ✅     |
| Brands — reads                                       | `brands/brands.read.api.spec.ts`                 | List, by-id, unknown-id 404, search                                                                                                 | ✅     |
| Categories — reads                                   | `categories/categories.read.api.spec.ts`         | Flat list, tree nesting, tree branch by id, search, single-read 405 gap                                                             | ✅     |
| Images — reads                                       | `images/images.read.api.spec.ts`                 | List + attribution fields                                                                                                           | ✅     |
| Catalog — write rejections                           | `catalog/catalog.mutations.negative.api.spec.ts` | Anonymous 401 / customer-token 403 on DELETE, empty-payload 422, unknown-id 404 on PUT/PATCH                                        | ✅     |
| Users — register validation DDT                      | `users/users.register.api.spec.ts`               | Required/optional fields, password policy, dob format + age, name length, duplicate 409, non-standard names, malformed-email defect | ✅     |
| Users — login                                        | `users/users.login.api.spec.ts`                  | Token shape, wrong password / unknown email / no password 401, TOTP `requires_totp` 200                                             | ✅     |
| Users — session                                      | `users/users.session.api.spec.ts`                | `/users/me`, anonymous + malformed token 401, refresh rotation, logout revocation                                                   | ✅     |
| Users — account                                      | `users/users.account.api.spec.ts`                | Change password (+ negatives), own-profile PUT/PATCH, other-user 403, self-delete 403, forgot-password                              | ✅     |
| TOTP — rejections                                    | `users/totp.negative.api.spec.ts`                | Wrong code 400 at enrolment, provisional-token 401, anonymous 401                                                                   | ✅     |
| Carts — lifecycle                                    | `carts/*`                                        | Phase D                                                                                                                             | ⏭     |
| Favorites / invoices / messages / payment / postcode | `favorites\|invoices\|messages\|payment/*`       | Phase E                                                                                                                             | ⏭     |
| Admin reads (reports, users, messages)               | `admin/*`                                        | Phase F                                                                                                                             | ⏭     |
| Catalog writes with an admin token                   | —                                                | ⛔ out of scope — the catalog is shared production data; writes are negative-only                                                   | —      |

**Data rules (binding, see §3):** every id is resolved live from a list call — no hard-coded
product/brand/category ids; every mutating test registers its own throwaway user; the admin token is
read-only and only ever sent with the correct password (§20 lockout is permanent).

**Status:** ✅ Phases A–C implemented. Two things Phase C settled that bind everything after it:

- **Registered users are permanent.** A customer cannot delete their own account (403 — deletion is
  admin-only, out of scope), so the register-per-test fixtures add a row to the shared database on
  every run, with no cleanup path. Accepted cost; a reason not to pull a `*RequestLogged` fixture
  into a spec that does not need auth.
- **Never hard-code a password.** Both register and change-password reject passwords found in a
  breach corpus, so a literal is a time bomb that fails loudly and misleadingly once the string is
  leaked. Use `prepareRandomPassword()` (`PRODUCT_EXPLORATION.md` §6).

The one deliberate coverage hole remains: whether a _valid_ anonymous `POST` to a catalog collection
is rejected is **untested by design** — the API validates before it authenticates, so the only way to
find out would risk creating an undeletable row in the shared catalog (`PRODUCT_EXPLORATION.md` §4).

## 6. Non-functional considerations captured as tests

- **Responsiveness:** run the smoke suite additionally under a mobile viewport project (e.g. `Pixel 5`/`iPhone 13`) to catch layout-breaking regressions on nav, cart, and checkout.
- **Resilience/negative paths:** every form has at least one negative-path test (invalid input, missing required field) in addition to the happy path — a requirement per feature, not optional.
- **Boundary values:** explicitly test min/max lengths and counts called out in the ACs (quantity clamp 1/99; message 50–250 chars; field max lengths; price range $1–$200) rather than only mid-range values.

## 7. Traceability

Each spec file's `test.describe` block references the corresponding section of `docs/user-stories/v5.md`
in a comment (e.g. `// User Registration AC5`) so failing tests map back to an acceptance criterion, and
gaps are easy to spot by diffing this plan against the AC list. Production discrepancies are cross-linked
to `PRODUCT_EXPLORATION.md`.

## 8. Open questions / risks (to confirm with the team)

1. Is a staging/test environment available, or must all tests run against production? Running against prod is assumed and drives the "never mutate shared data" constraints throughout.
2. Is there API or admin access to reset/inspect state (unlock a locked account, verify emails sent) that would let some "manual/best-effort" items become fully automated?
3. Can outbound email be captured (a test-only mailbox) to assert on real email delivery, or should tests keep relying on UI confirmation messages?
4. ~~Confirm whether production matches v5.~~ **Verified — production runs the v5.0 build; discrepancies are catalogued in `PRODUCT_EXPLORATION.md`.**

## 9. Production findings & discrepancies

All empirically-observed production behavior — confirmed contracts, doc/behavior discrepancies, the
production bugs, security/accessibility smells, the unautomatable items, and the recurring test-design
traps (the pre-load empty-state race, `updateOn:'blur'` forms, async input hydration, toast stacking,
unsafe position-based selection, shared-backend flakiness) — is consolidated in **`PRODUCT_EXPLORATION.md`**
at the repo root.

Per-spec implementation decisions (page objects, fixtures, locator strategies, validation runs) live in
the matching `.ai-docs/*-plan.md` file and in each spec's header comment. This plan previously carried a
running §9–§35 findings log; it was moved to `PRODUCT_EXPLORATION.md` to keep the plan focused on scope
and coverage.
