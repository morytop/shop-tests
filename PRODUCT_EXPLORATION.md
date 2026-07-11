# Product Exploration — Practice Software Testing (Toolshop)

**Application under test:** https://practicesoftwaretesting.com — build `Toolshop - v5.0`, footer `v2.3 | Built 2026-07-06 | Angular 20.0.5`.
**API host:** https://api.practicesoftwaretesting.com (separate from the UI host).
**Documented behavior source:** the `practice-software-testing` repo, `docs/user-stories/v5.md`, and the pinned `sprint5/` source.

This file is a single, product-focused consolidation of every empirical finding gathered while
building the E2E suite: what the deployed app **actually does**, where it diverges from its own
docs/source, the production bugs and security/accessibility smells found, and the cross-cutting
traps that shape how the app must be tested. It is assembled from live exploration (playwright-cli

- direct API probing), the `.ai-docs/*-plan.md` files, spec-file comments,
  and the merged PR descriptions.

> **How to read this:** each "Discrepancy", "Bug", or "Smell" below is something observed on the
> live production app, not a test artifact. The `(§N)` tags are the original finding IDs from the
> per-feature exploration passes — the source detail now lives in the matching `.ai-docs/*-plan.md`
> file and in each spec's header comment; this document is where those findings are consolidated.

---

## 1. Environment & data reality

- **Production is the only environment.** All testing runs against the shared public site as a
  black box; there is no seeded-DB access and no staging. This drives every "never mutate shared
  data" constraint below.
- **No hash routing anymore (§20).** The docs and older references use `/#/...` URLs, but
  production serves real path routes (`/auth/login`, `/account/profile`, …). Navigating to a `/#/`
  URL silently lands on the **home page** with no redirect. Any hand-typed URL must drop the `#/`.
- **The catalog/brand/category trees are polluted with leftover test data (§9).** Live filter lists
  show entries like "E2E Cat", "Patched Cat", "Cat A/B", "X", "Automated Test Hammer (Updated)",
  "UpdatedProduct-test_products" — debris from other people's automated runs, several levels deep.
- **Products can be deleted/mutated mid-session by concurrent runs (§9, §26).** A product ID
  captured on one page load 404'd seconds later; the first home-grid card was once an out-of-stock
  PATCHed product ("Updated via PATCH") and hours later had reverted. Never cache a product ID or
  assume "the first card" is neutral.
- **The client is a pure Angular SPA with no URL/query-param state (§ search/filters).**
  `window.location` never reflects active search/filter/sort/price state — it's all in-memory, so
  filter state is only observable via the DOM, never the URL.
- **Two seeded shared accounts** (documented defaults, verified 2026-07-11):
  `customer@practicesoftwaretesting.com` / `welcome01` and
  `admin@practicesoftwaretesting.com` / `welcome01`. Both are **read-only fixture data** shared with
  every user of the demo. `customer@` is literally the suite's `testUser1` (`USER_EMAIL`) — so it is
  **not** a safe stand-in for "some logged-in user"; any mutating test must register a throwaway user.

---

## 2. Destructive / dangerous behaviors (handle with care)

These are product behaviors that make certain flows unsafe to run against shared accounts.

- **🚨 Forgot-password instantly resets the password — no email, no token (§21).**
  `POST /users/forgot-password` does not mail a link; `UserService::resetPassword()` overwrites the
  account password with the hardcoded **`welcome02`** on the spot. Verified end-to-end: submit an
  email → the old password returns 401, `welcome02` returns 200. Any email typed into this form is
  burned. Only ever drive it with a disposable user.
- **🚨 Account lockout is permanent at 3 failed attempts (§20).** Threshold is exactly 3: attempts
  1–3 show "Invalid email or password", the **4th and every later attempt** show
  `"Account locked, too many failed attempts. Please contact the administrator."` The lock is on the
  **account**, not the session/IP/counter — supplying the _correct_ password on the 4th attempt is
  still rejected and stays locked. Did not expire within an exploration session. This is why no test
  ever sends the shared admin/customer a wrong password.
- **🚨 The `/admin/settings` form rewrites app-wide configuration (§31).** It controls the payment
  endpoint, geolocation, CO₂ scale, and eco badge **for every user of the demo site**. Admin specs
  load it and assert controls exist, but must never submit it.
- **Enabling TOTP is a permanent account mutation (§22).** So is placing an order, changing a
  password, editing a profile, adding/removing favorites, and submitting a contact message
  (a customer **cannot delete** a message, §30). Every such flow must use a throwaway
  API-registered user, never `testUser1` or the shared `@logged` session.

---

## 3. Production bugs found

Genuine defects in the deployed app, pinned in tests rather than worked around.

| #   | Area                        | Bug                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| --- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Registration (§19)          | **Password strength meter is broken.** The template wires `(input)="… = passwordStrength(f['password'].value)"` but the form is `updateOn:'blur'`, so it reads the _stale pre-blur_ value — always the empty string → `'Invalid'` → bar stuck at `0%`, no active label, even for a fully valid password. The intended Weak→Excellent 5-step mapping never shows. (The **change-password** meter with identical markup works correctly — §25.) |
| 2   | Forgot password (§21)       | **Format-error box renders empty.** The email control uses `Validators.pattern`, populating `errors.pattern`, but the template only prints copy for `errors.required` / `errors['email']`. A malformed non-empty address makes `[data-test="email-error"]` visible **with no text** (`innerHTML` = `<!----><!---->`). Only the empty field shows a message.                                                                                   |
| 3   | Forgot password (§21)       | **Success banner shows a raw i18n key.** The template reads `t('page.forgot-password.confirm')` (singular `page.`) while `en.json` defines `pages.forgot-password.confirm`. Transloco falls back to echoing the key, so the banner literally reads **`page.forgot-password.confirm`** instead of "Your password is successfully updated!".                                                                                                    |
| 4   | TOTP setup (§22)            | **An invalid code tears down the whole setup UI.** The QR, secret and verify form are gated behind `@if (!profile?.totp_enabled && !errorMessage)`, so one mistyped code removes them all — the user can't retry without reloading the page.                                                                                                                                                                                                  |
| 5   | TOTP setup (§22)            | **Spurious dual banner after enabling.** A reload re-POSTs `/totp/setup`, which now returns **400** ("TOTP already enabled"); the component only special-cases 403, so it shows _"Two-Factor Authentication already enabled."_ **and** _"Error: Failed to load TOTP setup details."_ side by side.                                                                                                                                            |
| 6   | Payment — Credit Card (§17) | **Card-holder-name field shows no error text.** A pattern violation turns the input `ng-invalid` and disables Confirm, but the `.alert-danger` box is empty (the template only prints text for a `required` error, and the field is pattern-only).                                                                                                                                                                                            |
| 7   | Privacy policy (§35)        | **No headings anywhere.** `app-privacy` renders a flat run of `<strong>Title:</strong>` + `<p>` pairs — zero `<h1>`–`<h6>`, zero `data-test`. The missing `<h1>` is an accessibility defect.                                                                                                                                                                                                                                                  |
| 8   | Invoices (§29/§33)          | **Billing-address column is unreliable / three inputs share `data-test="total"`.** See Discrepancies + Accessibility below.                                                                                                                                                                                                                                                                                                                   |

---

## 4. Security & privacy smells

- **Forgot-password has no anti-enumeration (§21).** An unknown email returns **422**
  `"The selected email is invalid."` while a known one succeeds — the form reliably distinguishes
  registered from unregistered addresses. Combined with the no-token instant reset (§2), worth
  flagging to the team.
- **TOTP provisional token is correctly scoped (clean, §23).** The `access_token` handed out
  alongside `requires_totp: true` returns **401 "Unauthorized token usage"** on `GET /users/me`; it
  only works as the `access_token` argument of the second (TOTP) login leg. Not an auth bypass.
- **Failed TOTP attempts do NOT feed the lockout counter (clean, §23).** Four consecutive `000000`
  submissions left the account able to log in normally afterward.
- **The `email` field on the profile form is `readonly`, not `disabled` (§24)** — it stays
  focusable/enabled and its value still posts. Minor, but a distinction worth knowing.

---

## 5. Accessibility observations

- **Privacy policy has no `<h1>`–`<h6>` and no `data-test` (§35)** — section titles are bare
  `<strong>` tags. A real a11y defect.
- **Invoice detail: three different inputs (subtotal, discount, grand total) share
  `data-test="total"`, and all three `<label for>` point at `"total"` (§33).** So `getByLabel('Subtotal')`
  resolves to the grand-total input, and the subtotal/discount inputs effectively have no accessible
  name. The page object must use `#subtotal` / `#additional_discount_percentage` / `#total` ids.
- **The cart "delete" control has no accessible name/role (§14)** — a bare `<a class="btn btn-danger">`
  with an `aria-hidden` icon, no `data-test`, no `href`. Located only by a scoped CSS chain.
- **The cart "Actions" column header is blank (§14)** — the documented "Actions" label doesn't render.

---

## 6. Discrepancies vs. documentation (docs/source → actual production)

### Catalog / browse

- **Manual quantity clamp is [1, 99], not [1, 999999999] (§12).** `[data-test="quantity"]` is
  `type=number min=1 max=99` and actively clamps typed values (`0`→`1`, `-5`→`1`, `100000`→`99`).
- **Detail price is a bare number** (e.g. `14.15`), not the listing card's `$X.XX` (§12).
- **Category/brand badges and the related-products section have no `data-test` (§12)** — category/brand
  use `aria-label="category"`/`"brand"`; related products is an `<h2>Related products</h2>` over plain
  `a.card`.
- **Category pages omit the price-range slider and the search box (§11).** Unlike the overview page,
  `/category/<slug>` exposes only Sort + category/brand filters + pagination. So §5.2's "same
  price-range capabilities as the overview page" is inaccurate.
- **Special Tools category is inconsistent (§11):** renders the `Category: Special Tools` heading but
  **never updates `document.title`**, and currently has an **empty grid (0 products)**.
- **Hash vs. non-hash category routes render different sidebars (§11).** Always drive category pages
  via the canonical non-hash path.
- **The overview grid never contains rentals (§28).** `getProductsNew()` always sends `is_rental=false`;
  rentals come from a separate `is_rental=true` call (default `/products` → 0 rentals, `?is_rental=true` → 3).
- **Sort dropdown has extra undocumented `co2_rating,*` options (§ search/filters)** tied to the
  unspec'd Sustainability feature.

### Rentals

- **The `/rentals` listing card is a different component (§13):** a `tabindex`-focusable
  `div[data-test^="product-"]` (not an `<a>`, no `href`), showing a description with **no price**.
- **Cart label for a rental is "Item for rent, price per hour", not "This is a rental item" (§13).**
- **Rental detail replaces the qty stepper with a 1–10h duration slider** (`role="slider"` "ngx-slider");
  price shows `$X.XX per hour / (Total $X.XX)`.

### Cart

- **Empty-cart copy is "The cart is empty. Nothing to display.", not "Your shopping cart is empty" (§14).**
  It renders **only after** the cart has been emptied — a _pristine_ cart (nothing ever added) shows
  neither a table nor the message.
- **Quantity change commits on `change`/blur, not keystroke (§14).** Typing updates only the line-price
  display and reverts on reload; the `cart-total` recalc and "Product quantity updated." toast fire on blur.

### Checkout

- **Sign-in step is a tabbed panel, not a bare login form (§15):** a `role="tablist"` with "Sign in"
  (active) and "Continue as Guest" tabs.
- **"Continue as Guest" is not one-click to billing (§16):** it reveals an intermediate details form
  (`guest-email`/`guest-first-name`/`guest-last-name`), then a distinct **`proceed-2-guest`** button.
- **"Already logged in" copy is "Hello {First} {Last}, you are already logged in. You can proceed to
  checkout.", not "You are already signed in as..." (§9).**
- **Billing "Country" is a `<select>` (ISO list), not free text (§9);** there is an extra **"House number"**
  field (also has an undocumented max of 10, §16). No native `maxlength` and no visible validation error
  text anywhere on the billing form — limits are enforced only via `ng-invalid` + disabled `proceed-3`
  (verified: street ≤70, city ≤40, state ≤40, postal_code ≤10, house_number ≤10).
- **Credit-card fields are pattern-only, NOT required (§17).** A completely blank credit-card form is
  valid and Confirm is enabled (unlike Bank Transfer / Gift Card / BNPL, which are required).
- **Gift-card rules on prod are stricter than the source (§17):** number must be **exactly 16**
  letters/digits, validation code **exactly 4** (with `maxlength=4`), and both carry new copy
  ("Please enter a valid gift card number: exactly 16 letters and/or digits.").
- **"Confirm" is a two-click sequence (§18):** first click → `POST /payment/check` (200) →
  "Payment was successful" appears; second click → invoice POST → confirmation.
- **Confirmation** is `<div id="order-confirmation">` (no `data-test`): _"Thanks for your order! Your
  invoice number is INV-…"_ (format `INV-\d+`). Once it renders, the nav cart badge and `nav-cart`
  link disappear — the cart-emptied signal (§18).
- **The invoice API cross-validates city ↔ country (§18):** `POST /invoices/guest` returns **422**
  ("The billing_country does not match the entered address...") for a manually-typed city that doesn't
  match the country — even a real one (`Berlin`/`DE` failed). Orderable addresses must come from the
  **postcode lookup** (which geocodes street/city/state), not a hand-typed city.
- **Billing pre-fill is NOT the account's own address — it's a shared/stale prod value (§29).** A user
  whose stored street was `ZZUNIQUEACCT` still had billing pre-fill `Romaguera Mountain`. This is the
  likely origin of the list-vs-detail street divergence in invoices. (Earlier passes disagreed on
  whether billing pre-fills at all — §16 vs. an earlier finding; §29 pins the underlying cause.)

### Auth / account

- **Duplicate-email copy is "A customer with this email address already exists.", not "Email is already
  in use." (§19).** The app surfaces the API field error verbatim.
- **Registration password requirements list is always visible, not focus-gated (§19);** only the
  per-rule highlighting is dynamic. The whole form is `updateOn:'blur'`, and all inline errors are
  submit-gated (no live per-field validation before the first submit).
- **Change-password mismatch copy is "The new password field confirmation does not match.", not
  "Passwords do not match." (§25).** Wrong current → "Your current password does not matches with the
  password." (400); new==current → "New Password cannot be same as your current password." (400). All
  three are enforced **server-side** (submit stays enabled, request fires).
- **Valid password change logs the user out after ~5s (measured up to ~9.3s) (§25)** — session cleared,
  only the new password authenticates afterward.
- **TOTP setup heading is "Set up Two-Factor Authentication", not "Setup two factor authentication" (§22).**
  Banners are template-prefixed: `Error: …` / `Success: …`. Secret is 16 base32 chars (80 bits); the
  `otpauth://` URI is SHA1/6-digit/30s; verify window = 1 (±30s skew).
- **TOTP login (§23):** login on a TOTP account returns **200** `{ requires_totp: true, access_token }`,
  the credentials form drops to count 0, and the 6-digit prompt appears. The second leg **reuses
  `POST /users/login`** (body `{ totp, access_token }`), not `/totp/verify`. Invalid → **401**
  `"Invalid TOTP"` (bare, no `Error:` prefix). The login prompt **survives** an invalid code and is
  retryable — the opposite of the setup form's teardown bug (§22).
- **Only 5 of 8 editable profile fields are required (§24):** phone, postal_code and state save fine
  when blank. Profile validation is **server-side** and the error copy leaks API payload paths
  (`The address.street field is required.` etc.). `country` is a free-text `<input>` here (unlike the
  billing `<select>`), and `dob`/`house_number` are absent from the profile form.
- **Profile success is an inline `.alert-success` (detached after ~5.4s), not a toast (§24).**

### Favorites / detail

- **Add-to-favorites has no client-side auth guard (§27).** `POST /favorites` always fires; the toast
  is chosen from the server reply: logged-in first → 201 "Product added to your favorites list.";
  repeat → 409 "Product already in your favorites list."; logged-out → 401 **"Unauthorized, can not
  add product to your favorite list."** (the docs' "Unauthorized..." is an abbreviation). "Does not
  persist" for logged-out is a **network** assertion (POST fires, returns 401), not "no request".
- **Favorite cards' `data-test="favorite-<id>"` is the favorite's id, not the product's (§26).**
  Removal is a `DELETE` + refetch (no dialog, no toast, no reload).
- **Card description truncation is a real 250-char substring from the app's `TruncatePipe`, not CSS
  ellipsis (§26)** (`substring(0,250).trim() + '...'`; verified 738 chars → 253).
- **The `/account` dashboard now has 4 tiles — Favorites, Profile, Invoices, Messages (§30).** (An
  earlier §26 finding that Favorites wasn't linked from the dashboard is now stale.)

### Invoices / messages

- **Invoice detail `<id>` is the lowercase ULID, not the `INV-…` number (§29).**
- **Total format differs per surface (§29/§33):** list `$14.15` (no space), detail `$ 14.15` (space),
  and on a discounted invoice the cart shows `$150.65` / `- $22.60`.
- **Invoice list "Billing Address" column can diverge from the submitted/detail street (§29)** — one
  order showed `Romaguera Mountain` in the list but `Schüttegasse` in detail (the shared-prefill issue).
- **Not-found copy is a bare `<p>This invoice doesn't exist.</p>` (§29)** — no error/redirect.
- **Message body has an undocumented 250-char maximum (§30):** ">250 chars → "The message field must not
  be greater than 250 characters." So the real limit is a **range**, ≥50 and ≤250.
- **The messages list Subject column shows the raw option value (§30)** — `warranty`, `customer-service`,
  … never the human label. Body is truncated at **50** chars by `TruncatePipe`.
- **A customer can reply to their own message thread with no admin involvement (§30);** the first reply
  flips the status `NEW` → `IN_PROGRESS` (`bg-info` → `bg-warning`). Replies render oldest-first.
- **Contact-form logged-in greeting is "Hello {name}, please fill out this form to submit your
  message.", not "Known user, {name}" (§30).**

### Admin

- **There is no `/admin/reports` page (§31)** — "Reports" is three routes: `/admin/reports/statistics`
  (the "general" one, four tables), `.../average-sales-per-month`, `.../average-sales-per-week` (each a
  year `<select>` over a `<canvas>`).
- **Admin sections live in the account-name dropdown (`[data-test="nav-menu"]`), not a sidebar (§9/§31).**
- **Dashboard page title is "Sales over the years" (the chart heading), not "Dashboard" (§31);** the
  orders list page title is the singular "Order" (§31).
- **A logged-in non-admin hitting `/admin/dashboard` is redirected to `/auth/login`, not `/account` (§31).**
- **Row-action `data-test` ids are inconsistently ordered (§31):** brands use `brand-<ULID>-edit`, but
  categories/products/orders/users use `category-edit-<ULID>` (verb before id).
- **Every admin page has exactly one `<h1 data-test="page-title">`;** the six list sections are each one
  `table.table-hover` with **no `data-test`** on table/rows/cells (§31).

### Chat widget

- **There is no "View Product" button (§32).** The `[data-test="chat-product"]` result card is itself
  the link to `/product/<id>`.
- **Chat search uses its own endpoint `QUERY /products/search` (§32)** (the grid uses `/products`).
- **The chat flow allows exactly one search per turn (§32):** after the reply renders, the
  `chat-input`/`chat-send` form is removed from the DOM; "Back to menu" restarts it and **appends a
  second greeting** rather than replacing the first. The ≤5 result cap is real. Menu labels are the
  actual copy: "Find a product" / "Order a product" / "Checkout" / "Create support ticket" (§9).

### Multi-language

- **The selector has 7 options in order `DE, EL, EN, ES, FR, NL, TR` (§34)** — Greek (EL) is live but
  absent from the docs' 6-language list. Switching is instant client-side i18n and flips `<html lang>`;
  persistence is `localStorage["language"]`.
- **Dutch translates neither "Home" nor "Contact"** — identical to English, so a single-label spot-check
  would falsely pass (§34). The `data-test` ids are language-agnostic.
- **The privacy policy is NOT translated (§35):** switching to German flips the nav and `<html lang>`,
  but the policy `<strong>`/`<p>` prose stays English — a real i18n gap.

### Privacy policy

- **Production ships 8 sections, not the 6 the AC lists (§35):** Information We Collect, Use of Google
  Sign-In, Data Removal, Third-Party Services, Data Security, **Information Sharing**, **Changes to the
  Privacy Policy**, Contact Us. Its only in-app entry point is the global footer link.

---

## 7. The unautomatable / manual-only items

- **All generic product discounts are unautomatable (§10, §33).** The products API has no generic
  sale/discount field — the only price flag is **`is_location_offer`** (per-product boolean), decided
  **server-side from the request IP**. Empirically disproved the browser-`geolocation` mocking approach:
  mocking London coordinates for an `is_location_offer: true` product rendered no discount. This covers
  the §5.1 discounted-card, §5.3 discount badge, §5.5 per-item discount, and §5.22 geo-location discount.
  The geo-location test ships as a permanent `test.skip` carrying this explanation.
- **The 15% rental+non-rental combination discount IS fully automatable and deterministic (§33)** — the
  one exception. It's applied client-side and visible on the `/checkout` cart step (Subtotal / Discount
  (15%) / Total). It is **order-level, not per-line** (line items keep full prices; no strikethrough).
  The "15%" appears only in the label text; `#additional_discount_percentage` holds an _amount_
  (`$ 22.60`), not a percentage. Rows are conditional — absent (count 0) on an undiscounted cart, not
  zeroed. This closes §5.5 AC7/AC8 and §5.17 AC4.
- **Deferred as best-effort/manual (§9):** PDF invoice generation/download timing, and real email
  delivery (no test mailbox against prod).
- **`admin@` TOTP-denial is not worth automating separately (§22):** both seeded emails hit one
  hardcoded 403 branch, so the `customer@` denial test covers the whole rule. (The credential now
  exists in config as of §31, so it's _possible_ — but adds no behavioral coverage.)

---

## 8. Cross-cutting patterns (traps that shaped the tests)

- **The pre-load empty-state race (seen ≥6 times: §10, §26, §29, §30, §31, §32).** Angular lists
  initialise to `[]` and the template guards the empty message with `@if (!items?.length)`, so between
  navigation and the `GET` response the page is **indistinguishable from genuinely empty**. Affects
  favorites, invoices, messages, the admin dashboard's "No recent invoices.", and the chat reply. A
  naive assertion passes against the loading state (and would pass even for a populated account). The
  fix everywhere is to await the specific list/search response on load, not a bare `goto()`.
- **`updateOn:'blur'` forms (register §19).** Validators, inline errors, and requirement highlighting
  recompute only on blur — a plain `.fill()` leaves the control pristine. (Forgot-password, by contrast,
  is submit-gated, §21.)
- **Async input hydration (profile §24).** The form is populated by a late `GET /users/me` that writes
  the input **`value` property only** (`getAttribute('value')` stays `null`). A `fill()` before that
  response is silently overwritten; an early `inputValue()` returns `''`. Neither `waitFor` nor
  `filter({hasText})` can express the gate — needs `waitForFunction` on the live `value`.
- **Secrets/IDs mint fresh on every visit.** `/totp/setup` mints and persists a **new** secret on every
  page load for an eligible account (§22); product IDs can 404 mid-session (§9). Always read
  immediately before use, never cache across navigations.
- **ngx-toastr toasts linger (~16s) and stack (§27).** A generic `.toast-message` locator races when a
  success toast from one action is still on screen as an error toast for the next arrives — use typed
  `.toast-success` / `.toast-error` locators.
- **Position-based product selection is unsafe for cart-driving tests (§26/§28).** "The first card" is
  not neutral on a shared, mutable catalog — when someone PATCHed an out-of-stock product to the front,
  three cart-driving tests broke and silently healed when it reverted. Select by the property the test
  needs (in-stock, rental) via a page walk, not by index.
- **The pinned `sprint5/` source is a good first draft but drifts from prod (§17).** Live-verify error
  copy in particular — production had stricter gift-card rules and different card-holder behavior than
  the pinned source showed.
- **Shared-backend contention causes real, non-deterministic flakiness (§17, §33).** Running many
  checkout/order-placing specs in parallel against the slow shared prod backend intermittently trips the
  60s timeout on a _different_ test each run; it reproduces on a clean tree. The postcode-lookup geocoder
  and invoice API slow under concurrent order placement. All affected tests pass serially/in isolation.

---

## 9. Undocumented-but-live features (not in v5 docs)

- **Sustainability / CO₂ (§9):** product cards and detail pages show a CO₂ rating (A–E) badge; there's a
  per-product "Compare" button, an "Eco-Friendly Products" filter, and `co2_rating,*` sort options.
  Not yet spec'd (proposed §5.26).
- **Greek (EL) language (§9/§34)** — 7th selector option.
- **Admin "Settings" page (`/admin/settings`) (§9)** — app-wide config, absent from v5 docs.
- **"House number" billing field (§9/§16).**

---

## 10. Confirmed-matches-docs (no surprises)

Verified live and behaving as documented (§9, plus per-section confirmations): price-range slider
default $1–$100 (bounds $0/$200); "Sign in with Google" button; change-password strength indicator
(Weak→Excellent); non-admin redirect away from `/admin/dashboard`; admin dashboard sales chart +
recent-orders; all admin sections present; chat toggle → 4-option menu; the 5-option payment dropdown
(Bank Transfer, Cash on Delivery, Credit Card, Buy Now Pay Later, Gift Card); the checkout wizard steps;
category + brand filters combining as a true AND/intersection (confirmed via direct API probes).
