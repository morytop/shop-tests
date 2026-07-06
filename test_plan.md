# E2E Test Plan — Practice Software Testing (Tool Shop)

**Application under test:** https://practicesoftwaretesting.com/#/
**Source of truth for behavior:** [practice-software-testing](../practice-software-testing) repo, `docs/user-stories/v5.md` (full production feature set)
**Automation:** Playwright + TypeScript, Page Object Model (`src/pages`), fixtures in `src/fixtures`
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
- Use tags (`@smoke`, `@regression`, `@checkout`, `@auth`, `@admin`, `@a11y`) via `test.describe`/`test` titles to allow selective runs, following the existing `@login`/`@register` convention.

## 4. Test levels / suites

| Suite                                              | Trigger               | Contents                                                                                              |
| -------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------- |
| **Smoke** (`@smoke`)                               | Every push / PR       | Home page loads, nav works, login, register, add-to-cart → checkout happy path, one admin login check |
| **Regression** (`@regression`)                     | Nightly / pre-release | Everything in this plan                                                                               |
| **Targeted** (`@checkout`, `@auth`, `@admin`, ...) | On-demand, ad hoc     | Feature-scoped subset for fast local iteration                                                        |

## 5. Feature areas & test cases

Each area below maps to a spec file under `tests/` and a page object under `src/pages/` (existing files reused where possible; new ones added as noted).

### 5.1 Product Overview / Home (`tests/product-overview.spec.ts`)

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

### 5.2 Browse by Category (`tests/category.spec.ts`)

- Navigating via a category link loads the category page with the category name as title.
- Same filter/sort/pagination/price-range capabilities are present and functional as on the overview page.

### 5.3 Product Detail (`tests/product-detail.spec.ts`)

- Image, name, description, price, category badge, brand badge are displayed.
- Discounted product: strikethrough price + discount % badge shown.
- Quantity stepper: default 1; `+`/`-` increment/decrement; `-` at 1 stays at 1.
- Manual quantity entry: typed value is applied and clamped to [1, 999999999] (test a value below 1, a value far above max, and a valid mid value).
- Add to cart: success message "Product added to shopping cart." and cart badge/count updates.
- Out-of-stock non-rental product: "Add to Cart" disabled, "Out of stock" shown in red.
- Rental product: duration slider (1–10h) replaces qty stepper; total price = hourly rate × duration, recalculated on drag.
- Favorites (logged in): add succeeds with success message; adding same product again shows "already in favorites" message.
- Favorites (logged out): clicking "Add to Favorites" shows "Unauthorized..." message and does not persist anything.
- Related products section is present below main content.

### 5.4 Rentals (`tests/rentals.spec.ts`)

- Rentals listing page shows all rental products with image, name, description.
- Rental product detail page shows duration slider instead of qty stepper.
- Rental item added to cart is labeled "This is a rental item" in checkout.
- (Best-effort/skippable if geolocation can't be reliably mocked against prod) Location-based discount applies to rental price for a supported city context.

### 5.5 Cart (`tests/cart.spec.ts`)

- Cart displays Item/Quantity/Price/Total/Actions columns once an item is added.
- Changing quantity recalculates line total and cart total, with "Product quantity updated." confirmation.
- Deleting an item removes it and recalculates the cart total.
- Empty cart shows "Your shopping cart is empty".
- "Proceed" is enabled/advances only when cart has ≥1 item.
- Cart item with a discount shows a discount badge plus original & discounted price.
- Cart with both a rental and a non-rental item gets an additional 15% combined-product discount, and shows subtotal/discount/total breakdown.
- Removing all items of one type (all rentals or all non-rentals) removes the 15% combined discount and reverts total.

### 5.6 Checkout — Sign in step (`tests/checkout-signin.spec.ts`)

- Guest proceeding from cart is shown a login form (email, password, submit) as part of the checkout wizard.
- TOTP-enabled account: submitting valid credentials at this step prompts for a 6-digit TOTP code before proceeding.
- Valid credentials advance to billing address step.
- Already-logged-in user sees "You are already signed in as {name}" and proceeds directly to billing address.

### 5.7 Checkout — Billing address (`tests/checkout-address.spec.ts`)

- All required fields present (street ≤70, city ≤40, state ≤40, country ≤40, postal code ≤10).
- Leaving a required field empty invalidates it and disables "Proceed".
- Exceeding max length is rejected/truncated (boundary check per field).
- Filling all fields validly enables proceeding to payment.
- Logged-in user's address fields are pre-filled from account data.

### 5.8 Checkout — Payment (`tests/checkout-payment.spec.ts`)

- Payment method dropdown offers: Bank Transfer, Cash on Delivery, Credit Card, Buy Now Pay Later, Gift Card.
- Bank Transfer: bank name (letters/spaces only, rejects digits), account name (alphanumeric + `. ' -`), account number (digits only) — validate both valid and invalid input per field.
- Credit Card: card number format `XXXX-XXXX-XXXX-XXXX`, expiration `MM/YYYY` in the future, CVV 3–4 digits, holder name letters/spaces only.
- Credit Card: past expiration date shows "Expiration date must be in the future."
- Buy Now Pay Later: "Monthly installments" dropdown offers 3/6/9/12.
- Gift Card: gift card number + validation code, both required/alphanumeric.
- Cash on Delivery: no additional fields required, proceeds directly.
- Switching payment method resets the form and shows the new method's fields (no stale field values/errors carried over).
- Successful order (one happy path per payment method, at least full coverage for Credit Card and Cash on Delivery): confirmation with invoice number shown, cart is cleared afterward.

### 5.9 End-to-end checkout (`tests/checkout-e2e.spec.ts`) — critical path, tagged `@smoke`

- Guest: browse → add to cart → checkout → register/login inline → address → payment (Cash on Delivery) → confirmation with invoice number → cart emptied.
- Logged-in user: add to cart → checkout skips login step → pre-filled address → payment → confirmation.

### 5.10 Registration (`tests/register.spec.ts` — extend existing)

- All required fields enforced (first/last name, DOB ISO format, street, numeric postal code, city, state, country dropdown, numeric phone, RFC-valid email ≤256 chars, password).
- Password requirements list is shown on focus and each rule (length, upper/lower, number, special char) is highlighted live as it's satisfied/unsatisfied while typing.
- Password strength indicator shows correct label + bar % for 1/2/3/4/5 criteria met (Weak 20% → Excellent 100%).
- Duplicate email registration shows "Email is already in use."
- Successful registration redirects to login page (already covered) — extend to also assert a distinct new user can subsequently log in.
- Invalid email format is rejected client-side (RFC-format boundary cases: missing `@`, missing domain, valid edge-case addresses).

### 5.11 Login (`tests/login.spec.ts` — extend existing)

- Valid credentials → `/account` for a regular user (existing test).
- Valid admin credentials → redirected to `/admin/dashboard`.
- Invalid credentials → "Invalid email or password" (existing test).
- Account locking: 3 consecutive failed attempts → 4th attempt shows "Account locked, too many failed attempts..." (use a disposable freshly-registered account, never the shared seeded ones, since lockout is destructive to that account for the remainder of the run).
- Admin account is exempt from lockout even after repeated failed logins (use a throwaway check — do not lock the shared seeded admin; if this can't be verified without touching the shared admin, mark as manual/skip with a comment explaining why).
- Disabled account (requires admin action to disable a test-created user first) → "Account disabled." and not authenticated.
- TOTP-enabled account → 6-digit code prompt after valid email/password; valid code authenticates; invalid code shows "Invalid TOTP".
- "Sign in with Google" opens a 500×400 popup (assert popup dimensions/target, not full OAuth flow — treat deep Google auth as out of scope/mocked).

### 5.12 Forgot password (`tests/forgot-password.spec.ts`)

- Form accessible from login page with an email field.
- Invalid/non-RFC email format is rejected client-side.
- Valid registered email → success/confirmation message, which fades out after ~3s.
- Unregistered email → error message shown.

### 5.13 Two-Factor Authentication setup (`tests/totp-setup.spec.ts`)

- Freshly-registered, logged-in user sees "Setup two factor authentication" section with QR code and manual secret key text.
- Valid 6-digit code (generate via `otplib`/similar using the displayed secret) → "TOTP verified and enabled successfully."
- Invalid code → error message, TOTP not enabled.
- Seeded `customer@`/`admin@` accounts are denied TOTP setup with the specific "Access denied..." message (safe: this is a read/negative check, no mutation).

### 5.14 Customer profile (`tests/profile.spec.ts`)

- Profile page shows current data for a freshly-registered logged-in user.
- All editable fields (first/last name, phone, street, postal code, city, state, country) can be updated and persist after save; success message fades after ~5s.
- Email field is present but not editable (readonly/disabled).
- Required-field validation prevents saving with a field blanked out.

### 5.15 Change password (`tests/change-password.spec.ts`)

- Form shows current/new/confirm fields.
- Password strength indicator mirrors registration behavior for the new password field.
- Mismatched new/confirm → "Passwords do not match."
- Wrong current password → "Your current password does not matches with the password."
- New password identical to current → "New Password cannot be same as your current password."
- Valid change → success message, then automatic logout after ~5s (assert redirected/unauthenticated afterward).

### 5.16 Favorites (`tests/favorites.spec.ts`)

- Empty state message when no favorites.
- Adding a product from detail page surfaces it on the favorites page with image/name/truncated description.
- Removing a favorite updates the list immediately.

### 5.17 Invoices (`tests/invoices.spec.ts`)

- After completing a checkout, the invoice appears in the paginated invoice list with correct number/street/date/total.
- Invoice detail page shows number/date/total, full billing address, payment method+details, and line items.
- Non-existent/foreign invoice ID → "not found" message.
- Discounted order's invoice shows subtotal/discount %/amount/total, and discounted line items show strikethrough + discounted price.
- "Download PDF" is disabled while generating, then enabled and triggers a real file download once ready (poll, allow for the ~20s status check).

### 5.18 Messages (`tests/messages.spec.ts`)

- After submitting a contact form while logged in, the message appears in the paginated Messages list (subject, truncated body, NEW status badge, date).
- Message detail shows full original message + chronological replies.
- Submitting a reply appends it to the thread.

### 5.19 Contact form (`tests/contact.spec.ts` — extend existing `contact.page.ts`)

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

### 5.21 Chat widget (`tests/chat-widget.spec.ts`)

- Toggle button visible bottom-right on any page; opening shows menu: Find Product, Order Product, Checkout, Support.
- Find Product: search returns ≤5 product cards; "View Product" navigates to detail page.
- Order Product: search → select quantity (preset or custom 1–999) → confirm → product appears in cart.
- Checkout via chat: full flow (cart summary → guest details if logged out → address → payment → confirmation with invoice number).
- Checkout via chat with empty cart → "Your cart is empty".
- Support via chat: subject + message (≥50 chars) + optional `.txt` attachment (+ guest name/email if logged out) → confirmation.

### 5.22 Discounts (`tests/discounts.spec.ts`)

- Combination discount (rental + non-rental in cart) — covered primarily in 5.5, cross-checked here through to invoice (5.17 AC4).
- Location-based discount: best-effort using Playwright's `geolocation`/`locale` context options or a mocked geolocation API response, for at least one supported city (e.g. London 25%); explicitly note if the app determines location via IP (not overridable client-side) — if so, mark this test **manual/exploratory only** and document why automation is unreliable.

### 5.23 Multi-language (`tests/language.spec.ts`)

- Default language selector shows DE/EN/ES/FR/NL/TR options in the nav on any page.
- Switching language updates visible UI text to the selected language (spot-check a handful of strings, e.g. nav labels).
- Selected language persists across a reload/new navigation within the same browser context (localStorage).
- (Optional/best-effort) First-visit browser-language auto-detection and fallback-to-English for unsupported browser locales, using Playwright's `locale` launch option in a fresh context.

### 5.24 Privacy policy (`tests/privacy.spec.ts`)

- `/privacy` loads and contains expected sections (Google Sign-In, data collection, automatic removal, third-party services, data security, contact info) — assert on presence of key headings/text.

### 5.25 Accessibility & cross-cutting checks (`tests/a11y.spec.ts`, tagged `@a11y`)

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
- **Billing address "Country" is a `<select>` dropdown** with a full ISO country list, not a free-text field with a 40-char max as AC1 implies. There is also an extra **"House number"** field not mentioned in the AC. Update §5.7 test cases accordingly (drop the Country max-length boundary test; add House number to the field list).
- **Sustainability / CO₂ rating and "Compare" feature are live but undocumented** in v5: product cards and detail pages show a CO₂ rating (A–E) badge, a per-product "Compare" button, and the category sidebar has an "Eco-Friendly Products" filter plus CO₂-rating sort options. None of this is in `docs/user-stories/v5.md`. **Add a new §5.26 "Sustainability / Compare" section** to this plan once the intended behavior is confirmed with the team (docs may be behind an already-shipped feature).
- Checkout "already logged in" copy is _"Hello {First} {Last}, you are already logged in. You can proceed to checkout."_ — not the documented _"You are already signed in as..."_. Assert on the actual copy.
- Admin dropdown menu includes an extra **"Settings"** entry (`/admin/settings`) not covered anywhere in the v5 docs — worth at least a smoke-level access check.
- Chat widget menu button labels are _"Find a product" / "Order a product" / "Checkout" / "Create support ticket"_ (lowercase, slightly reworded vs. the docs' "Find Product" / "Order Product" / "Checkout" / "Support"). Use the actual labels in locators.
- "Add to Favorites" button is rendered as **"Add to favourites"** (British spelling) on the product detail page — use the actual label in locators/assertions.

**Data-quality risk observed directly (reinforces §3):** the shared category/brand filter lists on production are visibly polluted with leftover test data from other users' automated runs (e.g. repeated "E2E Cat", "Patched Cat", "Cat A/B", "X" entries, several levels deep). Tests must not assume a clean/predictable category or brand tree — always assert on structural behavior (e.g., "checking a category filters the grid") rather than exact counts or a fixed list of names. A product ID captured from one page load also 404'd moments later when reloaded fresh, confirming products can be deleted mid-session by concurrent test runs elsewhere — tests should always fetch a live product link/ID immediately before use rather than caching one across steps.

**Not yet spiked (still best-effort/manual per §3, §5.5, §5.22):** geo-location discount, PDF invoice generation/download timing, and real email delivery — these need either a controllable environment or longer manual sessions to verify reliably and were not exercised in this pass.

## 10. Product overview / home implementation findings (2026-07-05)

Implemented the "core browse" subset of §5.1 (`tests/product-overview.spec.ts`, `src/pages/home.page.ts`). Confirmed stable `data-test` locators for the product grid (`a.card[data-test^="product-"]`, `product-name`, `product-price`, `out-of-stock`) and pagination (`pagination-prev`/`pagination-next`, disabled state on the parent `li.page-item`, not the link).

**Discount mechanism confirmed unautomatable:** the products API (`api.practicesoftwaretesting.com/products`) has no generic sale/discount field — the only price-related flag is `is_location_offer` (boolean per product), the same field backing the §5.22 geo-location discount. Tested directly: mocked Playwright's browser `geolocation` context to London coordinates for a live product with `is_location_offer: true`, then reloaded — no strikethrough/discounted price rendered. This empirically confirms the §9 hypothesis that eligibility is determined server-side by request IP, not the browser Geolocation API, so the §5.1 "discounted product card" AC (and §5.22 generally) cannot be forced from an automated test running from a non-eligible CI/dev IP. The corresponding test is written as `test.skip` with a comment, not exercised.

Deferred (per user scope decision, not a gap): search, category filter, brand filter, combined filters, all 4 sort orders, price range slider — remaining §5.1 ACs for a follow-up pass.
