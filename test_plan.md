# E2E Test Plan — Practice Software Testing (Tool Shop)

**Application under test:** https://practicesoftwaretesting.com/#/
**Source of truth for behavior:** [practice-software-testing](../practice-software-testing) repo, `docs/user-stories/v5.md` (full production feature set)
**Automation:** Playwright + TypeScript, Page Object Model (`src/ui/pages`), fixtures in `src/ui/fixtures`
**Scope:** UI end-to-end tests against the public site as a black box (no seeded DB access), plus API-observable outcomes (status codes, emails) where feasible via the UI.

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
- Geo-location discount (depends on real/mocked IP geolocation, environment-dependent) — covered lightly via Playwright geolocation context override, best-effort.

## 3. Test environment & data strategy

- Target: production site `https://practicesoftwaretesting.com` (`BASE_URL` in `.env`).
- Each test that needs an authenticated/mutable account (profile edits, password changes, favorites, invoices) must **register its own user via the UI or a `registerUser` fixture helper** using `@faker-js/faker`, rather than relying on shared fixed accounts — production data is shared across anyone running these suites.
- The known seeded accounts `customer@practicesoftwaretesting.com` / `admin@practicesoftwaretesting.com` are reserved for:
  - Read-only checks (e.g., login success, admin dashboard access).
  - Explicitly-flagged behavior that only applies to them (TOTP setup denial, AC6 of 2FA Setup).
  - They must **never** be used for destructive/mutating tests (password change, account edits, order placement) since they are shared across all test runs and other engineers/CI.
- Products/categories/brands are treated as read-only fixture data owned by the app; tests should assert on structural properties (e.g., "grid has products", "price format is $X.XX") rather than hard-coded product names/prices, since catalog content can change over time. Where a specific product is required (e.g. a known out-of-stock or rental item), select it dynamically by locating the first product matching the needed condition rather than hard-coding an ID.
- Tests must be independent and parallelizable (`fullyParallel: true` is already set) — no shared mutable state (e.g., don't assert on absolute cart/favorites counts from a shared session).
- Use tags (`@smoke`, `@regression`, `@checkout`, `@auth`, `@admin`, `@a11y`) via `test.describe`/`test` titles to allow selective runs, following the existing `@login`/`@register`/`@profile` convention.

## 4. Test levels / suites

| Suite                                              | Trigger               | Contents                                                                                              |
| -------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------- |
| **Smoke** (`@smoke`)                               | Every push / PR       | Home page loads, nav works, login, register, add-to-cart → checkout happy path, one admin login check |
| **Regression** (`@regression`)                     | Nightly / pre-release | Everything in this plan                                                                               |
| **Targeted** (`@checkout`, `@auth`, `@admin`, ...) | On-demand, ad hoc     | Feature-scoped subset for fast local iteration                                                        |

## 5. Feature areas & test cases

Each area below maps to a spec file under `tests/ui/` and a page object under `src/ui/pages/` (existing files reused where possible; new ones added as noted).

### 5.1 Product Overview / Home (`tests/ui/product-overview.spec.ts`)

- Product grid renders with image, name, price for each card.
- Clicking a product card navigates to its detail page.
- Pagination: page 2 shows different products than page 1; last page's "next" is disabled/absent.
- Search: valid query (3–40 chars) filters grid to matching products only; submitting a new search clears previously active filters.
- Search: query shorter than 3 chars is rejected or ignored (boundary).
- Category filter: selecting one category shows only that category's products.
- Category filter: selecting a parent category auto-checks its children; unchecking all children unchecks the parent.
- Brand filter: selecting a brand filters the grid.
- Combined category + brand filters apply as AND (intersection).
- Sorting: each of Name A-Z, Name Z-A, Price Low-High, Price High-Low produces a correctly ordered grid (assert on adjacent-pair comparisons, not full list equality).
- Price range slider: default bounds are $1–$100 (max $200); dragging/setting handles filters the grid to products within range.
- Discounted product card shows strikethrough original price + discounted price. **Best-effort/skip in automation** — see §9 finding (2026-07-05): no generic discount/sale field exists in the product API; this is the same server-side/IP-determined `is_location_offer` mechanism as the §5.22 geo-location discount and can't be triggered from an automated test.
- Out-of-stock product card shows "Out of stock" label.

### 5.2 Browse by Category (`tests/ui/category.spec.ts`)

- Navigating via a category link loads the category page with the category name as title.
- Same filter/sort/pagination/price-range capabilities are present and functional as on the overview page.

### 5.3 Product Detail (`tests/ui/product-detail.spec.ts`)

- Image, name, description, price, category badge, brand badge are displayed.
- Discounted product: strikethrough price + discount % badge shown.
- Quantity stepper: default 1; `+`/`-` increment/decrement; `-` at 1 stays at 1.
- Manual quantity entry: typed value is applied and clamped to [1, 999999999] (test a value below 1, a value far above max, and a valid mid value).
- Add to cart: success message "Product added to shopping cart." and cart badge/count updates.
- Out-of-stock non-rental product: "Add to Cart" disabled, "Out of stock" shown in red.
- Rental product: duration slider (1–10h) replaces qty stepper; total price = hourly rate × duration, recalculated on drag.
- Favorites (logged in): add succeeds ("Product added to your favorites list.", `POST /favorites` → 201); adding the
  same product again shows "Product already in your favorites list." (→ 409). **Implemented 2026-07-09 (see §27).**
- Favorites (logged out): clicking "Add to favourites" shows "Unauthorized, can not add product to your favorite
  list." — the documented "Unauthorized..." is an abbreviation, not the copy (§27) — and does not persist anything
  (`POST /favorites` → 401). **Implemented 2026-07-09 (see §27).**
- Related products section is present below main content.

### 5.4 Rentals (`tests/ui/rentals.spec.ts`)

- Rentals listing page shows all rental products with image, name, description.
- Rental product detail page shows duration slider instead of qty stepper.
- Rental item added to cart is labeled "This is a rental item" in checkout.
- (Best-effort/skippable if geolocation can't be reliably mocked against prod) Location-based discount applies to rental price for a supported city context.

### 5.5 Cart (`tests/ui/cart.spec.ts`)

- Cart displays Item/Quantity/Price/Total/Actions columns once an item is added.
- Changing quantity recalculates line total and cart total, with "Product quantity updated." confirmation.
- Deleting an item removes it and recalculates the cart total.
- Empty cart shows "Your shopping cart is empty".
- "Proceed" is enabled/advances only when cart has ≥1 item.
- Cart item with a discount shows a discount badge plus original & discounted price.
- Cart with both a rental and a non-rental item gets an additional 15% combined-product discount, and shows subtotal/discount/total breakdown.
- Removing all items of one type (all rentals or all non-rentals) removes the 15% combined discount and reverts total.

### 5.6 Checkout — Sign in step (`tests/ui/checkout-signin.spec.ts`)

- Guest proceeding from cart is shown a login form (email, password, submit) as part of the checkout wizard.
- TOTP-enabled account: submitting valid credentials at this step prompts for a 6-digit TOTP code before proceeding.
- Valid credentials advance to billing address step.
- Already-logged-in user sees "You are already signed in as {name}" and proceeds directly to billing address.

### 5.7 Checkout — Billing address (`tests/ui/checkout-address.spec.ts`)

- All required fields present (street ≤70, city ≤40, state ≤40, country ≤40, postal code ≤10).
- Leaving a required field empty invalidates it and disables "Proceed".
- Exceeding max length is rejected/truncated (boundary check per field).
- Filling all fields validly enables proceeding to payment.
- Logged-in user's address fields are pre-filled from account data.

### 5.8 Checkout — Payment (`tests/ui/checkout-payment.spec.ts`)

- Payment method dropdown offers: Bank Transfer, Cash on Delivery, Credit Card, Buy Now Pay Later, Gift Card.
- Bank Transfer: bank name (letters/spaces only, rejects digits), account name (alphanumeric + `. ' -`), account number (digits only) — validate both valid and invalid input per field.
- Credit Card: card number format `XXXX-XXXX-XXXX-XXXX`, expiration `MM/YYYY` in the future, CVV 3–4 digits, holder name letters/spaces only.
- Credit Card: past expiration date shows "Expiration date must be in the future."
- Buy Now Pay Later: "Monthly installments" dropdown offers 3/6/9/12.
- Gift Card: gift card number + validation code, both required/alphanumeric.
- Cash on Delivery: no additional fields required, proceeds directly.
- Switching payment method resets the form and shows the new method's fields (no stale field values/errors carried over).
- Successful order (one happy path per payment method, at least full coverage for Credit Card and Cash on Delivery): confirmation with invoice number shown, cart is cleared afterward.

### 5.9 End-to-end checkout (`tests/ui/checkout-e2e.spec.ts`) — critical path, tagged `@smoke`

- Guest: browse → add to cart → checkout → register/login inline → address → payment (Cash on Delivery) → confirmation with invoice number → cart emptied.
- Logged-in user: add to cart → checkout skips login step → pre-filled address → payment → confirmation.

### 5.10 Registration (`tests/ui/register.spec.ts` — extend existing)

- All required fields enforced (first/last name, DOB ISO format, street, numeric postal code, city, state, country dropdown, numeric phone, RFC-valid email ≤256 chars, password).
- Password requirements list is shown on focus and each rule (length, upper/lower, number, special char) is highlighted live as it's satisfied/unsatisfied while typing.
- Password strength indicator shows correct label + bar % for 1/2/3/4/5 criteria met (Weak 20% → Excellent 100%).
- Duplicate email registration shows "Email is already in use."
- Successful registration redirects to login page (already covered) — extend to also assert a distinct new user can subsequently log in.
- Invalid email format is rejected client-side (RFC-format boundary cases: missing `@`, missing domain, valid edge-case addresses).

### 5.11 Login (`tests/ui/login.spec.ts` — extend existing)

- Valid credentials → `/account` for a regular user (existing test).
- Valid admin credentials → redirected to `/admin/dashboard`.
- Invalid credentials → "Invalid email or password" (existing test).
- ~~Account locking: 3 consecutive failed attempts → 4th attempt shows "Account locked, too many failed attempts..."~~ **Implemented 2026-07-09 (see §20)** — uses a disposable freshly-registered account, never the shared seeded ones, since lockout is destructive to that account permanently.
- Admin account is exempt from lockout even after repeated failed logins (use a throwaway check — do not lock the shared seeded admin; if this can't be verified without touching the shared admin, mark as manual/skip with a comment explaining why).
- Disabled account (requires admin action to disable a test-created user first) → "Account disabled." and not authenticated.
- ~~TOTP-enabled account → 6-digit code prompt after valid email/password; valid code authenticates; invalid code shows "Invalid TOTP".~~ **Implemented 2026-07-09 (see §23)** — the account is enrolled over the API by `registerUserWithTotpEnabled()`; never a shared account.
- "Sign in with Google" opens a 500×400 popup (assert popup dimensions/target, not full OAuth flow — treat deep Google auth as out of scope/mocked).

### 5.12 Forgot password (`tests/ui/forgot-password.spec.ts`)

**Implemented 2026-07-09 (see §21)** — all four ACs. ⚠ **This form is destructive:** submitting a registered
email resets that account's password immediately (no email token). Only ever drive it with a disposable
faker/API-registered user — never `testUser1` or the shared seeded accounts.

- Form accessible from login page with an email field.
- Invalid/non-RFC email format is rejected client-side (the format error box renders **empty** — prod bug, §21).
- Valid registered email → success/confirmation message, which fades out after ~3s (message renders the **raw
  i18n key** `page.forgot-password.confirm` — prod bug, §21).
- Unregistered email → error message shown ("The selected email is invalid.").

### 5.13 Two-Factor Authentication setup (`tests/ui/totp-setup.spec.ts`)

**Implemented 2026-07-09 (see §22)** — AC1–AC3 fully, AC4 for `customer@` only.

- Freshly-registered, logged-in user sees the setup section (real heading: **"Set up Two-Factor Authentication"**) with QR code and manual secret key text.
- Valid 6-digit code (generated via `otplib` from the displayed secret) → "TOTP verified and enabled successfully."
- Invalid code → error message, TOTP not enabled (the error also tears down the QR/secret/form — prod bug, §22).
- Seeded `customer@`/`admin@` accounts are denied TOTP setup with the specific "Access denied..." message (safe: this is a read/negative check, no mutation). **`admin@` is not automatable** — no admin password exists in config, and guessing risks locking a shared account; both emails hit one hardcoded 403 branch, so the `customer@` test covers the rule (§22).

### 5.14 Customer profile (`tests/ui/profile.spec.ts`)

- Profile page shows current data for a freshly-registered logged-in user.
- All editable fields (first/last name, phone, street, postal code, city, state, country) can be updated and persist after save; success message fades after ~5s.
- Email field is present but not editable (readonly/disabled).
- Required-field validation prevents saving with a field blanked out.

> **Status: fully implemented (2026-07-09) — see §24.** All four ACs covered. Note that only 5 of the 8 editable
> fields are actually required (phone, postal code and state save fine when blank), so AC4 is parameterized over
> those five; validation is enforced **server-side** (the submit button never disables). Country is a free-text
> input here, unlike the billing step's `<select>` (§9).

### 5.15 Change password (`tests/ui/change-password.spec.ts`)

**Implemented 2026-07-09 (see §25)** — all six ACs. ⚠ **This form is destructive:** every AC changes the
account password, so each test registers its own throwaway user. Never `testUser1` or the `@logged` session user.

- Form shows current/new/confirm fields.
- Password strength indicator advances one step per criterion met (Weak 20% → Excellent 100%). It does **not**
  mirror registration behavior: registration's meter is broken (§19), this one works (§25).
- Mismatched new/confirm → "The new password field confirmation does not match." (the documented "Passwords do
  not match." is **not** the real copy — §25).
- Wrong current password → "Your current password does not matches with the password."
- New password identical to current → "New Password cannot be same as your current password."
- Valid change → success message ("Your password is successfully updated!"), then automatic logout after ~5s
  (assert redirected/unauthenticated afterward).

### 5.16 Favorites (`tests/ui/favorites.spec.ts`)

**Implemented 2026-07-09 (see §26)** — all three ACs. ⚠ **Destructive:** every AC mutates the account's favorites,
so each test registers its own throwaway user. Never `testUser1` or the `@logged` session user.

- Empty state message when no favorites ("There are no favorites yet. In order to add favorites, please go to the
  product listing and mark some products as your favorite."). The message also renders **while the list is still
  loading** — enter the page via `gotoAndAwaitLoaded()`, never a bare `goto()` (§26).
- Adding a product from detail page surfaces it on the favorites page with image/name/truncated description
  (truncation is a real 250-char substring from the app's `TruncatePipe`, not CSS ellipsis — §26).
- Removing a favorite updates the list immediately (delete + refetch, no dialog, no toast, no reload).

The favorites ACs that belong to the **product detail page** (§5.3: logged-in add success / "already in favorites"
toasts, and the logged-out "Unauthorized" path) remain deferred — this pass covered §5.16 only.

### 5.17 Invoices (`tests/ui/invoices.spec.ts`)

**AC1–AC3 implemented 2026-07-11 (see §29).** Each places a real Cash-on-Delivery order as
its own throwaway API-registered user (deterministic single-invoice list). AC4 and AC5 remain
deferred.

- After completing a checkout, the invoice appears in the paginated invoice list with correct number/street/date/total. **Implemented (§29)** — number/date/total pinned exactly; the list "Billing Address" column (street only) is a real prod-data inconsistency and is asserted present, not pinned.
- Invoice detail page shows number/date/total, full billing address, payment method+details, and line items. **Implemented (§29).**
- Non-existent/foreign invoice ID → "not found" message. **Implemented (§29)** — copy is "This invoice doesn't exist." (a non-existent id is used; a foreign id isn't safely obtainable).
- Discounted order's invoice shows subtotal/discount %/amount/total, and discounted line items show strikethrough + discounted price. **Deferred** — needs the rental+non-rental combination-discount flow (§5.5 AC7/AC8, still deferred); the `is_location_offer` per-item discount is unautomatable (§10).
- "Download PDF" is disabled while generating, then enabled and triggers a real file download once ready (poll, allow for the ~20s status check). **Deferred** — best-effort/manual per §9; `[data-test="download-invoice"]` exists on the detail page for a future pass.

### 5.18 Messages (`tests/ui/messages.spec.ts`)

- After submitting a contact form while logged in, the message appears in the paginated Messages list (subject, truncated body, NEW status badge, date).
- Message detail shows full original message + chronological replies.
- Submitting a reply appends it to the thread.

### 5.19 Contact form (`tests/ui/contact.spec.ts` — extend existing `contact.page.ts`)

- Logged-in: name/email are auto-filled & hidden, "Known user, {name}" shown.
- Guest: name/email fields shown and required.
- Subject dropdown offers all 6 options; message requires ≥50 characters (boundary: 49 vs 50 chars).
- Attachment: only `.txt` accepted and must be exactly 0 KB.
  - Non-`.txt` file → "File should have a txt extension."
  - Non-empty file (any type) → "File should be empty."
- Valid submission (with and without attachment) → confirmation message shown.

### 5.20 Admin dashboard (`tests/admin/*.spec.ts`) — smoke-level only, tagged `@admin`

- Admin login lands on `/admin/dashboard` with sales chart + recent invoices list.
- Products: list loads; create/edit/delete a **test-created** product only (never touch existing catalog products) round-trips correctly.
- Categories/Brands: same create/edit/delete pattern using disposable test entities.
- Orders: list loads, detail view opens, status can be changed among the 5 defined values for a test-generated order.
- Users: list loads; disabling a **test-created** user immediately blocks their login, re-enabling restores it.
- Messages management: admin can view and reply to a message (use a message created earlier by the test's own contact-form submission).
- Reports: monthly/weekly/general statistics sections render without error.

> Admin CRUD tests must only ever create, modify, or delete entities the test itself created — production catalog/order/user data must not be mutated by automated tests.

### 5.21 Chat widget (`tests/ui/chat-widget.spec.ts`)

- Toggle button visible bottom-right on any page; opening shows menu: Find Product, Order Product, Checkout, Support.
- Find Product: search returns ≤5 product cards; "View Product" navigates to detail page.
- Order Product: search → select quantity (preset or custom 1–999) → confirm → product appears in cart.
- Checkout via chat: full flow (cart summary → guest details if logged out → address → payment → confirmation with invoice number).
- Checkout via chat with empty cart → "Your cart is empty".
- Support via chat: subject + message (≥50 chars) + optional `.txt` attachment (+ guest name/email if logged out) → confirmation.

### 5.22 Discounts (`tests/ui/discounts.spec.ts`)

- Combination discount (rental + non-rental in cart) — covered primarily in 5.5, cross-checked here through to invoice (5.17 AC4).
- Location-based discount: best-effort using Playwright's `geolocation`/`locale` context options or a mocked geolocation API response, for at least one supported city (e.g. London 25%); explicitly note if the app determines location via IP (not overridable client-side) — if so, mark this test **manual/exploratory only** and document why automation is unreliable.

### 5.23 Multi-language (`tests/ui/language.spec.ts`)

- Default language selector shows DE/EN/ES/FR/NL/TR options in the nav on any page.
- Switching language updates visible UI text to the selected language (spot-check a handful of strings, e.g. nav labels).
- Selected language persists across a reload/new navigation within the same browser context (localStorage).
- (Optional/best-effort) First-visit browser-language auto-detection and fallback-to-English for unsupported browser locales, using Playwright's `locale` launch option in a fresh context.

### 5.24 Privacy policy (`tests/ui/privacy.spec.ts`)

- `/privacy` loads and contains expected sections (Google Sign-In, data collection, automatic removal, third-party services, data security, contact info) — assert on presence of key headings/text.

### 5.25 Accessibility & cross-cutting checks (`tests/ui/a11y.spec.ts`, tagged `@a11y`)

- Run `@axe-core/playwright` against key pages (home, product detail, cart, checkout steps, login, register) as a smoke-level accessibility gate, asserting no serious/critical violations.
- Basic keyboard navigation through the main checkout flow (tab order reaches primary actions).

## 6. Non-functional considerations captured as tests

- **Responsiveness:** run the smoke suite additionally under a mobile viewport project (e.g. `Pixel 5`/`iPhone 13` in `playwright.config.ts`) to catch layout-breaking regressions on nav, cart, and checkout.
- **Resilience/negative paths:** every form above has at least one negative-path test (invalid input, missing required field) in addition to the happy path — this is treated as a requirement per feature, not optional.
- **Boundary values:** explicitly test min/max lengths and counts called out in the acceptance criteria (quantity clamp 1/999,999,999; message ≥50 chars; field max lengths; price range $1–$200) rather than only mid-range values.

## 7. Traceability

Each spec file's `test.describe` block should reference the corresponding section of `docs/user-stories/v5.md` in a comment (e.g. `// User Registration AC5`) so failing tests map directly back to an acceptance criterion, and gaps in coverage are easy to spot by diffing this plan against the AC list.

## 8. Open questions / risks (to confirm with the team before full implementation)

1. Is a staging/test environment available, or must all tests run against production? Running against prod is assumed above (per current `.env`/`BASE_URL` setup) and drives the "never mutate shared data" constraints throughout.
2. Is there API or admin access to reset/inspect state (e.g., unlock a locked account, verify emails were actually sent) that would let some "manual/best-effort" items above become fully automated?
3. Can outbound email be captured in this environment (e.g. a test-only mailbox) to assert on real email delivery, or should tests continue to rely solely on UI confirmation messages?
4. ~~Confirm whether production matches v5.~~ **Verified 2026-07-04 via manual exploration (playwright-cli) — see §9 below.** Production is running the v5.0 build and the checked v5 features are live; a few things differ from the docs and need to be reflected in page objects/assertions.

## 9. Production verification findings (2026-07-04)

Explored `https://practicesoftwaretesting.com` directly (page title confirms `Toolshop - v5.0`) to de-risk automating features that might not actually be deployed. Checked with both the seeded `customer@` and `admin@` accounts (read-only actions only — no mutation of shared data).

**Confirmed live, matches docs:**

- Price range slider (default $1–$100, bounds $0/$200 — see discrepancy below).
- Multi-language selector in nav.
- "Sign in with Google" button on login page.
- TOTP setup section on profile page, incl. the exact "Access denied: If you want to configure TOTP, please create your own account." message for the seeded `customer@` account.
- Change-password strength indicator (Weak/Moderate/Strong/Very Strong/Excellent).
- Non-admin users are redirected away from `/admin/dashboard`; admin login lands directly on it with a sales chart heading and paginated recent-orders table.
- All admin sections exist: Dashboard, Brands, Categories, Products, Orders, Users, Messages, Reports (reachable via the account-name dropdown menu, not a persistent sidebar — page objects should navigate via that dropdown or direct URL, not assume a visible sidebar nav).
- Chat widget toggle, opening to a 4-option menu, and the "Choose your payment method" step with the full 5-option dropdown (Bank Transfer, Cash on Delivery, Credit Card, Buy Now Pay Later, Gift Card) and disabled/empty state until a method is chosen.
- Checkout wizard steps (Cart → Sign in → Billing Address → Payment) and the "already logged in" skip behavior.

**Discrepancies to account for in tests (docs vs. actual):**

- **Language selector has 7 options, not 6** — `DE, EL, EN, ES, FR, NL, TR` (adds Greek "EL", not mentioned in `docs/user-stories/v5.md`). Update §5.23 assertions to the actual option list rather than the documented 6.
- **Billing address "Country" is a `<select>` dropdown** with a full ISO country list, not a free-text field with a 40-char max as AC1 implies. There is also an extra **"House number"** field not mentioned in the AC. Update §5.7 test cases accordingly (drop the Country max-length boundary test; add House number to the field list). **Update 2026-07-07 (see §16):** §5.7 AC5 ("logged-in user's address is pre-filled from account data") is **false in production** — billing renders empty for a logged-in user; the step instead offers a postal-code lookup. The billing form also has no native `maxlength` and no visible validation error text.
- **Sustainability / CO₂ rating and "Compare" feature are live but undocumented** in v5: product cards and detail pages show a CO₂ rating (A–E) badge, a per-product "Compare" button, and the category sidebar has an "Eco-Friendly Products" filter plus CO₂-rating sort options. None of this is in `docs/user-stories/v5.md`. **Add a new §5.26 "Sustainability / Compare" section** to this plan once the intended behavior is confirmed with the team (docs may be behind an already-shipped feature).
- Checkout "already logged in" copy is _"Hello {First} {Last}, you are already logged in. You can proceed to checkout."_ — not the documented _"You are already signed in as..."_. Assert on the actual copy.
- Admin dropdown menu includes an extra **"Settings"** entry (`/admin/settings`) not covered anywhere in the v5 docs — worth at least a smoke-level access check.
- Chat widget menu button labels are _"Find a product" / "Order a product" / "Checkout" / "Create support ticket"_ (lowercase, slightly reworded vs. the docs' "Find Product" / "Order Product" / "Checkout" / "Support"). Use the actual labels in locators.
- "Add to Favorites" button is rendered as **"Add to favourites"** (British spelling) on the product detail page — use the actual label in locators/assertions.

**Data-quality risk observed directly (reinforces §3):** the shared category/brand filter lists on production are visibly polluted with leftover test data from other users' automated runs (e.g. repeated "E2E Cat", "Patched Cat", "Cat A/B", "X" entries, several levels deep). Tests must not assume a clean/predictable category or brand tree — always assert on structural behavior (e.g., "checking a category filters the grid") rather than exact counts or a fixed list of names. A product ID captured from one page load also 404'd moments later when reloaded fresh, confirming products can be deleted mid-session by concurrent test runs elsewhere — tests should always fetch a live product link/ID immediately before use rather than caching one across steps.

**Not yet spiked (still best-effort/manual per §3, §5.5, §5.22):** geo-location discount, PDF invoice generation/download timing, and real email delivery — these need either a controllable environment or longer manual sessions to verify reliably and were not exercised in this pass.

## 10. Product overview / home implementation findings (2026-07-05)

Implemented the "core browse" subset of §5.1 (`tests/ui/product-overview.spec.ts`, `src/ui/pages/home.page.ts`). Confirmed stable `data-test` locators for the product grid (`a.card[data-test^="product-"]`, `product-name`, `product-price`, `out-of-stock`) and pagination (`pagination-prev`/`pagination-next`, disabled state on the parent `li.page-item`, not the link).

**Discount mechanism confirmed unautomatable:** the products API (`api.practicesoftwaretesting.com/products`) has no generic sale/discount field — the only price-related flag is `is_location_offer` (boolean per product), the same field backing the §5.22 geo-location discount. Tested directly: mocked Playwright's browser `geolocation` context to London coordinates for a live product with `is_location_offer: true`, then reloaded — no strikethrough/discounted price rendered. This empirically confirms the §9 hypothesis that eligibility is determined server-side by request IP, not the browser Geolocation API, so the §5.1 "discounted product card" AC (and §5.22 generally) cannot be forced from an automated test running from a non-eligible CI/dev IP. The corresponding test is written as `test.skip` with a comment, not exercised.

Deferred (per user scope decision, not a gap): search, category filter, brand filter, combined filters, all 4 sort orders, price range slider — remaining §5.1 ACs for a follow-up pass.

**Pagination flakiness fixed (2026-07-06):** `product-overview.spec.ts` › "last page's next pagination control is disabled" was intermittently timing out on `toHaveClass(/disabled/)`. Live investigation (playwright-cli) disproved the earlier "app behavior change" hypothesis: the app **does** still add `disabled` to the last page's `[data-test="pagination-next"]` parent `<li>` — reachable both via the numbered page links and via sequential "next" clicks. The catalog currently renders 5 UI pages of 9 cards (the numbered links window to 5, so the true last page can sit beyond the visible numbers), and clicking "next" fires an async `QUERY /products` (Angular HttpClient XHR, not `fetch`).

Two **test-side races** were the real cause, both fixed in `src/ui/pages/product-list.page.ts`:

- `goToLastPage()` fired `paginationNextLink.click()` fire-and-forget (unlike `getAllProductNamesAcrossPages`, which already awaited the re-fetch), so overlapping `/products` responses could settle out of order and leave the walk parked on a middle page where "next" is still enabled → the assertion timed out. Fixed with a shared `goToNextPage()` helper that serializes each turn — awaiting both the `QUERY /products` response and the re-render (the active page number incrementing) — now used by `goToLastPage`, `getAllProductNamesAcrossPages`, and `findOutOfStockCardAcrossPages`.
- A separate first-paint race: the grid renders via a post-navigation XHR, so a walk started right after `goto()` could run before any cards/pagination existed, making `isOnLastPage()` read "no pagination ⇒ last page" and bail on page one (this is what made the out-of-stock walk return `false` even though the out-of-stock card was on page 1). Fixed with a `waitForGrid()` guard on the two post-`goto()` walkers (`goToLastPage`, `findOutOfStockCardAcrossPages`); deliberately **not** applied to `getAllProductNamesAcrossPages`, whose filtered result set can legitimately be empty (its callers already await the filter's `/products` response). The `isOnLastPage()` "next disabled/absent on the last page" assumption is confirmed valid and retained.

## 11. Browse-by-category implementation findings (2026-07-06)

Implemented §5.2 (`tests/ui/category.spec.ts`). Refactor: extracted the shared product-listing interface (grid/filters/sort/pagination/price/search locators + methods) from `HomePage` into an abstract `src/ui/pages/product-list.page.ts` (`ProductListPage`); `HomePage` and the four category page objects (`hand-tools`/`power-tools`/`other`/`special-tools`) now extend it. Each category page adds a `Category: <Name>` heading locator; the navbar gained `openCategories()` (the category links live inside the collapsed "Categories" dropdown and are hidden until it is clicked). `HomePage`'s public API is unchanged, so the §5.1 specs are unaffected (re-run green aside from the pre-existing pagination note above).

- **AC1** covered for all four categories via nav-link click → assert URL + `Category: <Name>` heading. The document `<title>` is intentionally **not** re-asserted here (it's already covered per-category by `smoke/menu.spec.ts`, and see the Special Tools discrepancy below).

**Discrepancies to account for (docs/plan vs. actual):**

- **Category page sidebar omits the Price Range slider and the Search box.** Unlike the overview page, `/category/<slug>` exposes only Sort, the category/brand filters, the Sustainability filter, and pagination — no `ngx-slider` price range and no `[data-test="search-query"]`. So §5.2 AC2's "same … price-range capabilities … as on the overview page" is **inaccurate**; AC2 was implemented as Sort + pagination (present & functional) plus an explicit absence test asserting the price-range slider and search box are not rendered.
- **Hash vs non-hash route render differently.** The legacy `/#/category/<slug>` route renders an older/fuller sidebar (which _does_ include price range + search) and never sets the title/heading; the canonical non-hash `/category/<slug>` route (what the page objects' `goto()` uses) renders the current layout and sets title/heading asynchronously. Always drive category pages via the non-hash `PAGE_URL` paths.
- **Special Tools category is inconsistent.** It renders the `Category: Special Tools` heading but **never updates `document.title`** (stays the generic `Practice Software Testing - Toolshop - v5.0`), unlike Hand/Power/Other which set `"<Name> - …"`. It also currently has an **empty product grid (0 products)**. This is why `smoke/menu.spec.ts` already asserts Special Tools via its heading rather than the title.

## 12. Product detail implementation findings (2026-07-07)

Implemented the **core** subset of §5.3 (`tests/ui/product-detail.spec.ts`, new `src/ui/pages/product-detail.page.ts`): display fields, quantity stepper, manual-quantity clamp, add-to-cart, out-of-stock, related products. New page object registered in `src/ui/fixtures/page-object.fixture.ts`; the cart badge locators (`nav-cart` / `cart-quantity`) were added to the shared `NavbarComponent`. Detail pages are always reached by **clicking a live product card** from a listing (dynamic `/product/<id>`, no cached/hard-coded id per §9); the out-of-stock case reuses `ProductListPage.findOutOfStockCardAcrossPages()` then clicks `outOfStockCard`.

Confirmed stable locators: `product-name` (h1), `unit-price`, `product-description`, main image `img.figure-img`, `quantity`/`increase-quantity`/`decrease-quantity`, `add-to-cart`, `out-of-stock`. Category and brand render as pill badges with **no `data-test`** — distinguished only by `aria-label="category"` / `aria-label="brand"` (use `getByLabel`). The add-to-cart confirmation is an ngx-toastr toast (`.toast-message`, `role="alert"`) reading exactly **"Product added to shopping cart."**; the navbar cart badge (`cart-quantity`) is **absent until the cart is non-empty** and appears after the first add (guest cart is per-context localStorage, so it starts empty and is deterministic per test).

**Discrepancies to account for (docs/plan vs. actual):**

- **Manual quantity clamp is [1, 99], not the documented [1, 999999999].** The `[data-test="quantity"]` input is `type=number min=1 max=99`, and the app actively clamps typed values (verified live with real `fill()`: `0`→`1`, `-5`→`1`, `100000`→`99`, `50`→`50`). §5.3's "clamped to [1, 999999999]" is inaccurate — the spec asserts the real [1, 99] bounds.
- **Detail price is a bare number** (e.g. `14.15`), unlike the listing card's `product-price` `$X.XX` format — the detail locator is `unit-price` and the assertion uses `/^\d+\.\d{2}$/` (no `$`).
- **No `data-test` on category/brand badges or the related-products section.** Category/brand use `aria-label`; the related section is an `<h2>Related products</h2>` whose cards are plain `a.card` (the listing cards are `a.card[data-test^="product-"]`).

Deferred (per user scope decision, not gaps): discounted-product badge (unautomatable, §10), rental duration slider + price recalc, and favorites (logged-in add/already-added and logged-out Unauthorized) — remaining §5.3 ACs for a follow-up pass.

## 13. Rentals implementation findings (2026-07-07)

Implemented §5.4 AC1–AC3 (`tests/ui/rentals.spec.ts`): the `RentalsPage` stub was fleshed out, `ProductDetailPage` gained a `durationSlider` locator, and a new minimal `CartPage` (`src/ui/pages/cart.page.ts`, `PAGE_URLS.CHECKOUT = /checkout`, registered in `src/ui/fixtures/page-object.fixture.ts`) models the cart step so §5.5 can extend it. AC4 (location-based rental discount) is **not** implemented — same unautomatable server/IP-side `is_location_offer` mechanism as §10/§5.22. Rentals are selected dynamically (first card), no hard-coded id/name/price (§3, §9).

Confirmed stable locators (live exploration): rental listing cards are `[data-test^="product-"]` with `h5.card-title` (name) and `p.card-text` (description); the rental detail duration slider is `getByRole('slider', { name: 'ngx-slider' })` (1–10h); the cart product name is `[data-test="product-title"]`.

**Discrepancies to account for (docs/plan vs. actual):**

- **AC3 cart label is "Item for rent, price per hour", not the documented "This is a rental item".** It renders on the Cart step of `/checkout` as a bare `<small>` (no `data-test`) beneath the `[data-test="product-title"]` span — matched by text. Assert the actual copy.
- **The `/rentals` listing card is a different component from the overview/category grid.** Each rental is a `div.card.mb-3` wrapping a **`tabindex`-focusable `div[data-test^="product-"]`** (not an `<a>`, no `href`; clicking routes to `/product/<id>`), and shows a **description with no price** — unlike the overview grid's `a.card[data-test^="product-"]` with `product-name`/`product-price`. So `RentalsPage` stays a standalone `BasePage`, not a `ProductListPage` subclass. On the rental detail page the `[data-test="quantity"]` stepper is **absent** (replaced by the duration slider); price shows `$X.XX per hour / (Total $X.XX)` while `[data-test="unit-price"]` remains a bare number.

Deferred (per user scope decision, not gaps): AC4 location discount (unautomatable) and rental price recalc on slider drag (belongs to the deferred §5.3 rental-slider AC).

## 14. Cart core implementation findings (2026-07-07)

Implemented the **core** subset of §5.5 AC1–AC5 (`tests/ui/cart.spec.ts`, extending the existing minimal
`src/ui/pages/cart.page.ts`). The cart step lives at `/checkout` and is fully exercisable as a **guest** (the cart
is a per-context localStorage cart, empty per test — deterministic and safe to mutate, §12). Products are
selected dynamically by card index and prices read back from the DOM — no hard-coded id/name/price (§3, §9).

Confirmed stable locators (one `<table>` on the page): column headers `getByRole('table')` →
`getByRole('columnheader')`; per-row `[data-test="product-title"]`, `[data-test="product-quantity"]`
(editable `input[type=number] min=1 max=99`), `[data-test="product-price"]` (unit, `$X.XX`),
`[data-test="line-price"]` (line total); grand total `[data-test="cart-total"]`; proceed `[data-test="proceed-1"]`.
Both the quantity-updated and item-deleted confirmations are ngx-toastr `.toast-message` toasts.

**Discrepancies to account for (docs/plan vs. actual):**

- **The 5th "Actions" column header is blank.** Headers are exactly `Item / Quantity / Price / Total / ""` — the
  documented "Actions" label does not render. The delete control itself is a bare `<a class="btn btn-danger">`
  with an `aria-hidden` xmark icon: **no `data-test`, no accessible name/role, no `href`** — so it's located via
  a CSS chain scoped to the cart table (`getByRole('table').locator('a.btn-danger')`), the one case where a raw
  CSS selector is unavoidable per `CODING_STANDARDS.md`.
- **Empty-cart copy is "The cart is empty. Nothing to display."**, not the documented "Your shopping cart is
  empty". It renders as a bare `<p>` (no `data-test`, matched by text). It also appears **only after the cart has
  been emptied** — a **pristine** cart (nothing ever added) renders neither a table nor the empty message, just
  the wizard step labels. So the empty-message test adds then deletes an item; the Proceed-gating test uses the
  pristine empty cart (where `proceed-1` is simply absent, count 0).
- **Quantity change commits on the input's `change`/blur, not on keystroke.** Typing into `product-quantity`
  updates only the `line-price` display (ngModel input binding) and **reverts on reload**; the `cart-total`
  recalculation and the "Product quantity updated." toast fire on blur. `CartPage.updateQuantity` therefore
  `fill`s **then** `blur`s. Recalculation is exact — line = unit × qty, cart total = Σ lines (asserted via
  arithmetic read back from the DOM, e.g. qty 1→3 on a $14.15 item → `$42.45`).

Deferred (per user scope decision, not gaps): **AC6** per-item discount badge — the same unautomatable
server/IP-side `is_location_offer` mechanism as §10/§12; **AC7/AC8** the 15% rental+non-rental combination
discount and its removal — deterministic and automatable, left for a follow-up pass that would extend the same
`CartPage`.

## 15. Checkout sign-in step implementation findings (2026-07-07)

Implemented §5.6 **AC1 only** (`tests/ui/checkout-signin.spec.ts`, new
`src/ui/pages/checkout-signin.page.ts` registered in `src/ui/fixtures/page-object.fixture.ts`): a guest
proceeding from the cart (`proceed-1`) is shown the login form. The step is reached by
composing existing page objects (`HomePage` → `ProductDetailPage.addToCartAndAwaitBadge`
→ `CartPage.proceedToCheckout`); the product is chosen dynamically by card index (§3, §9).
Like `ProductDetailPage`, `CheckoutSigninPage.PAGE_URL` is only `/checkout` to satisfy
`BasePage` — `goto()` lands on the cart step, not the sign-in step, so the step is always
entered via the cart proceed.

**Discrepancy to account for (docs/plan vs. actual):**

- **The sign-in step is a tabbed panel, not a bare login form.** §5.6 AC1 says the guest
  is "shown a login form (email, password, submit)"; production actually renders a
  `role="tablist"` with two `role="tab"` links — **"Sign in"** (active by default,
  `a.nav-link.active`, `href="#signin-tab"`) and **"Continue as Guest"**. The active
  "Sign in" tab holds the login form. Neither tab has a `data-test`/id (located via
  `getByRole('tab', {name})`). The "Continue as Guest" tab is the wizard-only marker
  (absent on `/auth/login`) used to prove the test is on the checkout step, not the
  standalone login page.
- The login form reuses the same ids as `/auth/login` — `[data-test="email"]`,
  `[data-test="password"]`, `[data-test="login-submit"]` — with the submit button
  **labelled "Login"** and a `<h3>Login</h3>` heading (no data-test). The wizard step
  indicator marks the active step with `<li class="current">` (no data-test/role).

Deferred (per user scope decision, not gaps): **AC2** TOTP 6-digit prompt (needs a new
`otplib` dependency + a full 2FA-setup flow that belongs to the not-yet-implemented
§5.13), **AC3** valid credentials → billing address step, **AC4** already-logged-in copy
(_"Hello {First} {Last}, you are already logged in..."_ per §9). The new
`CheckoutSigninPage` is the natural place to extend for all three.

## 16. Checkout billing address implementation findings (2026-07-07)

Implemented **all 5 ACs** of §5.7 (`tests/ui/checkout-address.spec.ts`, new
`src/ui/pages/checkout-address.page.ts` registered in `src/ui/fixtures/page-object.fixture.ts`). `CheckoutSigninPage`
was extended with the guest-continuation and logged-in proceed methods (the guest details form
lives on the sign-in step). The billing step is reached by composing existing page objects
(`HomePage` → `ProductDetailPage.addToCartAndAwaitBadge` → `CartPage.proceedToCheckout` →
`CheckoutSigninPage`); the product is chosen dynamically by card index (§3, §9). Like
`CheckoutSigninPage`, `CheckoutAddressPage.PAGE_URL` is only `/checkout` to satisfy `BasePage` —
`goto()` lands on the cart step, so billing is always entered through the wizard.

**Wizard navigation to the billing step (confirmed live):**

- Cart `proceed-1` → **Sign in** step.
- **Guest path:** the "Continue as Guest" tab is **not** a one-click path to billing — it reveals
  an intermediate details form (`guest-email` / `guest-first-name` / `guest-last-name` +
  `guest-submit`), after which a distinct **`proceed-2-guest`** button advances to Billing Address.
- **Logged-in path:** the sign-in step shows the "already logged in" panel (§9) with a
  **`proceed-2`** button that advances straight to Billing Address.
- Billing → Payment button is **`proceed-3`** ("Proceed to checkout").

**Billing form (confirmed live):** fields are `country` (`<select>`; empty default option value
`""`, option value = ISO code e.g. `DE`, text = full name e.g. "Germany"), `postal_code`,
`house_number`, `street`, `city`, `state`. All required.

**Discrepancies to account for (docs/plan vs. actual):**

- **AC5 — billing IS pre-filled from account data for a logged-in user (behavior changed).** An
  earlier pass found the billing fields rendered empty; production now **pre-fills** the billing
  text fields (street / city / state / postcode / house*number) from the logged-in account. The one
  exception is the **Country** `<select>`: it only pre-fills when the account's stored country is an
  ISO code matching an option `value` (e.g. `DE`). A user registered via the **API** stores the
  country \_name* (`"Germany"`), which matches no option value, so the dropdown alone stays empty
  while the free-text fields populate. The `@logged` AC5 test pins this: it inherits the
  storageState session (a user registered via the API with a full address; see
  `tests/setup/login.setup.ts`), reaches billing via the "already logged in" panel + `proceed-2`,
  and asserts the text fields are populated while the country select is empty. (The **guest** path
  still starts empty and offers the postal-code lookup — _"Enter country, postal code and house
  number. We will fill in the rest automatically."_ — which auto-fills street/city/state from an
  external geocoder; those values are nondeterministic, so the guest tests set them explicitly.)
- **No native `maxlength` attributes and no user-visible validation error text.** Max lengths are
  enforced by Angular validators surfaced **only** as the field's `ng-invalid` class plus the
  disabled `proceed-3` button. Verified boundaries: `street` ≤70, `city` ≤40, `state` ≤40,
  `postal_code` ≤10, `house_number` ≤10 (house number's max is undocumented but real). AC1/AC3
  therefore assert field presence + the `ng-invalid`/`proceed-3`-disabled behavior rather than a
  `maxlength` attribute or an error message.

Not deferred — §5.7 is fully covered. AC3 is parametrized per length-limited text field (Country
excluded, being a dropdown, §9); AC5 documents the pre-fill discrepancy above.

## 17. Checkout payment step implementation findings (2026-07-08)

Implemented the **validation subset** of §5.8 (`tests/ui/checkout-payment.spec.ts`, new
`src/ui/pages/checkout-payment.page.ts` registered in `src/ui/fixtures/page-object.fixture.ts`):
the payment-method dropdown (AC1), per-method field validation (AC2 bank transfer, AC3/AC4 credit
card, AC5 buy-now-pay-later, AC6 gift card, AC7 cash on delivery), and form-reset-on-switch (AC8).
The payment step is reached as a **guest** via a new `reachPaymentAsGuest` action fixture
(`cart-action.fixture.ts`: add to cart → cart → Continue as Guest → fill the fixed valid billing
address → `proceed-3`), so no auth or seeded account is touched; products are chosen dynamically
(§3, §9). The step is one Angular reactive form — a `[data-test="payment-method"]` `<select>`
reveals a method sub-form (each behind an `@if`, so switching method removes the previous method's
inputs from the DOM), and the "Confirm" button (`[data-test="finish"]`) is `[disabled]` until the
whole form is valid. Errors are visible `.alert.alert-danger` text shown once a control is
dirty/touched.

**Locators were first drafted from source, then verified live.** For much of the session production
(and general internet) was unreachable from the run environment, so the initial draft used the
**pinned v5.0 source** (`../practice-software-testing/sprint5/UI/src/app/checkout/payment/` +
`assets/i18n/en.json`) that `test_plan.md` names as the behavior source of truth. Connectivity
returned before finishing, so **all 17 tests were then executed live** (all pass serially) — which
caught two spots where **production has drifted ahead of the pinned source** (see discrepancies).
Lesson: the pinned source is a good first draft but is not always in sync with deployed prod;
live-verify before trusting error copy in particular.

**Confirmed contract (live):**

- Method `<select data-test="payment-method">` options (value → label): `bank-transfer`→"Bank
  Transfer", `cash-on-delivery`→"Cash on Delivery", `credit-card`→"Credit Card",
  `buy-now-pay-later`→"Buy Now Pay Later", `gift-card`→"Gift Card", plus a disabled placeholder
  "Choose your payment method". `payment_method` is required, so Confirm starts disabled.
- Field `data-test` ids: `bank_name`/`account_name`/`account_number`;
  `credit_card_number`/`expiration_date`/`cvv`/`card_holder_name`; `gift_card_number`/
  `validation_code`; `monthly_installments` (a `<select>`, options `3`/`6`/`9`/`12` +
  "Choose your monthly installments" placeholder).
- Validators: bank name letters/spaces `/^[a-zA-Z ]+$/`, account name `/^[a-zA-Z0-9 .'-]+$/`,
  account number digits `/^\d+$/`; card number `/^\d{4}-\d{4}-\d{4}-\d{4}$/`, cvv `/^\d{3,4}$/`, card
  holder letters/spaces `/^[a-zA-Z ]+$/`, expiration custom `MM/YYYY`-must-be-future. Error copy
  asserted verbatim where it renders (e.g. "Bank name can only contain letters and spaces.",
  "Expiration date must be in the future.").

**Discrepancies to account for (docs/source vs. actual production):**

- **Credit Card fields are pattern-only, NOT required** (unlike Bank Transfer / Gift Card / BNPL,
  which are required). The expiration validator also returns valid on empty. So a Credit Card form
  left **entirely blank is valid** and Confirm is **enabled** — AC3 is asserted as "malformed values
  are rejected", not as required-ness, and the CC happy-path test proves Confirm toggles disabled↔
  enabled via a malformed→valid card number rather than empty→filled.
- **The card-holder-name field shows NO error message.** A pattern violation turns the input
  `ng-invalid` and disables Confirm, but the `.alert-danger` box renders **empty** — the template
  only prints text for a `required` error, and the field is pattern-only. So its negative test
  asserts `ng-invalid` + Confirm disabled, not visible text (unlike the other CC fields, which do
  render their message).
- **Gift Card rules on prod are stricter than the source/docs and have new copy.** Gift card number
  must be **exactly 16** letters/digits — "Please enter a valid gift card number: exactly 16 letters
  and/or digits." — and validation code **exactly 4** (the input also has `maxlength=4`) — "Please
  enter a valid validation code: exactly 4 letters and/or digits." (the pinned source still had the
  older `/^[a-zA-Z0-9]+$/` + "must be alphanumeric." copy). Because of `maxlength=4`, a
  negative validation-code test must use a 4-char value with a disallowed character (a longer string
  is silently truncated to a valid one).

**Known flake (environmental, not a logic defect):** each test runs the full guest checkout to reach
payment (home → product → add → cart → guest → billing incl. a postcode-lookup network wait →
payment). Under `fullyParallel` at the auto worker count, against the slow shared public server, an
occasional test trips the 60s timeout (a _different_ test each run; the app also spams a
`cart_items`-undefined console error on the payment page). All 17 pass reliably **serially**
(`--workers=1`, ~1.6m) and typically 16–17/17 in parallel. No global config was changed (out of
scope); if CI proves flaky, options are a higher `timeout`/`retries` or fewer workers for this file.

Deferred (per user scope decision, not a gap): the "successful order → confirmation with invoice
number, cart cleared" AC (one happy path per method). It places real orders that write invoices to
shared production data; left for a follow-up pass (would also seed §5.9 e2e and §5.17 invoices). The
`reachPaymentAsGuest` fixture and `CheckoutPaymentPage` are the natural extension points. **Update
2026-07-08 (§18):** the successful-order AC is now covered for Cash on Delivery by the §5.9 e2e specs
(guest + logged-in); the per-payment-method happy paths (Credit Card, etc.) remain deferred here.

## 18. End-to-end checkout implementation findings (2026-07-08)

Implemented both ACs of §5.9 (`tests/ui/checkout-e2e.spec.ts`) — the critical-path smoke test that
places a **real order** end to end and asserts the confirmation + emptied cart. This is the
order-placement piece §17 deferred; it extends the same `CheckoutPaymentPage` and `reachPaymentAsGuest`
fixture. Cash on Delivery (simulated payment, §2) is the payment method for both ACs. Data-safety (§3):
the guest order is owned by throwaway faker identity, the logged-in order by the disposable
API-registered `@logged` user — never a shared seeded account. Products chosen dynamically (§3, §9). New
`CheckoutPaymentPage.confirmOrder()` + `orderConfirmation`/`paymentSuccessMessage` locators;
`CheckoutAddressPage.fillAddressViaLookup()`.

**Confirmed contract (live, playwright-cli):**

- **"Confirm" is a two-click sequence.** First `[data-test="finish"]` click → `POST /payment/check`
  (200) → `[data-test="payment-success-message"]` ("Payment was successful") appears, Confirm stays;
  second `finish` click → the invoice POST → confirmation. `confirmOrder()` models this (click →
  waitFor success message → click → waitFor confirmation).
- **Confirmation** is `<div id="order-confirmation">` (no `data-test`, only the id): _"Thanks for your
  order! Your invoice number is INV-2026000004."_ — invoice number format `INV-` + digits (asserted
  `/Your invoice number is INV-\d+/`). Once it renders, the nav **cart badge (`cart-quantity`) and the
  `nav-cart` link disappear** — the cart-emptied signal the specs assert.

**Discrepancies / gotchas to account for (beyond docs):**

- **The invoice API cross-validates city ↔ country.** `POST /invoices/guest` (guest) returns **422**
  _"The billing_country does not match the entered address. The city does not belong to the selected
  country."_ for a manually-typed city that doesn't match the country — even a real one (`Berlin`/`DE`
  failed). So `makeValidAddress()`'s `Berlin/Bavaria` overwrite (used by `reachPaymentAsGuest` only to
  _reach_ payment for the §5.8 validation tests, which never place an order) is **not orderable**. The
  e2e flow instead completes billing via the **postcode lookup** and leaves the geocoded
  street/city/state (DE / 12345 / 42 → Schüttegasse / Lampertheim / Sachsen-Anhalt), which is internally
  consistent. New `CheckoutAddressPage.fillAddressViaLookup(country, postalCode, houseNumber)` does this
  (existing `fillAddress` overwrite kept for the §5.7 boundary tests). `reachPaymentAsGuest` was switched
  to `fillAddressViaLookup` so its reached state is orderable — the §5.8 payment spec was re-run green.
- **AC5 pre-fill re-confirmed (§16).** The logged-in billing pre-fills the text fields with the country
  `<select>` empty; the §5.9 AC2 test asserts the pre-fill first (the AC), then re-runs the lookup so the
  submitted address is orderable, then places the order. Caveat for future manual spikes: a
  **playwright-cli** manual login lands in a half-authenticated SPA state (token in localStorage but
  Angular treats it as a guest → empty billing + `/invoices/guest` 404). This is a cli artifact; the real
  `storageState`/`@logged` session hydrates auth correctly, so drive logged-in order tests under the
  `@logged` project, not via ad-hoc cli login.

Not deferred — §5.9 is fully covered (both ACs, Cash on Delivery, tagged `@smoke @checkout @e2e`; AC2
also `@logged`).

## 19. Registration validation implementation findings (2026-07-08)

Extended `tests/ui/register.spec.ts` (kept the existing happy-path register+login = §5.10 AC5) with the
remaining ACs the user scoped: **AC1** (required fields), **AC6** (email format), **AC4** (duplicate
email), **AC2** (password requirements list). **AC3** (strength meter) is present but pinned as a bug (see
below). Behaviour and exact copy were verified against the live site and cross-checked against the
sprint5 source (`auth/register/register.component.{ts,html}`, `shared/password-input/`,
`_helpers/password.validators.ts`, `assets/i18n/en.json`); production build footer `v2.3 | Built
2026-07-06 | Angular 20.0.5` matches that source. New `register.page.ts` locators: `fieldError(dataTest)`,
`registerError` banner, `passwordRequirements` + per-rule `<li>` locators, `strengthFill`,
`activeStrengthLabel`, and an `enterPassword()` helper. All specs tagged `@auth @register @regression`.

**Confirmed contract (live + source):**

- **The whole form is `updateOn: 'blur'`** (register.component.ts). Validators, the inline `*-error`
  blocks and the password requirements-list highlighting only recompute on blur — a plain `.fill()`
  leaves the control pristine. `enterPassword()` fills **then blurs**.
- **All inline errors are submit-gated** — every block is `@if (f['x'].invalid && submitted)` and
  `submitted` is only set in `onSubmit()`. There is **no live per-field validation before the first
  submit**. AC1 asserts each `data-test="<field>-error"` after clicking submit on the empty form. Exact
  required copy is env-independent (en.json): First/Last name / Date of Birth / Country / Postcode / House
  number / Street / City / State / "Phone is required." / Email / Password "… is required". `dob-error`
  also carries the hardcoded "Please enter a valid date in YYYY-MM-DD format."
- **AC2 requirements list** = 4 `<li>` in `#passwordHelp`, each `[class.text-success]` bound to a password
  validator: minLength(8), mixedCase (needs **both** upper+lower), hasNumber, hasSymbol. Verified: length
  gates independently of the character-class rules (`aB1!` → three green, length red; `aaaaaaaa` → only
  length green; `Aaaaaaa1!` → all four).
- **AC6 email format** = pattern validator; error text **"Email format is invalid"** on submit. Malformed
  cases (`plainaddress`, `foo@`, `@example.com`) show it; valid edge cases (`a@b.co`,
  `first.last+tag@sub.example.com`) don't render the block. The format specs fill **only** the email, so
  the form stays invalid and never hits the API — no account is created.

**Discrepancies to account for (docs/source vs. actual production):**

- **AC3 strength meter is broken in production.** `passwordStrength()` implements the intended 5-criteria
  → Weak 20% / Moderate 40% / Strong 60% / Very Strong 80% / Excellent 100% mapping, but the template
  wires it as `(input)="passwordStrengthIndicator = passwordStrength(f['password'].value)"` — updating on
  the _input_ event while reading the control value, which (because the form is `updateOn:'blur'`) is
  still the stale pre-blur value at that instant. Net effect: the indicator always evaluates the empty
  string → `'Invalid'` → bar width `0%`, no `.strength-labels span.active`, **even for a fully valid
  password**. The spec `password strength meter stays empty (known production bug)` pins this actual
  behaviour rather than the documented mapping (same convention as the §17 card-holder finding). AC3's
  documented behaviour cannot be asserted until the app is fixed.
- **Duplicate-email copy differs from both the AC and the source.** §5.10 AC4 and the source
  (`err.error === 'Duplicate Entry'` → "Email is already in use.") are stale: production returns the API
  field error verbatim, so the `data-test="register-error"` banner reads **"A customer with this email
  address already exists."** The spec asserts the actual production string.
- **The requirements list is always visible, not focus-gated.** AC2's "shown on focus" is inaccurate —
  `#passwordHelp` renders unconditionally; only the per-rule highlighting is dynamic.

Not deferred — §5.10 is fully covered (AC1/AC2/AC4/AC5/AC6 asserted; AC3 pinned as a documented bug).

## 20. Login account lockout implementation findings (2026-07-09)

Implemented the §5.11 account-lockout bullet (`tests/ui/login.spec.ts`, `src/ui/pages/login.page.ts`).
All behaviour below was confirmed live (playwright-cli) against two throwaway API-registered users
before any assertion was written — no shared/seeded account was touched.

**Confirmed live:**

- **Threshold is exactly 3.** Attempts 1-3 render `"Invalid email or password"`; the 4th and every
  subsequent attempt render the lockout message. Matches the documented AC.
- **Exact lockout copy:** `"Account locked, too many failed attempts. Please contact the administrator."`
  (the docs' `"Account locked, too many failed attempts..."` is a truncation, not a mismatch).
- **No dedicated locator.** The lockout message reuses the same `[data-test="login-error"]` element as
  the invalid-credentials error, so no new page-object locator was needed.
- **The lock is on the account, not the counter.** Supplying the _correct_ password on the 4th attempt
  is still rejected with the lockout message and leaves the user on `/auth/login`. The spec deliberately
  spends its locking attempt on the valid password to assert this, rather than a 4th wrong one.
- **The lock is account-scoped, not IP- or session-scoped.** A second, unlocked user logged in
  successfully from the same browser and IP immediately after locking the first. This is what makes the
  test safe to run under `fullyParallel: true` alongside the other login specs — worth re-verifying if
  the app ever adds rate limiting.
- Lockout did not expire within the exploration session; the spec does not depend on the lock persisting
  beyond the single test, so a future expiry window would not break it.

**Discrepancy to account for (docs vs. actual production):**

- **The app no longer uses hash routing.** `test_plan.md`/`CLAUDE.md` and the app docs reference
  `https://practicesoftwaretesting.com/#/...`, but production serves path routes (`/auth/login`), and
  navigating to `/#/auth/login` silently lands on the **home page** with no redirect. `PAGE_URLS` already
  encodes the correct path-style routes, so no code change is needed — but any future manual exploration
  or hand-written URL must drop the `#/`, or it will silently explore the wrong page.

**Synchronization note:** repeated-attempt flows cannot gate on `loginError` becoming _visible_ — it is
already visible from the prior attempt, and only its text repaints when the response lands. `LoginPage`
therefore exposes `loginAndAwaitResponse()`/`failLoginAttempts()`, which await the `POST /users/login`
response per attempt (same pattern as the `product-list.page.ts` and `checkout-address.page.ts` waits).

Deferred (per user scope decision, not a gap): the remaining §5.11 bullets — admin redirect to
`/admin/dashboard`, admin lockout exemption, disabled account, TOTP-enabled login, and the Google
sign-in popup.

## 21. Forgot password implementation findings (2026-07-09)

Implemented all four ACs of §5.12 (`tests/ui/forgot-password.spec.ts`, new
`src/ui/pages/forgot-password.page.ts` registered in `src/ui/fixtures/page-object.fixture.ts`; `LoginPage`
gained `forgotPasswordLink` + `openForgotPassword()`, and `PAGE_URLS.FORGOT_PASSWORD` was added). Locators and
copy were first drafted from the pinned v5.0 source, then **every one was verified live** (playwright-cli +
direct API calls) against the deployed build `v2.3 | Built 2026-07-06` — which caught one drift the source
would have gotten wrong. See `.ai-docs/forgot-password-plan.md`.

**🚨 The endpoint is destructive — this is the most important thing on this page.** `POST
/users/forgot-password` does **not** mail a reset link. `UserService::resetPassword()` overwrites the account's
password with the hardcoded **`welcome02`** on the spot, with no token and no confirmation step. Verified
end to end on production against a throwaway user: login with the original password → `200`; submit that email
through the form; login with the original password → **`401`**, login with `welcome02` → **`200`**. Consequences:

- The AC3 test **must** use a disposable API-registered user. Pointing this form at `testUser1` (the env-backed
  `USER_EMAIL`) would silently reset it and break `login.spec.ts` and `tests/setup/login.setup.ts` for every
  later run and every other engineer; pointing it at `customer@`/`admin@` is forbidden outright (§3).
- §5.12 AC3's phrasing ("success/confirmation message") understates what happened — the password is already
  changed by the time the banner renders.
- Anyone hand-exploring this page should assume any email they type is burned.

**Confirmed contract (live):**

- Route `/auth/forgot-password`; reached from `/auth/login` via `[data-test="forgot-password-link"]`
  ("Forgot your Password?"). `<h1>` and document title are both "Forgot Password".
- Field ids: `[data-test="forgot-password-form"]`, `[data-test="email"]`, `[data-test="email-error"]`,
  `[data-test="forgot-password-submit"]` (value "Set New Password").
- **Validation is submit-gated**, not blur-gated (unlike register's `updateOn:'blur'`, §19): nothing validates
  until the submit is clicked. An invalid email never reaches the API (no request fires) — so AC2's
  "rejected client-side" is literally true.
- Both server banners are `role="alert"` with **no `data-test`** — distinguished only by `.alert-success` /
  `.alert-danger` (located as `getByRole('alert').and(locator('.alert-…'))`). Both are **detached from the DOM
  ~3s** after rendering (`hideAlert` via a 3000 ms `setTimeout` behind an `@if`) — there is no CSS fade, so
  assert `toBeHidden()`, not opacity. Because they vanish, the specs await the `POST /users/forgot-password`
  response before asserting rather than racing the slow public API (the `loginAndAwaitResponse` pattern, §20).

**Discrepancies to account for (docs/source vs. actual production):**

- **AC2's format error renders an EMPTY box (production bug).** The email control is built with
  `Validators.pattern(...)`, which populates `errors.pattern` — but the template only prints copy for
  `errors.required` and `errors['email']` (the key `Validators.email` would set). So a malformed-but-non-empty
  address makes `[data-test="email-error"]` **visible with no text** (`innerHTML` is just `<!----><!---->`).
  The **empty** field is the only case whose message renders ("Email is required"). The spec pins both halves,
  the same convention as the §17 card-holder-name and §19 strength-meter findings.
- **AC3's success message renders a raw i18n key (production bug).** The template reads
  `t('page.forgot-password.confirm')` (singular `page.`) while `en.json` defines
  `pages.forgot-password.confirm`. There is no top-level `page` key, so transloco falls back to echoing the
  key: the banner literally reads **`page.forgot-password.confirm`**. The intended copy is "Your password is
  **successfully** updated!". The spec asserts the actual string.
- **AC4's error copy is real and deterministic, but is _not_ the source's.** Unknown email → **422**
  `{"message":"The selected email is invalid."}`, surfaced verbatim in the `.alert-danger`. Confirmed 5/5
  consecutive runs. Note there is **no anti-enumeration** here: the form distinguishes registered from
  unregistered addresses, which is itself a security smell worth reporting to the team alongside the
  no-token reset.
- **Prod carries a generic fallback string absent from the pinned source.** One early probe (while the API was
  slow, ~2.5 s) rendered **"Something went wrong "** instead of the 422 copy; that string exists nowhere in
  `sprint5/`. It did not reproduce across 5 further runs, so it appears to be the handler for a non-422
  response. Awaiting the POST response (as the spec does) keeps a transient 5xx surfacing as an honest failure
  rather than a confusing copy mismatch.

Not deferred — §5.12 is fully covered (AC1–AC4; AC2 and AC3 pinned to the two production bugs above).

## 22. Two-Factor Authentication setup implementation findings (2026-07-09)

Implemented §5.13 (`tests/ui/totp-setup.spec.ts`, new `src/ui/pages/profile.page.ts` +
`src/ui/utils/totp.util.ts`, `PAGE_URLS.PROFILE = /account/profile`, page object registered in
`src/ui/fixtures/page-object.fixture.ts`). New devDependency: **`otplib` v13**. Locators/copy were drafted
from the pinned v5.0 source, then every one verified live. See `.ai-docs/totp-setup-plan.md`.

**🚨 `testUser1` IS the shared seeded `customer@practicesoftwaretesting.com`** (it is the `.env` `USER_EMAIL`;
`CLAUDE.md` says the env account "must be a real seeded account"). This is easy to miss and makes it trivially
easy to write a "freshly-registered user" test that actually mutates a shared account. AC1–AC3 enable TOTP —
a permanent mutation — so each registers its **own** throwaway user via the API and logs in inline. AC4 is the
one sanctioned use of `testUser1`: a pure read/negative denial check that submits no code.

They also deliberately do **not** run under the `@logged` project: `tests/setup/login.setup.ts` registers one
user per run and shares that session across every `@logged` spec, so enabling TOTP on it could leak into
`checkout-e2e` AC2.

**Confirmed contract (live):**

- The section is on **`/account/profile`** (auth-guarded). Loading the page POSTs `/totp/setup`, which for an
  eligible account **mints and persists a NEW secret on every visit** — so the secret must be read from the DOM
  immediately before use, never cached across navigations (same spirit as §9's live-product-ID rule).
- `data-test` ids: `totp-secret` (the key, inside `<strong>`), `totp-code`, `verify-totp`, `totp-error`,
  `totp-success`. The QR has **no `data-test`** — it is an Angular `<qrcode>` component rendering a `<canvas>`.
- Secret is **16 base32 chars** (`/^[A-Z2-7]{16}$/`), and the `otpauth://` URI pins **SHA1 / 6 digits / 30s**.
  The API's `verifyKey()` uses `pragmarx/google2fa`'s default **window = 1**, giving ±1 time step (±30s) of
  clock-skew tolerance. AC2 passed 3/3 on repeat, so no extra retry handling was added.
- Exact copy: success `Success: TOTP verified and enabled successfully.`; invalid
  `Error: Invalid TOTP code. Please try again.`; denial
  `Error: Access denied: If you want to configure TOTP, please create your own account.`

**Discrepancies to account for (docs/source vs. actual production):**

- **The heading is "Set up Two-Factor Authentication", not §5.13's "Setup two factor authentication".**
- **Both banners are prefixed by the template** — `<strong>Error:</strong>` / `<strong>Success:</strong>` — so
  the rendered text is `Error: …` / `Success: …`, not the bare message the source constant holds.
- **An invalid code tears down the whole setup UI (production bug).** The template gates the QR, secret and
  verify form behind `@if (!profile?.totp_enabled && !errorMessage)`, so setting `errorMessage` removes them.
  A user who mistypes their code once cannot retry without reloading the page. AC3 pins this, and proves "TOTP
  not enabled" by reloading and asserting the setup section returns rather than "already enabled".
- **After enabling, the profile shows a spurious error banner (production bug).** A reload re-POSTs
  `/totp/setup`, which now returns **400** ("TOTP already enabled"); the component only special-cases 403, so
  the page renders _"Two-Factor Authentication already enabled."_ **and** _"Error: Failed to load TOTP setup
  details."_ side by side. Not asserted (outside the ACs), but recorded.
- **`data-test="totp-secret"` renders before its content.** The `<p>` is in the DOM as soon as the `@if` passes
  — before the `/totp/setup` response resolves — so it is briefly empty. A naive `innerText()` read returns
  `""`. `ProfilePage.readTotpSecret()` therefore waits on a `.filter({hasText: /^[A-Z2-7]{16}$/})` narrowing
  of the same locator before reading (the `waitFor`-not-`expect()` sync pattern from `CODING_STANDARDS.md`).

**Tooling note — `otplib` v13 rejects the app's secret out of the box.** v13 is a rewrite: there is no
`authenticator` singleton (the API is now `generateSync({secret})`), and it enforces a **128-bit minimum
secret**. google2fa mints 16 base32 chars = **80 bits (10 bytes)**, so generation throws `SecretTooShortError`.
`src/ui/utils/totp.util.ts` relaxes exactly that one bound via
`createGuardrails({ MIN_SECRET_BYTES: 10 })`; all other parameters are otplib defaults and already match the
server. Verified end to end against prod: generated code → `POST /totp/verify` → `200`.

**AC4 gap — `admin@` cannot be automated.** No admin password exists in `.env`, `.env-template`, or the test
data, and guessing one risks permanently locking a shared admin account (§20: lockout at 3 failed attempts).
`TOTPService::setupTOTP()` denies via a single hardcoded allowlist
(`['customer@practicesoftwaretesting.com', 'admin@practicesoftwaretesting.com']` → 403), so both accounts take
the **identical branch** and the `customer@` test exercises the whole rule. Covering `admin@` separately would
add no behavioural coverage; it stays manual until admin credentials are provisioned (cf. §8 open question 2).

Deferred (not gaps): TOTP **login** (§5.11's "TOTP-enabled account → 6-digit prompt") and §5.6 AC2's checkout
TOTP prompt. Both are now unblocked — `generateTotpCode()` plus a user enabled via this flow is all they need.
**Update 2026-07-09 (§23):** TOTP login is now implemented; §5.6 AC2 remains deferred.

## 23. TOTP-enabled login implementation findings (2026-07-09)

Implemented the §5.11 TOTP-login bullet (three tests appended to `tests/ui/login.spec.ts`). This was the item
§20 deferred pending "a new `otplib` dependency + a full 2FA-setup flow"; §22 supplied both. New API-layer
pieces: `src/api/requests/totp.request.ts`, `src/api/models/totp.api.model.ts`,
`src/api/factories/totp-user.api.factory.ts` (`registerUserWithTotpEnabled()`), plus `totpSetupUrl`/
`totpVerifyUrl` in `api.util.ts`. `LoginPage` gained `totpCodeInput`/`verifyTotpButton`/`submitTotpCode()`.

**Precondition is built entirely over the API** — register → login → `/totp/setup` → `/totp/verify` — so these
specs fail only on the behaviour they assert, not on the enrolment UI. Each test enrols its **own** disposable
user: enabling TOTP is a permanent mutation, and `testUser1` is the shared seeded `customer@` (§22), which the
API refuses anyway (403). `TotpRequest` is deliberately **not** in `request-object.fixture.ts` — every call
needs a per-user Bearer header, so a header-less injected instance would be useless; the factory constructs it,
exactly as `getAuthorizationHeader()` already does with `LoginRequest`.

**Confirmed contract (live):**

- Login on a TOTP-enabled account returns **200** `{ message: "TOTP required", requires_totp: true,
access_token }`. The app stays on `/auth/login` and swaps the form in place — `@if (!showTotpInput)` wraps the
  credentials form, so `[data-test="email"]` and `[data-test="login-submit"]` drop to **count 0**. That absence
  is the cleanest "prompt is shown" signal.
- Prompt ids: `[data-test="totp-code"]` (label "TOTP Code") and `[data-test="verify-totp"]` ("Verify TOTP").
  They share names with the profile page's setup form (§22) but are a different component on a different route.
- **The second leg reuses `POST /users/login`**, not `/totp/verify`: body `{ totp, access_token }`. Valid →
  `200 { access_token }` → `/account`. Invalid → `401 { "error": "Invalid TOTP" }`.
- The error renders in the **shared** `[data-test="login-error"]` element — the same one used for invalid
  credentials and for lockout (§20). It lives outside both `@if` branches. No new locator was needed.
- Copy is exactly **"Invalid TOTP"**, bare — no `Error:` prefix, unlike the profile page's banners (§22). The
  plan's wording was accurate here.

**Security-relevant checks (both clean, worth recording):**

- **The provisional token is correctly scoped.** `GET /users/me` using the `access_token` handed out alongside
  `requires_totp: true` returns **401 "Unauthorized token usage"**. Issuing a token before the second factor is
  therefore not an auth bypass — the token only works as the `access_token` argument of the TOTP leg.
- **Failed TOTP attempts do NOT feed the §20 lockout counter.** Four consecutive `000000` submissions left the
  account able to log in normally afterwards. So the invalid-code test is safe to run repeatedly and needs no
  special handling. (It still gets its own disposable user, as all three do.)

**Behavioural contrast worth knowing:** the login prompt **survives an invalid code** — it stays rendered and is
retryable. The profile page's TOTP setup form does the opposite: §22's bug tears the whole form down on the
first error. Same feature, two components, opposite error handling.

**Time sensitivity:** codes rotate every 30s and are derived immediately before submission; the API's
`verifyKey()` window = 1 gives ±30s of skew tolerance. The valid-code test passed 3/3 under `--repeat-each=3`,
so no retry handling was added.

Deferred (not a gap): §5.6 AC2 (the checkout-wizard TOTP prompt) — `registerUserWithTotpEnabled()` +
`generateTotpCode()` now make it straightforward, and `CheckoutSigninPage` is the extension point.

## 24. Customer profile implementation findings (2026-07-09)

Implemented **all 4 ACs** of §5.14 (`tests/ui/profile.spec.ts`). The existing `src/ui/pages/profile.page.ts` —
which until now modelled only the TOTP setup section (§22) — was extended with the profile form; no new page
object and therefore no fixture change. Added `ProfileDetails`/`RequiredProfileField` to
`src/ui/models/user.model.ts`, `prepareRandomProfileDetails()` to `src/ui/factories/user.factory.ts`, and
`REQUIRED_PROFILE_FIELD_ERRORS` to `src/ui/test-data/user.data.ts`. Tagged `@auth @profile @regression`
(`@profile` is new). See `.ai-docs/profile-plan.md`.

**Data safety (§3):** all four ACs register their own throwaway user via `registerUserWithApi` and log in
inline — AC2/AC4 because they mutate the account, AC1/AC3 because they assert the form shows that user's own
registered data. None uses `testUser1` (which _is_ the shared seeded `customer@` account) and none rides the
`@logged` storageState session, whose single shared user's stored address `checkout-address.spec.ts` §5.7 AC5
asserts on.

**Confirmed page contract (live).** `/account/profile` (`<title>` "Profile - …") stacks three sections:
`<h1 data-test="page-title">Profile</h1>` + the profile form, `<h2>Password</h2>` + the change-password form
(§5.15, not yet automated), and `<h2>Set up Two-Factor Authentication</h2>` (§22). Profile fields are all
`input[type=text]`: `first-name`, `last-name`, `email`, `phone`, `street`, `postal_code`, `city`, `state`,
`country`; submit is `[data-test="update-profile-submit"]`; save is a `PUT /users/{id}`.

**Discrepancies to account for (docs/plan vs. actual):**

- **Only 5 of the 8 editable fields are required.** Blanking `phone`, `postal_code` or `state` saves
  successfully. §5.14's blanket "required-field validation" holds only for first name, last name, street, city
  and country, so the AC4 test is parameterized over exactly those (`REQUIRED_PROFILE_FIELD_ERRORS`).
- **Validation is server-side, and the error copy leaks the API's payload paths.** Unlike the billing step
  (§16), `update-profile-submit` **stays enabled** with a blanked field and the `PUT` **is** fired; the API's
  422 messages then render in a single `.alert.alert-danger` inside the form (newline-joined when several
  fields are blank), and the offending input turns `ng-invalid`. The messages use dotted payload paths, not the
  form's own labels: `The first name field is required.`, `The last name field is required.`,
  `The address.street field is required.`, `The address.city field is required.`,
  `The address.country field is required.`
- **`country` is a free-text `<input>` on this form**, not the ISO-code `<select>` the billing step uses (§9,
  §16) — so profile updates can set any country string, and the §16 "country select won't pre-fill for an
  API-registered user" problem does not apply here.
- **`email` is `readonly`, not `disabled`** — it stays focusable/enabled and its value posts. AC3 asserts
  `not.toBeEditable()` **and** `toBeEnabled()` to pin the distinction.
- **`dob` and `house_number` are absent from the profile form** even though registration collects them (and
  §16 found `house_number` on the billing step). §5.14's field list is accurate as written.
- **The success message is an inline alert, not an ngx-toastr toast** as elsewhere in the app (§12, §14):
  `<div class="alert alert-success mt-3">Your profile is successfully updated!</div>`, rendered **inside** the
  profile `<form>`. It is **detached from the DOM**, not merely hidden, after a measured **5.4s** — the
  documented "~5s fade" holds, but assertions must use `toHaveCount(0)` rather than `toBeHidden()`. Because the
  sibling change-password form renders its own `.alert-*` banners, both alert locators are scoped to the
  profile form (`page.locator('form').filter({ has: updateProfileButton })`).

**Synchronization hazard worth knowing (bit us during exploration).** The form is populated by an async
`GET /users/me` that lands _after_ navigation resolves, and Angular writes the inputs' **`value` property only**
— `getAttribute('value')` stays `null`. A `fill()` issued before that response silently gets overwritten, and an
`inputValue()` read too early returns `''`. Neither `waitFor()` nor `.filter({ hasText })` can express this gate
(inputs carry no text and no value attribute), so `ProfilePage.waitForProfileLoaded()` uses
`page.waitForFunction` on the live `value` property — a wait, not an assertion, so the no-`expect()`-in-page-
objects rule holds. Every profile test gates on it after each `goto()`.

Not deferred — §5.14 is fully covered. The change-password form (§5.15) sits in the same page object and is the
natural next extension.

## 25. Change password implementation findings (2026-07-09)

Implemented **all 6 ACs** of §5.15 (`tests/ui/change-password.spec.ts`). As §24 predicted, the form sits in the
existing `src/ui/pages/profile.page.ts` — no new page object and therefore no fixture change. Added
`PasswordStrengthLevel` to `src/ui/models/user.model.ts`, `CHANGE_PASSWORD_ERRORS` +
`PASSWORD_STRENGTH_LEVELS` to `src/ui/test-data/user.data.ts`, and extracted `prepareRandomPassword()` out of
`prepareRandomUser()` in `src/ui/factories/user.factory.ts` (behavior unchanged — the same faker pattern, now
reusable by tests that need a second policy-compliant password). Tagged `@auth @profile @regression`. See
`.ai-docs/change-password-plan.md`.

**Data safety (§3):** every AC submits a form that changes the account password, so all six register their own
throwaway user via `registerUserWithApi` and log in inline — including the read-only ACs 1–2, both for
consistency and to remove any chance of a stray submit reaching a shared account. None uses `testUser1` (which
_is_ the seeded `customer@` account) or rides the `@logged` storageState session.

**Confirmed page contract (live).** The change-password form is the middle of the three `<form>`s on
`/account/profile` (under `<h2>Password</h2>`, between the profile form and the TOTP section). It holds
`[data-test="current-password"]`, `[data-test="new-password"]`, `[data-test="new-password-confirm"]` (all
`input[type=password]`), two unnamed show/hide toggle buttons, and `[data-test="change-password-submit"]`. There
are **no field-level `[data-test="*-error"]` elements anywhere on this page** — every message is a form-level
`.alert`. Save is a `POST /users/change-password`.

**Discrepancies to account for (docs/plan vs. actual):**

- **§5.15 AC2 is wrong: the strength meter does _not_ "mirror registration behavior".** The two components share
  the markup (`.strength-bar .fill`, `.strength-labels span.active`, `#passwordHelp`) but not the behavior.
  Registration's meter is broken in production (§19 — the `(input)` handler reads a stale `updateOn:'blur'`
  value, so the bar never leaves `0%`). The change-password meter **works correctly** and updates straight off the
  typed value, so a plain `fill()` drives it and no blur helper is needed. This corroborates §9's 2026-07-04 sweep,
  which already listed the change-password indicator under "Confirmed live, matches docs". Measured scale — one
  criterion per step (non-empty → ≥8 chars → uppercase → digit → symbol), cumulative:

  | new-password value | bar width | active label |
  | ------------------ | --------- | ------------ |
  | `a`                | 20%       | Weak         |
  | `abcdefgh`         | 40%       | Moderate     |
  | `Abcdefgh`         | 60%       | Strong       |
  | `Abcdefg1`         | 80%       | Very Strong  |
  | `Abcdefg1!`        | 100%      | Excellent    |

- **§5.15 AC3's error copy is wrong.** A mismatched confirmation renders **`The new password field confirmation
does not match.`** (the API's 422 message), not the documented "Passwords do not match."
- **All three error paths are enforced server-side.** Exactly as on the profile form (§24), the submit button
  **stays enabled**, the `POST` **is** fired, and the message renders in one `.alert.alert-danger.mt-3` inside the
  password form. Mismatched confirmation → **422**; wrong current password (`Your current password does not
matches with the password.`) and new-equals-current (`New Password cannot be same as your current password.`) →
  **400**. The negative submits leave the password genuinely unchanged (verified: the original password still
  authenticated afterwards), so AC3–AC5 assert "error shown, no success banner" without re-checking credentials.
- **Both alert locators must be scoped to their own form.** The profile and change-password forms are siblings and
  each renders its own `.alert-success`/`.alert-danger`, so `passwordSuccess`/`passwordError` are scoped to
  `passwordForm` (`form` filtered by `has: changePasswordButton`), mirroring §24's `profileSuccess`/`profileError`.
- **AC6's logout is real, not cosmetic.** Success shows `Your password is successfully updated!`, then the app
  redirects to `/auth/login`: `localStorage` is emptied (the `auth-token` is gone) and a later `goto('/account')`
  bounces back to the login page. Verified over the API that the password genuinely rotates — old password → 401,
  new → 200 — so the test finishes by authenticating with the new password. Timing was measured between 5s and
  ~9.3s (1s poll granularity), so the documented "~5s" holds but the URL assertion uses a **15s** timeout. The test
  passed 3/3 under `--repeat-each=3`.

Not deferred — §5.15 is fully covered.

## 26. Favorites implementation findings (2026-07-09)

Implemented **all 3 ACs** of §5.16 (`tests/ui/favorites.spec.ts`). Added `src/ui/pages/favorites.page.ts` (registered
in `src/ui/fixtures/page-object.fixture.ts`), `PAGE_URLS.FAVORITES`, a `truncate()` helper in
`src/ui/utils/text.util.ts`, and an `addToFavoritesButton` + `addToFavoritesAndAwaitSaved()` on
`src/ui/pages/product-detail.page.ts`. Tagged `@auth @favorites @regression` (`@favorites` is a new feature tag).
See `.ai-docs/favorites-plan.md`.

**Data safety (§3):** all three ACs mutate the account's favorites, so each registers its own throwaway user via
`registerUserWithApi` and logs in inline. AC1 additionally _requires_ a guaranteed-empty list, which only a fresh
user gives. No product name/description is hard-coded — both are read off the live detail page at runtime.

**Confirmed page contract (live, cross-checked against `sprint5/UI` source).**

- Route `/account/favorites`, `<h1 data-test="page-title">Favorites</h1>`.
- Each favorite is `div.card[data-test="favorite-<favoriteId>"]` — the `data-test` id is the **favorite's** id, not
  the product's — containing `img.card-img` (`alt` = product name), `h5[data-test="product-name"]`,
  `p[data-test="product-description"]`, and `button[data-test="delete"]`.
- The empty-state message is a bare `div.col > div` carrying **no `data-test`** and no role; it is located
  structurally (`:not(.card)`), with the copy asserted in the spec.

**New finding — the favorites page is not linked from the account dashboard.** `/account` renders only Profile,
Invoices and Messages tiles. Favorites is reachable via the navbar user menu (`[data-test="nav-my-favorites"]`) or
the direct URL. Any future test that expects a dashboard tile will not find one.

**New finding — the empty-state message renders while the list is still loading.** `FavoritesComponent` initialises
`favorites: Favorite[] = []` and the template guards the message with `@if (!favorites?.length)`, so between
navigation and the `GET /favorites` response the page is indistinguishable from "this user has no favorites". A
naive AC1 assertion therefore passes before any data loads — and would pass even for a user _with_ favorites.
`FavoritesPage.gotoAndAwaitLoaded()` closes this by awaiting the `GET /favorites` response alongside `goto()`
(same shape as `ProductListPage.triggerAndAwaitProducts()`). AC1 passed 3/3 under `--repeat-each=3`.

**New finding — the card description is a real substring, not a CSS ellipsis.** The template pipes it through
`| truncate: 250`, and `TruncatePipe.transform` is
`text.length > length ? text.substring(0, length).trim() + '...' : text` (note the `.trim()` before the suffix);
`text-overflow` computes to `clip`. Verified live: a 738-char description renders at 253 chars. `truncate()` in
`src/ui/utils/text.util.ts` mirrors the pipe so the assertion is derived from the live product text and holds for
short descriptions too, where the pipe is the identity.

**Removal is a refetch, not an optimistic splice.** `deleteFavorite()` fires `DELETE /favorites/{id}` and, on
success, re-runs `loadFavorites()`. There is no confirmation dialog, no toast, and no navigation — so the page
object only clicks, and the spec's auto-retrying `toHaveCount` is what proves the list updated in place. Removing
the last favorite restores the empty-state message without a reload.

**Recorded but not asserted (still deferred, §5.3).** Clicking `[data-test="add-to-favorites"]` (visible label
"Add to favourites", British — §9) POSTs `/favorites` and raises an ngx-toastr `.toast-message` reading
**"Product added to your favorites list."**; a second click on the same product yields **"Product already in your
favorites list."** These, plus the logged-out "Unauthorized" path, belong to `product-detail.spec.ts`.

**Transient catalog-driven failures observed (resolved — see §27).** During this pass `product-detail.spec.ts` failed
3 tests (quantity stepper, manual quantity clamp, add-to-cart confirmation) on **clean `main` as well as on the
branch** — verified by re-running them from a stashed working tree, so not a regression. The cause was the shared
catalog: the first card in the default home grid was an API-mutated, out-of-stock product
(`UpdatedProduct-test_products`, description "Updated via PATCH"), which disables the cart controls those ACs drive.
Hours later the catalog had reverted (first card `Combination Pliers`, in stock) and all 9 tests passed untouched.

⚠ **The lasting lesson is a suite weakness, not a bug:** any test that reaches for `clickProductCard(0)` and then
drives _cart_ controls is hostage to whichever product another engineer has mutated to the front of the grid. §3
already forbids hard-coded catalog data; this shows that "the first card" is not neutral either. A future pass should
have those three ACs select a product by the property they need (in-stock, non-rental) rather than by position, the
way `findOutOfStockCardAcrossPages()` already does for the out-of-stock AC. Favorites are immune — an out-of-stock
product can still be favorited. **Done 2026-07-09 — see §28.**

## 27. Product-detail favorites implementation findings (2026-07-09)

Implemented the **two favorites ACs of §5.3** (3 tests) in `tests/ui/product-detail.spec.ts`, closing the gap §26
left open. Tagged `@auth @favorites @regression` (the logged-out test is `@favorites @regression` — it has no
account). See `.ai-docs/product-detail-favorites-plan.md`.

**Data safety (§3):** the two logged-in tests mutate the account's favorites, so each registers its own throwaway
user via `registerUserWithApi` and logs in inline. The logged-out test creates no account at all.

**The component has no client-side auth guard.** `DetailComponent.addToFavorites()` fires `POST /favorites`
unconditionally and picks its toast from the _server's_ reply:

| Case              | `POST /favorites`    | toast class     | copy                                                       |
| ----------------- | -------------------- | --------------- | ---------------------------------------------------------- |
| logged in, first  | **201** Created      | `toast-success` | `Product added to your favorites list.`                    |
| logged in, repeat | **409** Conflict     | `toast-error`   | `Product already in your favorites list.`                  |
| logged out        | **401** Unauthorized | `toast-error`   | `Unauthorized, can not add product to your favorite list.` |

**Doc correction.** §5.3's logged-out copy `"Unauthorized..."` is an **abbreviation, not the real string** — the app
renders `Unauthorized, can not add product to your favorite list.` (i18n key `toasts.unauthorized-favorite`). §5.3
has been corrected.

**"Does not persist anything" is a network assertion, not a UI one.** Because the POST _is_ fired while logged out,
the observable is that it comes back **401** and no success toast appears — not that no request is made.
`addToFavoritesAndAwaitSaved()` (added in §26) was therefore renamed to `addToFavoritesAndAwaitResponse()` and now
**returns the HTTP status**; its `waitForResponse` already matched any status, but the old name only described the
201 path. The three call sites in `favorites.spec.ts` were updated; behavior there is unchanged.

**Typed toast locators replace the generic one.** `ProductDetailPage.cartToast` (`.toast-message`) could not express
success-vs-error, and ngx-toastr toasts linger (~16s observed), so in the duplicate-add test the success toast from
the first add can still be on screen when the error toast for the second arrives — a generic `.toast-message`
assertion would race them. `cartToast` is replaced by `successToast` (`.ngx-toastr.toast-success`) and `errorToast`
(`.ngx-toastr.toast-error`); the add-to-cart assertion now uses `successToast`. `CartPage.updateToast` is untouched.

**The §26 failures were transient.** All 9 tests in `product-detail.spec.ts` now pass, including the 3 that failed
during the §26 pass — the shared catalog reverted its mutated first product in the interim. See the amended note in
§26 for the durable takeaway: position-based product selection (`clickProductCard(0)`) is not safe for cart-driving
ACs on a shared, mutable catalog.

§5.3 favorites are no longer deferred. The remaining §5.3 gaps are unchanged: the discounted-product badge
(unautomatable, §10) and the rental duration slider + price recalculation.

## 28. Property-based product selection for cart-driving tests (2026-07-09)

Closes the follow-up flagged in §26. The three tests in `tests/ui/product-detail.spec.ts` that drive **cart** controls
(quantity stepper, manual quantity clamp, add-to-cart confirmation) no longer take whatever product happens to sit at
grid position 0; they select the first **in-stock** card instead.

**Why position was unsafe.** The catalog is shared, mutable production data. When someone PATCHed an out-of-stock
product to the front of the grid, all three broke — an out-of-stock detail page disables the very controls they
drive — and they silently healed when it reverted. §3 forbids hard-coded catalog data; "the first card" is not
neutral either.

**Added to `src/ui/pages/product-list.page.ts`** (inherited by the home page and every category page, additive):

- `inStockCard` = `productCards.filter({ hasNot: outOfStockLabelSelector }).first()`
- `findInStockCardAcrossPages()` — the same page walk as `findOutOfStockCardAcrossPages()`.

**"In stock" is a sufficient predicate — no rental check is needed.** The overview grid can never contain rentals:
`ProductService.getProductsNew()` always sends `is_rental=false`, and rentals are fetched by a separate
`is_rental=true` call. Verified against the API (default `/products` → 0 rentals; `?is_rental=true` → 3).

**Tests left on `clickProductCard(0)` deliberately:** display fields, related products, and the three favorites tests
are all indifferent to stock (an out-of-stock product can still be favorited); the out-of-stock AC is already served
by `findOutOfStockCardAcrossPages()`.

**How the fix was proven.** The hazard was no longer reproducible — the mutated product had reverted, so all 9 tests
passed on `main` with or without the change, and re-running them proved nothing. A throwaway spec therefore stubbed
the overview grid's `/products` response to reorder a genuinely out-of-stock product to index 0, leaving the
per-product detail responses real. Under that stub: `clickProductCard(0)` lands on a **disabled** add-to-cart
(reproducing the original failure), while `findInStockCardAcrossPages()` + `inStockCard` select a different product
with an **enabled** add-to-cart and a quantity of 1. Both assertions passed; the throwaway spec was then deleted.

**Test-run note.** `category.spec.ts` failed 2 tests once when four `ProductListPage` specs were run together (25
tests in parallel), and passed 7/7 in isolation on both this branch and clean `main`. It looks load-induced rather
than related to this change — the addition here is a locator and a method that `category.spec.ts` never calls — but
the four-file parallel combo was **not** re-run on clean `main` as a control, so this is unconfirmed.

## 29. Invoices implementation findings (2026-07-11)

Implemented **§5.17 AC1–AC3** (`tests/ui/invoices.spec.ts`, new `src/ui/pages/invoices.page.ts` (list) +
`src/ui/pages/invoice-detail.page.ts`, both registered in `src/ui/fixtures/page-object.fixture.ts`). Reused the
existing checkout machinery: a new action fixture `placeCodOrderAsLoggedInUser()` in `cart-action.fixture.ts`
(mirrors `reachPaymentAsGuest` but the logged-in confirm path) returns `{ invoiceNumber, street, total }`, and
`CheckoutPaymentPage` gained `readInvoiceNumber()` (parses `INV-\d+` from the confirmation banner). Tagged
`@auth @invoices @regression` (`@invoices` is a new feature tag). See `.ai-docs/invoices-plan.md`.

**Data safety (§3):** AC1/AC2 place a **real Cash-on-Delivery order** (simulated payment, §2), so each registers
its own throwaway user via `registerUserWithApi` and logs in inline — a fresh user yields a **single-invoice**
list, so the assertions are deterministic. Never `testUser1` (the shared seeded `customer@`) or the `@logged`
session (shared; `checkout-e2e` AC2 already places orders as it). Billing is completed via the postcode lookup so
the city ↔ country pair is orderable (§18); products chosen dynamically (§3, §9). All three run in the default
`chromium` project (no `@logged`).

**Confirmed contract (live).**

- **List `/account/invoices`** — `<h1 data-test="page-title">Invoices</h1>`, populated by `GET /invoices?page=1`
  (await it on load, §26 pattern — `InvoicesPage.gotoAndAwaitLoaded()`). One `<table>` with **no `data-test`** on
  the table, rows, or cells; columns `Invoice Number | Billing Address | Invoice Date | Total | (Details link)`.
  Rows/cells located structurally by role; the per-row Details link is a bare `<a>` (no `data-test`), located as
  `row.getByRole('link', { name: 'Details' })`. Invoices IS on the `/account` dashboard (a tile), unlike Favorites
  (§26). No pagination component renders for a single invoice.
- **Detail `/account/invoices/<id>`** — `<id>` is the invoice's **lowercase ULID** from the Details link, **not**
  the `INV-…` number, so AC2 reaches detail by clicking the list row (only AC3 hand-builds a bogus URL). Values
  render as read-only `<input>`s with clean `data-test` ids (read via `value`): `invoice-number`, `invoice-date`,
  `total`, `street`/`postal_code`/`city`/`state`/`country`, `payment-method` (= `Cash on Delivery`). Line items
  are a separate `<table>` (no `data-test`, the only table on the page): `Quantity | Product | Price | Total`.

**Discrepancies to account for (docs/plan vs. actual production):**

- **Total format differs between list and detail.** The list cell is `$14.15` (no space); the detail `total` input
  is `$ 14.15` (**with a space**). The specs assert each verbatim (AC2 rebuilds `$ {amount}` / `${amount}` from the
  captured cart total).
- **The list "Billing Address" column is unreliable and can diverge from the submitted/detail street.** For one
  order the list showed `Romaguera Mountain` while the detail (and the value actually submitted) showed the
  geocoded `Schüttegasse`; for another order both agreed on `Schüttegasse`. This is why the AC1 street assertion is
  **present-but-not-pinned** (`not.toBeEmpty()`), with number/date/total pinned exactly. AC2's detail street IS
  reliable (== the captured billing street across repeated runs). Root cause not fully pinned down, but see next.
- **The logged-in billing pre-fill is NOT the account's own address — it's a shared/stale prod value.** A
  controlled user whose stored street was `ZZUNIQUEACCT` still had billing pre-fill `Romaguera Mountain` (the same
  value seen for other users), confirmed against `/account/profile`. So the "billing pre-fills from account data"
  behavior (§16 AC5) is really pre-filling from some shared source; combined with the async postcode-lookup patch,
  this is the likely origin of the list-vs-detail street divergence above. Reinforces §9's shared-data warning.
- **Not-found copy** for a missing/foreign id is a bare `<p>This invoice doesn't exist.</p>` (no `data-test`, not an
  `.alert`/`role=alert`), matched by text. A well-formed-but-nonexistent ULID renders it (no hard error/redirect).

**Validation.** `lint`/`format:check`/`tsc:check` clean. `invoices.spec.ts` passed 2×/test serially
(`--repeat-each=2`, 6/6). Shared-code regression: `@smoke` (18/18, incl. both `checkout-e2e` tests that exercise
the extended `CheckoutPaymentPage`) and `checkout-payment.spec.ts` (17/17, exercises the extended
`cart-action.fixture`) both green serially.

Deferred (not gaps): **AC4** discounted invoice (needs the §5.5 AC7/AC8 combination-discount flow, still deferred;
the `is_location_offer` per-item discount is unautomatable, §10) and **AC5** PDF download (best-effort/manual, §9;
`[data-test="download-invoice"]` is present on the detail page for a future pass).
