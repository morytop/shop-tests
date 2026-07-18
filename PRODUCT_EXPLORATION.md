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

| #   | Area                        | Bug                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Registration (§19)          | **Password strength meter is broken.** The template wires `(input)="… = passwordStrength(f['password'].value)"` but the form is `updateOn:'blur'`, so it reads the _stale pre-blur_ value — always the empty string → `'Invalid'` → bar stuck at `0%`, no active label, even for a fully valid password. The intended Weak→Excellent 5-step mapping never shows. (The **change-password** meter with identical markup works correctly — §25.)                    |
| 2   | Forgot password (§21)       | **Format-error box renders empty.** The email control uses `Validators.pattern`, populating `errors.pattern`, but the template only prints copy for `errors.required` / `errors['email']`. A malformed non-empty address makes `[data-test="email-error"]` visible **with no text** (`innerHTML` = `<!----><!---->`). Only the empty field shows a message.                                                                                                      |
| 3   | Forgot password (§21)       | **Success banner shows a raw i18n key.** The template reads `t('page.forgot-password.confirm')` (singular `page.`) while `en.json` defines `pages.forgot-password.confirm`. Transloco falls back to echoing the key, so the banner literally reads **`page.forgot-password.confirm`** instead of "Your password is successfully updated!".                                                                                                                       |
| 4   | TOTP setup (§22)            | **An invalid code tears down the whole setup UI.** The QR, secret and verify form are gated behind `@if (!profile?.totp_enabled && !errorMessage)`, so one mistyped code removes them all — the user can't retry without reloading the page.                                                                                                                                                                                                                     |
| 5   | TOTP setup (§22)            | **Spurious dual banner after enabling.** A reload re-POSTs `/totp/setup`, which now returns **400** ("TOTP already enabled"); the component only special-cases 403, so it shows _"Two-Factor Authentication already enabled."_ **and** _"Error: Failed to load TOTP setup details."_ side by side.                                                                                                                                                               |
| 6   | Payment — Credit Card (§17) | **Card-holder-name field shows no error text.** A pattern violation turns the input `ng-invalid` and disables Confirm, but the `.alert-danger` box is empty (the template only prints text for a `required` error, and the field is pattern-only).                                                                                                                                                                                                               |
| 7   | Privacy policy (§35)        | **No headings anywhere.** `app-privacy` renders a flat run of `<strong>Title:</strong>` + `<p>` pairs — zero `<h1>`–`<h6>`, zero `data-test`. The missing `<h1>` is an accessibility defect.                                                                                                                                                                                                                                                                     |
| 8   | Invoices (§29/§33)          | **Billing-address column is unreliable / three inputs share `data-test="total"`.** See Discrepancies + Accessibility below.                                                                                                                                                                                                                                                                                                                                      |
| 9   | Registration API (§API-C)   | **`POST /users/register` never validates the email format.** `email` is checked for presence only, so `"not-an-email"` registers and returns **201**. The account is real, logs in normally, and can never be sent a reset mail — `/users/forgot-password` for it succeeds (200) while delivering nowhere. Unreachable from the UI (the form validates client-side), so only the API exposes it. Pinned as an observed-201 test in `users.register.api.spec.ts`. |

---

## 4. Security & privacy smells

- **Forgot-password has no anti-enumeration (§21, §API-C).** An unknown email is rejected with
  **422** `"The selected email is invalid."` while a known one succeeds with **200**
  `{success: true}`, so the endpoint reliably distinguishes registered from unregistered addresses —
  unauthenticated, unthrottled, and usable as an account oracle. Combined with the no-token instant
  reset (§2), worth flagging to the team. Pinned in `users.account.api.spec.ts`.

  > **Correction (§API-D).** This entry previously recorded the API answering **404** > `"Resource not found"` where the UI reported 422, and called the divergence "unexplained".
  > There was never a divergence: the 404 was **our own test artifact**, not the API's answer. See
  > the `Accept: application/json` trap in §8 — the UI and the API agree at 422.

- **TOTP provisional token is correctly scoped (clean, §23).** The `access_token` handed out
  alongside `requires_totp: true` returns **401 "Unauthorized token usage"** on `GET /users/me`; it
  only works as the `access_token` argument of the second (TOTP) login leg. Not an auth bypass.
- **Failed TOTP attempts do NOT feed the lockout counter (clean, §23).** Four consecutive `000000`
  submissions left the account able to log in normally afterward.
- **The `email` field on the profile form is `readonly`, not `disabled` (§24)** — it stays
  focusable/enabled and its value still posts. Minor, but a distinction worth knowing.
- **🚨 Catalog writes do not check auth first (§API-B).** On `/products`, `/brands`, `/categories`
  the auth layer is not the outermost gate, and the ordering differs per verb:

  | Verb                           | Anonymous, unknown id              | Anonymous, empty body     | Customer token |
  | ------------------------------ | ---------------------------------- | ------------------------- | -------------- |
  | `DELETE /{resource}/{id}`      | **401** Unauthorized               | —                         | **403**        |
  | `PUT`/`PATCH /{resource}/{id}` | **404** (existence resolved first) | —                         | —              |
  | `POST /{resource}`             | —                                  | **422** (validated first) | **422**        |

  Only `DELETE` behaves correctly (401 anonymous → 403 non-admin). `PUT`/`PATCH` resolve the row
  before authenticating, and `POST` runs the validator before authenticating — so both leak
  existence/validation detail to anonymous callers, and both reach further into the handler than an
  unauthenticated request should.

  **The open question this leaves is deliberately unanswered:** because an empty `POST` never gets
  past the validator, we do not know whether a _complete, valid_ anonymous `POST` is rejected — or
  creates a real catalog row. Testing it would risk writing an undeletable row to shared production
  (there is no admin-write path in scope to clean up with), so the negative specs stop here and
  target `UNKNOWN_ID` only. **If anyone verifies this, do it against a local
  `practice-software-testing` instance, never production.** This is the highest-value open item in
  this document — a genuine anonymous-write hole on the catalog would be a serious defect.

- **The spec sub-resource authenticates first, unlike its parent (§API-B).** `POST`/`DELETE`
  `/products/{id}/specs` return **401** anonymously even for an unknown product id — the correct
  behavior, and inconsistent with `POST /products` right next to it.

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

- **JWTs expire 5 minutes after minting (`iat`→`exp` = 300s, decoded from a live token).** A saved
  `storageState` session therefore goes silently stale mid-run: any `@logged` spec scheduled more than
  5 minutes after `login.setup.ts` starts logged out (the checkout sign-in step shows the guest Login
  form instead of "you are already logged in"). The suite's fix is the logged-session fixture
  (`src/ui/fixtures/logged-session.fixture.ts`), which re-logs-in via the API per `@logged` test and
  injects a fresh token as in-memory storageState.
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

### REST API (`api.practicesoftwaretesting.com`)

- **`GET /categories/{id}` is not routed at all (§API-B)** — it answers **405** "Method is not
  allowed for the requested route" for _every_ id: real, unknown, or slug. Yet `PUT`/`PATCH`/`DELETE`
  on that same path _are_ registered, so the route exists for writes and not for the read. The
  single-category read is **`GET /categories/tree/{id}`**, which returns the branch object
  (`{id, name, slug, parent_id, sub_categories[]}`). `/brands/{id}` and `/products/{id}` behave
  normally (200 / 404), so this is a categories-only gap. Pinned by a 405 assertion in
  `categories.read.api.spec.ts`.
- **`?by_category=` matches leaf categories only (§API-B).** Filtering by a **top-level** category id
  (e.g. "Hand Tools") returns **0 products** — products are attached to sub-categories ("Hammer",
  "Hand Saw"), never to the parent. Any by-category filter test must take its id from
  `sub_categories`, not from the tree roots. The param accepts a comma-separated list
  (`by_category=a,b` → the union).
- **`GET /categories` is not the tree (§API-B)** — it is a flat list mixing parents and leaves
  (19 rows, 3 with `parent_id: null` at time of writing), distinguishable only by `parent_id`. Only
  `/categories/tree` nests.
- **`GET /products` is enveloped, but the sub-resources are not (§API-B).** `/products` returns
  `{current_page, data[], from, last_page, per_page, to, total}`, while `/brands`, `/categories`,
  `/images`, `/products/{id}/related` and `/products/{id}/specs` return **bare arrays**. `/products/search`
  is enveloped like `/products`.
- **`/products/{id}/related` returns 4 products from the same category, excluding the product
  itself (§API-B)** — consistent enough to assert on both properties.
- **The two cart write verbs are not interchangeable (§API-D).** `POST /carts/{id}` **accumulates**
  onto an existing line (add 1, then add 3 → quantity 4, still one line item), while
  `PUT /carts/{id}/product/quantity` **replaces** it (→ 3). Both answer **200**
  `{"result": "item added or updated"}` — the same message for an add, an accumulate and a replace —
  and neither echoes the resulting line, so the only way to know what a cart holds is to `GET` it.
  A test that trusts the write response cannot tell the two verbs apart. Pinned in
  `carts.lifecycle.api.spec.ts`.
- **Cart line items and carts have independent lifetimes (§API-D).** `DELETE /carts/{id}/product/{pid}`
  → **204** and empties `cart_items`, but the cart survives as an empty object; `DELETE /carts/{id}`
  → **204**, after which `GET` is 404.
- **The cart validator enforces referential integrity, so an unknown product is a 422, not a 404
  (§API-D).** `POST /carts/{id}` with a well-formed but nonexistent `product_id` →
  **422** `"The selected product id is invalid."`, not the 404 the id shape suggests. Quantity is
  validated as an integer ≥ 1 (`0`/`-3` → `"must be at least 1"`, `"two"` → `"must be an integer"`).
  An unknown _cart_ id, though, is a genuine **404** on all four cart-scoped verbs.
- **The cart 404s are worded four different ways, one with a typo (§API-D).** Same status, four
  messages: `GET /carts/{id}` → `"Requested item not found"`, `POST /carts/{id}` → `"Cart not found"`,
  `PUT .../product/quantity` → `"Cart doesn't exist"`, `DELETE /carts/{id}` → `"Cart doesnt exists"`.
  Cosmetic, but it means **cart tests must assert the status and not the message** — the copy is too
  inconsistent to be a contract.
- **Only 4 of the register fields are actually required (§API-C).** `first_name`, `last_name`,
  `email`, `password` are enforced; **`dob`, `phone` and the entire `address` object are optional** —
  omitting them returns **201** and stores the address as all-nulls. The UI marks them required, so
  this gap is API-only. `dob` is unvalidated when absent but strict when present: wrong shape →
  `"The dob field must match the format Y-m-d."`, under-18 → `"Customer must be 18 years old."`.
  Names cap at 40 characters.
- **A duplicate register is 409, not 422 (§API-C)** — `"A customer with this email address already
exists."`. Worth knowing for anything retrying a register: a collision is distinguishable from a
  validation failure by status alone.
- **New passwords are checked against a breach corpus (§API-C).** Register and change-password both
  reject with `"The given password has appeared in a data leak. Please choose a different
password."` (a HaveIBeenPwned-style rule). **Any hard-coded password literal in a test is a time
  bomb** — it passes until the string turns up in a future breach list, then fails every case that
  uses it, and the error names the password rather than the rule under test. `prepareRandomPassword()`
  is the only safe source. This bit the Phase C probing before the specs were written.
- **`POST /users/change-password` mixes two rejection styles (§API-C, corrected §API-D).** Wrong
  current password → **400** `{success: false}`
  (`"Your current password does not matches with the password."`) — an odd status for an auth
  failure, and the endpoint's own hand-rolled check rather than the validator. An invalid _new_
  password, by contrast, goes through Laravel's validator and answers a normal **422** naming the
  field: a mismatched confirmation → `"The new password field confirmation does not match."`, a
  too-weak one → the full rule list under `errors.new_password`.

  > **Correction (§API-D).** This entry previously claimed the invalid-new-password path returned a
  > generic **404** `"Resource not found"` with nothing naming the field. That was **our own test
  > artifact**, not the API's behaviour — see the `Accept: application/json` trap in §8. The
  > validation responses are well-formed and specific.

- **A customer cannot delete their own account (§API-C).** `DELETE /users/{ownId}` → **403**
  `"Forbidden"` even with a valid own token, and the account still logs in afterwards. Deletion is
  admin-only, and admin writes are out of scope — **so every user the API suite registers is
  permanent**. The register-per-test fixtures add a row to the shared database on every run and no
  cleanup path exists; this is a known, accepted cost, not an oversight. (The Phase C plan assumed
  self-delete worked and would double as cleanup. It does not.)
- **Own-data enforcement on `/users/{id}` is correct but inconsistently worded (§API-C).**
  `PUT`/`PATCH` on another user → **403** `{"error": "You can only update your own data."}`;
  `DELETE` on another → **403** `{"message": "Forbidden"}`. Anonymous → **401**. Unlike the catalog
  (§API-B), auth here is the outermost gate.
- **`GET /users/refresh` rotates the token (§API-C).** The returned token works and **the token that
  bought it is immediately dead** (401). Likewise `GET /users/logout` → 200
  `"Successfully logged out"` and its token stops working at once — the JWTs are genuinely revoked
  server-side, not merely left to expire. Code that refreshes and keeps the old token in hand fails
  on the _next_ call, not the refresh.
- **`POST /users/login` never answers 422 (§API-C).** A wrong password and an unknown email both give
  **401** `{"error": "Unauthorized"}`; a structurally invalid body (no password) also gives **401**,
  distinguishable only by `{"error": "Invalid login request"}`.
- **Favorites are a bare array, and the single read drops what the list embeds (§API-E).**
  `GET /favorites` returns `[...]` (not the `{data: []}` envelope `/products` uses), each row carrying
  the whole `product` object; `GET /favorites/{id}` returns the row without it. Favoriting the same
  product twice → **409** `"Duplicate Entry"`; an unknown `product_id` → **422**
  `"The selected product id is invalid"` — referential integrity checked the same way as cart lines
  (§API-D), not a 404. `DELETE` on an unknown favorite id, though, is **204** rather than the 404 every
  other unknown-id path in this API answers with — success reported for a row that never existed.
- **`POST /invoices` requires a token even with an otherwise-valid payload; only `/invoices/guest`
  is genuinely anonymous (§API-E).** Auth is the outermost gate here, same as `/users/{id}` (§API-C)
  and unlike the catalog (§API-B). A guest order is truly ownerless — `user_id: null`, no account is
  created for `guest_email` — and the create response carries no `status` field, only the list/detail
  reads do (`AWAITING_FULFILLMENT` on creation). Empty-payload validation on `/invoices` answers with
  a bare field map (`{payment_method: [...], billing_street: [...], ...}`), while `/invoices/guest`'s
  missing-guest-field validation wraps the same shape under `{errors: {...}}` — two response shapes
  from the same resource depending on which fields are missing.
- **An empty cart still produces a real invoice, not a validation error (§API-E).** `POST /invoices`
  against a cart with no lines → **201**, a genuine `$0` order with `invoicelines: []`. The UI can't
  reach this (checkout is unreachable with an empty cart), but the API has no such guard — pinned as
  an observed-201 test, not a requirement. An **unknown** cart id, by contrast, is a real **404** —
  unlike the cart endpoint's own unknown-`product_id` check, which is a 422 (§API-D).
- **PDF generation is an async queued job, and its pending state is reported as an error (§API-E).**
  `GET .../download-pdf-status` answers **400** with `{"status": "NOT_INITIATED"}` before the job
  starts, walking `NOT_INITIATED → INITIATED → COMPLETED` on its own over roughly 15–40s — a client
  polling for a 200 sees a failure first, not a "not ready yet" response.
- **The contact form only truly requires `subject` and `message` (§API-E).** `name` and `email` are
  both optional — a message posts (**200**, not the 201 every other create answers with, and the body
  is the stored message rather than `{success: true}`) with either omitted — but `email`, when
  present, **is** format-validated (unlike register's, §API-C). The message body has a real
  server-side upper bound (250 chars, **422**) but no lower one — the UI's 50-character minimum and
  fixed subject `<select>` are both client-only, and the API stores a 9-character message or an
  arbitrary subject string happily. The attach-file endpoint's rejections (non-empty file, no file
  part) both answer **400** with `{"errors": ["..."]}` — a bare array, unlike every other validation
  failure's field-keyed body — while the happy path (`{success: true}`) is the one place in this API
  that shape is real.
- **`POST /payment/check` never validates that `payment_method` is one of its five known slugs
  (§API-E).** An unrecognised method — or a completely empty payload — skips the per-method rule set
  entirely and answers **200** `"Payment was successful"`. Recognised methods validate their
  `payment_details` and flatten the nested object into dotted field names in the error body
  (`payment_details.credit_card_number`, etc.).
- **`GET /postcode-lookup` is deterministic but under-validates its country (§API-E).** The same
  `country`+`postcode` pair always geocodes to the same address; the `housenumber` query param is
  accepted but silently ignored — the response's `house_number` never reflects it, consistent with its
  odd one-word spelling next to the `house_number` field it returns. An unrecognised country code
  (`"ZZ"`) still answers **200** with a fabricated-looking address — only the postcode's format is
  checked, never that the country itself is real.
- **A token-authenticated `POST /messages` files the message under the token's user (§API-G).** The
  row gets `user_id` set and shows up in that account's own `GET /messages` list, with `name`/`email`
  stored as null — those two fields only matter for anonymous submissions (§API-E). This is the
  association the messages UI relies on when a logged-in customer submits the contact form, and what
  makes `sendMessageWithApi()` a valid arrange for the per-user messages pages (Phase G).
- **Brand objects nested in product reads never carry `slug` (contract suite).** The docs reuse the
  full `BrandResponse` ref inside `ProductResponse`, but every product read (`/products`,
  `/products/{id}`, `/products/search`, `/products/{id}/related`) serves the nested brand as a bare
  `{id, name}`. Only the brand endpoints themselves (`/brands`, `/brands/{id}`, `/brands/search`)
  serve `slug`. Absorbed by a `scripts/schema-deviations.ts` overlay entry (slug optional on the
  shared ref).
- **Category objects nested in product reads are trimmed differently per endpoint (contract
  suite).** Against the documented full `CategoryResponse` ref: `/products` list rows serve
  `{id, name, slug}`, `/products/{id}` serves `{id, name, slug, parent_id}`, and `/products/search` +
  `/products/{id}/related` rows serve only `{id, name}`. `sub_categories` is never served on a
  nested category. Absorbed by a `scripts/schema-deviations.ts` overlay entry (`slug`/`parent_id`/
  `sub_categories` all optional on the shared ref).
- **`GET /products/{id}` returns an undocumented `specs` key (contract suite)** — the single-product
  read embeds the product's spec rows, absent from `ProductResponse` in the docs and from every other
  product read. Absorbed by a `scripts/schema-deviations.ts` overlay entry (optional `specs` array,
  item shape unconstrained since the docs offer none).
- **`GET /products/{id}/related` rows omit `co2_rating` (contract suite)** — the only product read
  that drops it, even though the docs point the response at the same `ProductResponse` ref and every
  other product read serves the field. Absorbed by a `scripts/schema-deviations.ts` overlay entry
  that forks the ref for this endpoint alone, so the field stays contractually required where it is
  actually served.

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
- **Cart seeding via browser storage: evaluated and rejected (Phase G).** The SPA's cart contract
  (per `cart.service.ts` in the app source) is two `sessionStorage` keys: `cart_id` (the server cart)
  and `cart_quantity` — the latter a **client-maintained running counter** the nav badge renders,
  incremented locally on every add rather than derived from the server (`GET /carts/{id}` resyncs it
  only when the cart page loads). Pre-seeding a checkout test would mean injecting both keys before
  `goto` and hand-maintaining the counter against a private contract that already lies to itself
  (nothing reconciles it if the server cart changes). Not worth it — checkout/cart specs keep the
  stable UI `addProductToCart` arrange.
- **The pinned `sprint5/` source is a good first draft but drifts from prod (§17).** Live-verify error
  copy in particular — production had stricter gift-card rules and different card-holder behavior than
  the pinned source showed.
- **A 2xx from this API does not always mean success (§API-C).** Two of them lie, and both are
  load-bearing. `POST /users/login` on a TOTP account returns **200** carrying `requires_totp: true`
  and a _provisional_ token that authorises only the second login leg (§23) — so
  `getAuthorizationHeader()`, which reads `access_token` off any 200 without inspecting
  `requires_totp`, hands back a token that 401s on whatever it is later used for, with nothing at the
  call site to explain why. `POST /users/register` returns **201** for a malformed email (§3.9). The
  rule: on this API, assert the field that carries the meaning, not just the status.
- **🚨 Without `Accept: application/json`, this API hides every validation error behind a fake 404
  (§API-D).** The backend is Laravel. On a validation failure it checks whether the caller wants
  JSON; if not, it does the _web_ thing and answers **302**, redirecting to the API root — which
  itself answers **404 `"Resource not found"`**. Playwright follows redirects silently, so the test
  sees a 404 for what is really a 422, with the body and field errors gone. `curl` without the header
  shows the bare 302; the Angular client always sends the header, so **the UI and the API never
  actually disagreed** — only our client did.

  This burned Phase C twice, and both times the wrong answer looked like a real finding worth
  documenting: a "generic 404 on change-password validation" (§6) and a "404 vs 422 enumeration
  divergence" the doc called _unexplained_ (§4). Both entries are now corrected; the real answers are
  ordinary, specific 422s. `BaseRequest` now merges `Accept: application/json` into every request, so
  this cannot recur — **the lesson is the general one: a surprising status from this API is a claim
  about our client until the request headers have been ruled out.** An unexplained result is a
  prompt to keep digging, not a finding to write down.

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
