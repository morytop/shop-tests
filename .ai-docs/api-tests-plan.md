# Plan: API test suite (`tests/api/**`, Toolshop API 5.0.0)

> Drafted 2026-07-14 from the live OpenAPI spec and a survey of the existing `src/api` layer.

## Goal

Grow the seed API layer (`src/api/` + the single `tests/api/users.smoke.spec.ts`) into systematic
API coverage of the Toolshop REST API, then reuse the resulting request objects/factories as
arrange steps in the UI suite. Phased so every phase lands as its own green PR.

**Scope decisions (confirmed with the owner, 2026-07-14):**

1. **Catalog mutations are negative-only.** `POST/PUT/PATCH/DELETE` on `/products`, `/brands`,
   `/categories`, `/products/{id}/specs` are tested only for the safe rejection paths
   (401 unauthenticated, 422 invalid payload). No admin-token catalog writes — the catalog is
   shared production data.
2. **Admin read-only endpoints are in scope as smoke GETs.** `GET /users`, `GET /users/search`,
   `GET /messages`, the 7 `/reports/*` endpoints — via an admin auth-header variant that only
   ever sends the correct seeded password.

## Sources

- **Swagger UI:** https://api.practicesoftwaretesting.com/api/documentation (JS-rendered shell).
- **Raw OpenAPI 5.0.0 JSON:** https://api.practicesoftwaretesting.com/docs — the machine-readable
  source of truth; request/response schemas referenced below come from it.
- The spec's security annotations are **incomplete** (e.g. `POST /brands` carries no `[auth]` mark
  but the UI treats it as admin-only). Treat annotations as hints; each negative spec asserts the
  _observed_ status and records surprises in `PRODUCT_EXPLORATION.md`.

## What already exists (surveyed 2026-07-14)

- **Requests** (`src/api/requests/`): `BaseRequest` (constructor holds `request`/`url`/`headers`,
  exposes `get()` only), `UsersRequest` (register POST), `LoginRequest`, `TotpRequest`.
- **Factories** (`src/api/factories/`): `prepareRandomUserPayload()` (remaps the UI
  `prepareRandomUser()` — single data source), `registerUserWithApi()` (**already carries the §33
  retry-with-fresh-payload pattern** — reuse it, don't reinvent), `getAuthorizationHeader()`
  (Bearer header from any credentials, defaults `testUser1`), `registerUserWithTotpEnabled()`.
- **Fixtures:** `request-object.fixture.ts` injects `usersRequest`/`loginRequest`; merged into
  `@src/merge.fixture`.
- **Paths:** `API_PATHS`/`apiUrls` in `src/api/utils/api.util.ts` — the single home for endpoint
  paths, shared with the UI-side `waitForApi` waits. All new endpoints get added here.
- **Specs:** `tests/api/users.smoke.spec.ts` (register + login + auth-header smoke).

## Safety rules (non-negotiable)

Restating the CLAUDE.md / `PRODUCT_EXPLORATION.md` constraints as they bind API tests:

- **Every mutating test registers its own throwaway user** via `registerUserWithApi()`. Never
  mutate `customer@`/`admin@practicesoftwaretesting.com` or the `@logged` setup user.
- **Admin token: correct password only, GETs only.** 3 failed logins lock an account permanently
  (§20); the admin account is app-wide. No negative-login test may target a seeded account.
- **No shared-catalog writes** (scope decision 1). No hard-coded product/brand/category IDs
  anywhere — resolve live via `GET /products` / `GET /brands` / `GET /categories` in the arrange.
- **JWTs expire after 5 minutes** — fixtures fetch a fresh token per test (the pattern
  `logged-session.fixture.ts` already uses). Never persist a token across tests.
- **§33 contention is real on writes:** intermittent 500s and faker-email 422 collisions. Wrap
  precondition writes in the `registerUserWithApi()` retry pattern; specs asserting _on_ a write
  assert the first response (retries there would mask the behaviour under test).
- **Failed TOTP attempts do not feed the lockout counter (§23)** — TOTP negatives are safe on
  throwaway users.

## Endpoint coverage map

Coverage classes: **smoke** (happy-path status + minimal shape), **CRUD-own** (full lifecycle on
data owned by a throwaway user), **DDT** (data-driven validation table), **neg-only**
(401/404/422 rejections only), **out** (out of scope, reason given).

| Group        | Endpoints                                                                                                                                | Coverage                                                                                     | Phase |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----- |
| Product      | `GET /products` (+params), `GET /products/{id}`, `GET .../related`, `GET /products/search`                                               | smoke + param checks                                                                         | B     |
| Product      | `POST/PUT/PATCH/DELETE /products*`                                                                                                       | neg-only                                                                                     | B     |
| Product Spec | `GET /products/{id}/specs`, `GET .../specs/{specId}`, `GET /product-specs/names`                                                         | smoke                                                                                        | B     |
| Product Spec | `POST/PUT/DELETE .../specs*`                                                                                                             | neg-only                                                                                     | B     |
| Brand        | `GET /brands`, `GET /brands/{id}`, `GET /brands/search`                                                                                  | smoke                                                                                        | B     |
| Brand        | `POST/PUT/PATCH/DELETE /brands*`                                                                                                         | neg-only                                                                                     | B     |
| Category     | `GET /categories`, `/categories/tree`, `/categories/tree/{id}`, `/categories/search`                                                     | smoke                                                                                        | B     |
| Category     | `POST/PUT/PATCH/DELETE /categories*`                                                                                                     | neg-only                                                                                     | B     |
| Image        | `GET /images`                                                                                                                            | smoke                                                                                        | B     |
| User         | `POST /users/register`                                                                                                                   | DDT (invalid payloads + non-standard inputs)                                                 | C     |
| User         | `POST /users/login`                                                                                                                      | smoke + neg (throwaway users only)                                                           | C     |
| User         | `GET /users/me`, `GET /users/refresh`, `GET /users/logout`, `POST /users/change-password`                                                | CRUD-own                                                                                     | C     |
| User         | `PUT/PATCH/DELETE /users/{id}`                                                                                                           | CRUD-own (own id only)                                                                       | C     |
| User         | `POST /users/forgot-password`                                                                                                            | smoke (200 only — email delivery unobservable)                                               | C     |
| TOTP         | `POST /totp/setup`, `POST /totp/verify`                                                                                                  | already covered (`registerUserWithTotpEnabled` + `users.smoke`); add one wrong-code 4xx neg  | C     |
| Cart         | `POST /carts`, `POST /carts/{id}`, `GET /carts/{id}`, `PUT .../product/quantity`, `DELETE .../product/{pid}`, `DELETE /carts/{id}`       | CRUD-own (carts are throwaway by design)                                                     | D     |
| Favorite     | `GET/POST /favorites`, `GET/DELETE /favorites/{id}`                                                                                      | CRUD-own + 401/409 neg                                                                       | E     |
| Invoice      | `POST /invoices`, `POST /invoices/guest`, `GET /invoices`, `GET /invoices/{id}`, `GET /invoices/search`, `GET .../download-pdf(-status)` | CRUD-own (own orders)                                                                        | E     |
| Invoice      | `PUT/PATCH /invoices/{id}`, `PUT .../status`                                                                                             | out — admin/state mutations on shared order data                                             | —     |
| Contact      | `POST /messages`, `POST /messages/{id}/attach-file`                                                                                      | smoke (one attach happy path)                                                                | E     |
| Contact      | `GET /messages`, `GET /messages/{id}`                                                                                                    | smoke (admin token)                                                                          | F     |
| Contact      | `POST .../reply`, `PUT .../status`                                                                                                       | out — admin mutations                                                                        | —     |
| Payment      | `POST /payment/check`                                                                                                                    | smoke + per-method DDT                                                                       | E     |
| Postcode     | `GET /postcode-lookup`                                                                                                                   | smoke + invalid-postcode neg                                                                 | E     |
| Report       | 7× `GET /reports/*`                                                                                                                      | smoke (admin token)                                                                          | F     |
| User (admin) | `GET /users`, `GET /users/search`, `GET /users/{id}`                                                                                     | smoke (admin token, read-only)                                                               | F     |
| (all)        | HTTP `QUERY`-method variants of the search/list endpoints                                                                                | out — duplicate semantics of the GET forms; Playwright's APIRequestContext has no QUERY verb | —     |

## Phased implementation

Validation gate for every phase: `npm run lint && npm run tsc:check && npx playwright test tests/api`
(plus `--grep @smoke` for the full-suite sanity when fixtures change).

### Phase A — framework extension (no new coverage; `users.smoke` stays green)

- **Goal:** the request-object/fixture/model scaffolding every later phase consumes.
- **Steps:**
  1. Extend `BaseRequest` with generic verbs: `getOne(id)`, `post(data)`, `put(data, id?)`,
     `patch(data, id)`, `delete(id)` (mirror the L11 `base.request.ts`, keep `headers` optional).
  2. Add every new path to `API_PATHS` + `apiUrls` (`/carts`, `/favorites`, `/invoices`,
     `/invoices/guest`, `/messages`, `/payment/check`, `/brands`, `/categories`,
     `/categories/tree`, `/products/search` variants, `/reports/*`, `/users/me`,
     `/users/change-password`, `/users/refresh`, `/users/logout`). The UI-side `waitForApi`
     call-sites keep deriving from the same map — no drift.
  3. New request objects in `src/api/requests/`: `products.request.ts`, `brands.request.ts`,
     `categories.request.ts`, `carts.request.ts` (cart verbs are irregular — item add is
     `POST /carts/{id}`, quantity is `PUT /carts/{id}/product/quantity`), `favorites.request.ts`,
     `invoices.request.ts`, `messages.request.ts`, `payment.request.ts`, `reports.request.ts`;
     extend `UsersRequest` with `me()`, `changePassword()`, `refresh()`, `logout()`,
     `putUser(id)`, `deleteUser(id)`.
  4. New snake_case wire models in `src/api/models/`: `cart.api.model.ts`
     (`{product_id, quantity}`), `favorite.api.model.ts`, `invoice.api.model.ts`
     (`InvoiceRequest` + guest fields), `message.api.model.ts` (`ContactRequest`),
     `payment.api.model.ts` (`PaymentRequest` + the 5 method-detail shapes).
  5. Fixture variants in `request-object.fixture.ts` (L11 pattern): anonymous objects as today;
     `*RequestLogged` variants that call `registerUserWithApi()` + `getAuthorizationHeader()` for
     a fresh throwaway user (exposing the credentials/user alongside where a spec needs them —
     e.g. a `loggedApiUser` fixture the `favoritesRequestLogged`/`invoicesRequestLogged` share);
     `*RequestAdmin` GET-only variants (reports/users/messages) built from
     `getAuthorizationHeader(request, adminUser)`.
  6. Optional (recommended): an `api` project in `playwright.config.ts`
     (`testMatch: 'tests/api/**'`, no `storageState`, excluded from `chromium`'s glob) so API
     specs run browserless and are invocable as a unit (`--project=api`).
- **Files:** `src/api/requests/*` (new + `base`/`users`), `src/api/models/*` (new),
  `src/api/utils/api.util.ts`, `src/api/fixtures/request-object.fixture.ts`,
  `playwright.config.ts` (optional), `tests/api/users.smoke.spec.ts` (path move only, see
  Conventions).
- **Risk:** low — additive. The one behavioural edge: a `*RequestLogged` fixture registers a user
  per test (a write per test on the shared backend); keep those fixtures out of specs that don't
  need auth.

### Phase B — catalog reads + negative-only mutations (`tests/api/products|brands|categories/`)

- **Goal:** cover every public read of the catalog and pin the rejection behaviour of its writes.
- **Steps:**
  1. `products.read.api.spec.ts`: list (default page), `page` param advances, `GET /products/{id}`
     round-trips an id taken from the list, `related` returns items sharing the category,
     `search?q=` results all match the query, filter params (`by_category`, `by_brand`, sort)
     cross-checked against an unfiltered list. No assumptions about specific products (§3).
  2. `products.specs.read.api.spec.ts`: specs list for a live product id, one spec by id,
     `/product-specs/names` shape.
  3. `brands.read.api.spec.ts` / `categories.read.api.spec.ts`: list, by-id, search, tree +
     tree/{id} (categories); ids resolved from the list call.
  4. `catalog.mutations.negative.api.spec.ts`: for each of products/brands/categories/specs —
     unauthenticated `POST`/`PUT`/`DELETE` → assert the observed 4xx (expected 401, but the spec
     annotations are unreliable — record what prod actually returns); customer-token `DELETE` →
     expected 403; `POST` with empty payload → 422 (only where the endpoint rejects before auth,
     verify live). **If any of these unexpectedly succeeds, the spec must fail loudly** — that is
     a real finding for `PRODUCT_EXPLORATION.md`, and the created entity's id must be logged for
     manual cleanup.
- **Validation:** phase gate + a serial re-run of any spec that flaked (§33).
- **Risk:** low for reads. The negative-mutation specs carry the one real hazard of this plan —
  an endpoint that _accepts_ an anonymous write. Mitigation: payloads are minimal/invalid-first,
  and the 2xx-is-a-failure rule above.

### Phase C — users & auth (`tests/api/users/`) — ✅ implemented

> **Implemented 2026-07-16.** The steps below are the plan as drafted; production disagreed with it
> in three places, and the specs follow production:
>
> 1. **`DELETE /users/{ownId}` is 403** — a customer cannot delete their own account (deletion is
>    admin-only). Step 5's delete round-trip is impossible, and its "doubles as partial cleanup"
>    premise is false: **every user this phase registers is permanent.**
> 2. **Step 1's required-field list was wrong.** Only `first_name`/`last_name`/`email`/`password` are
>    required; `dob`, `phone` and the whole `address` object are optional (201). And `email` is never
>    format-validated — a malformed address registers, which is a real defect (§3.9), not a 422 row.
> 3. **Step 6's premise was wrong.** A TOTP-enrolled user cannot reach the wrong-code check at all:
>    post-enrolment login yields a _provisional_ token that `/totp/verify` refuses with 401
>    "Unauthorized token usage". The 400 "Invalid TOTP" path is reachable only with a _pre_-enrolment
>    token, so the spec tests both tokens rather than one code.
>
> Also observed: duplicate register → **409** (not 422); `refresh`/`logout` genuinely revoke their
> token; passwords are checked against a breach corpus, so no literal password is safe. All recorded
> in `PRODUCT_EXPLORATION.md` §API-C.
>
> **Corrected by Phase D (2026-07-17):** this note previously recorded "invalid _new_ passwords on
> change-password → **404**" and a matching 404 on forgot-password for an unknown email. Both were
> wrong — artifacts of the suite not sending `Accept: application/json`, which made Laravel answer
> validation failures with a 302 that Playwright followed into a bogus 404. The real answers are
> **422** with proper field errors. `BaseRequest` now sends the header; the two specs were fixed and
> `PRODUCT_EXPLORATION.md` §4/§6/§8 updated.

- **Goal:** the register DDT (the L11 showcase pattern) plus the authenticated-user lifecycle.
- **Steps:**
  1. `src/api/data/invalid-user-payloads.ts` + `non-standard-inputs.ts` (L11 pattern): a
     generator producing labelled cases — missing required field (each of first_name, last_name,
     email, password, dob, address fields in turn), malformed email, weak/short password,
     under-age dob if validated, oversized strings; plus non-standard-but-legal inputs
     (diacritics, apostrophes, hyphens) expected to succeed.
  2. `users.register.api.spec.ts`: `forEach` over both tables — invalid → `422` +
     `expect.soft` on the error body naming the offending field; non-standard → `201`.
  3. `users.login.api.spec.ts`: valid login → 200 + `access_token`/`token_type`/`expires_in`
     shape; wrong password → 401 (fresh throwaway user, **one** failure only — stay far from the
     3-attempt lock); unknown email → 401.
  4. `users.session.api.spec.ts` (throwaway user): `GET /users/me` → own profile;
     `GET /users/refresh` → new token that works; `GET /users/logout` → subsequent `me` 401.
  5. `users.account.api.spec.ts` (throwaway user): `POST /users/change-password` (happy + wrong
     current password), `PUT/PATCH /users/{ownId}` profile update round-trip,
     `DELETE /users/{ownId}` → subsequent login 401. `POST /users/forgot-password` → 200 for an
     existing throwaway email (response only; the email side is unobservable, §-noted in
     TEST_PLAN).
  6. `totp.negative.api.spec.ts`: wrong code on `POST /totp/verify` for a TOTP-enrolled throwaway
     user (via `registerUserWithTotpEnabled`) → 4xx; safe per §23.
- **Risk:** med — this phase writes the most users to the shared DB. All writes are
  self-contained throwaways; the `DELETE own user` test doubles as partial cleanup.

### Phase D — cart lifecycle (`tests/api/carts/`) — ✅ implemented

> **Implemented 2026-07-17.** The lifecycle landed as planned — every status the plan guessed
> (201 create, 200 add, 204 deletes, 404 after delete) matched production. Three things the plan did
> not anticipate:
>
> 1. **The framework had a client bug, not the API.** Cart validation appeared to answer 404 until
>    `Accept: application/json` was added to `BaseRequest`; it then answered 422 with full field
>    errors. This retroactively falsified two Phase C findings (see the Phase C note above) — the
>    fix is the most valuable thing in this phase.
> 2. **`POST /carts/{id}` accumulates, `PUT .../product/quantity` replaces**, and both return the
>    same `"item added or updated"` message without echoing the line. Pinned as its own test.
> 3. **An unknown `product_id` is a 422**, not the 404 its id shape suggests — the validator enforces
>    referential integrity. An unknown _cart_ id is a real 404, worded four different ways (one with
>    a typo), so the negative spec asserts statuses only.

- **Goal:** the full anonymous cart flow (carts are throwaway server objects — safe to create).
- **Steps:**
  1. `carts.lifecycle.api.spec.ts`: `POST /carts` → 201 + id; `POST /carts/{id}` with a live
     `product_id` (resolved from `GET /products`) → "item added or updated"; `GET /carts/{id}`
     shows the line; `PUT .../product/quantity` → quantity reflected; `DELETE .../product/{pid}`
     → line gone; `DELETE /carts/{id}` → subsequent GET 404.
  2. `carts.negative.api.spec.ts`: GET/POST against a fabricated cart id → 404; add-item with
     missing `product_id`/`quantity` → 422; nonexistent product id → 404/422 (assert observed).
- **Risk:** low. Watch for §33 5xx on the create — the lifecycle spec may reuse the
  fresh-retry pattern on the _arrange_ create only.

### Phase E — customer resources (`tests/api/favorites|invoices|messages|payment/`) — ✅ implemented

> **Implemented 2026-07-17.** The five specs matched the plan's shape; production disagreed with a
> handful of response-shape assumptions written before the endpoints were probed live, all now fixed
> and recorded in `PRODUCT_EXPLORATION.md` §API-E:
>
> 1. **`POST /invoices` gates on auth before validation** (like `/users/{id}`, unlike the catalog) —
>    an anonymous request with an otherwise-valid payload is 401, not 422. Only `/invoices/guest` is
>    genuinely anonymous.
> 2. **Two different 422 body shapes on the same resource.** `/invoices`' own required-field
>    validation answers a bare field map; `/invoices/guest`'s missing-guest-field validation wraps the
>    same shape under `{errors: {...}}`. The contact form's validation is bare too, and its
>    attach-file rejections are bare **arrays** (`{errors: [...]}`) rather than field-keyed.
> 3. **The contact form only requires `subject`/`message`.** `name` and `email` are optional (the
>    plan assumed all four); `email`, when present, is format-validated — unlike register's (§API-C).
> 4. **`POST /payment/check` never validates `payment_method` itself** — an unrecognised slug, or an
>    empty payload entirely, skips the per-method rule set and reports success. This was the "pinned
>    as its own tests" item the DDT data file's comment flagged as unresolved.
> 5. **`GET /postcode-lookup` silently ignores `housenumber`** and never validates that a country
>    code is real — ties to item 2 of the plan's open questions.
>
> Also confirmed as written: favorites' bare-array list with an embedded `product` the single read
> drops, its 409-duplicate/422-unknown-product/204-on-unknown-delete quirks; an empty cart producing
> a real `$0` invoice rather than a validation error; and PDF generation as an async job whose
> pre-ready state reports 400, not a pending 200.

- **Goal:** authenticated own-data CRUD and the checkout-adjacent public endpoints.
- **Steps:**
  1. `favorites.crud.api.spec.ts` (`favoritesRequestLogged`): add a live product → 200/201;
     list contains it; get by id; duplicate add → 409; delete → gone; anonymous `POST /favorites`
     → 401.
  2. `invoices.crud.api.spec.ts` (`invoicesRequestLogged`): `POST /invoices` from a cart built
     via the Phase D flow → invoice number; own list/detail/search contain it;
     `download-pdf-status` polled to a terminal state, then `download-pdf`. Address payloads via
     `makeValidAddress()` — mind the §18 city↔country cross-validation (422 on mismatch is its
     own negative case). `POST /invoices/guest` with `guest_*` fields → same assertions minus the
     token.
  3. `messages.api.spec.ts`: anonymous `POST /messages` (ContactRequest) → `success: true`; one
     `attach-file` happy path (0-byte `.txt` per the UI's constraint — verify live). No further
     upload edge cases (out of scope).
  4. `payment.check.api.spec.ts`: DDT over the 5 method-detail schemas (`CreditCardDetails`,
     `GiftCardDetails`, `CashOnDeliveryDetails`, `BankTransferDetails`, `BuyNowPayLaterDetails`)
     → success message; malformed method payload → 422.
  5. `postcode-lookup.api.spec.ts`: valid postcode → address fields; garbage → assert observed
     4xx/empty shape.
- **Risk:** med — invoice creation is the §33 contention hot spot; these specs are the first
  candidates for the `@order`-style serial split if they flake on retry.

### Phase F — admin read-only smoke (`tests/api/admin/`) — ✅ implemented

> **Implemented 2026-07-17.** Landed as planned, one deviation: `reportsRequestAdmin`'s
> anonymous counterpart doesn't exist as a fixture (reports have no public use case), so
> the negative test builds a bare `new ReportsRequest(request)` directly — the same
> pattern `users.session.api.spec.ts` already uses for its malformed-token case. All
> three groups (`reports`, `users`, `messages`) confirmed genuinely admin-gated: every
> one 401s anonymously, matching the UI dashboard's non-admin redirect.

- **Goal:** mirror the read-only `@admin` UI sweep at the API level. GETs only.
- **Steps:** one spec, `admin.reads.api.spec.ts`, using the `*RequestAdmin` fixtures:
  the 7 `/reports/*` endpoints → 200 + array/shape sanity; `GET /users` (paginated) +
  `GET /users/search?q=` + `GET /users/{id}` (id from the list); `GET /messages` +
  `GET /messages/{id}`. Tag `['@api', '@admin', '@smoke']`.
- **Risk:** low, provided the admin credentials come from `adminUser` (env) and are only ever
  used with the correct password. Skip-with-annotation if `ADMIN_EMAIL` is unset.

### Phase G — reuse API calls in UI tests (the follow-up the suite is really for) — ✅ implemented

> **Implemented 2026-07-17.** The guiding rule (owner-confirmed): the API replaces an arrange only
> where the same UI action is _already exercised as the subject of another test_ — every feature area
> keeps at least one UI-driven basic scenario, because real user behaviour is what the suite tests.
> Candidate by candidate:
>
> 1. **`addFavoritesWithApi(request, credentials, count)`** (`favorite.api.factory.ts`) — arranges
>    `favorites.spec.ts` AC3 (removal): the two favorites are filed over the API, the removal and
>    list assertions stay UI. AC2 (favoriting from the detail page) deliberately keeps the UI add —
>    that _is_ its subject.
> 2. **`createInvoiceWithApi(request, credentials)`** (`invoice.api.factory.ts`) — composes the
>    existing cart/billing/payload factories into a COD order for the given user; arranges
>    `invoices.spec.ts` AC2 (detail). AC1 keeps the UI checkout wizard on purpose: it is the one
>    end-to-end "place an order → see it in the invoice list" user path, and `discounts`/
>    `checkout-e2e` keep `placeCodOrderFromCart` in use. The API total is a plain number, so the
>    spec rebuilds each page's `$`-format from it; knowing the exact cart product also let AC2 pin
>    the line-item name it previously only asserted non-empty.
> 3. **`sendMessageWithApi(request, credentials, payload)`** (`message.api.factory.ts`) — arranges
>    `messages.spec.ts` AC2/AC3 (detail + reply threads); AC1 keeps the contact-form submit.
>    Enabled by a live probe: a token-authenticated `POST /messages` sets `user_id` (with
>    `name`/`email` stored null), so the message lands in that account's own list — recorded as
>    §API-G in `PRODUCT_EXPLORATION.md`.
> 4. **Cart seeding — evaluated and rejected.** The gate question was answered from the app source
>    (`cart.service.ts`): the contract is `sessionStorage['cart_id']` **plus** a client-maintained
>    `cart_quantity` counter the nav badge renders, incremented locally on every add. Injecting a
>    cart means faking both keys against a private contract with no server reconciliation. The UI
>    `addProductToCart` fixture stays. Details in `PRODUCT_EXPLORATION.md` §8.
> 5. **API-token `storageState` for `login.setup.ts`** — untouched, as planned (perf follow-up only).
>
> Retries are targeted, never blind: a repeat-run promptly hit the §9/§33 catalog-churn race in two
> arranges — a product id read from `GET /products` was stale by the time the write landed (422,
> which provably wrote nothing). `addFavoritesWithApi()` and `createCartWithProduct()` therefore
> retry with the product (and cart) **re-resolved** per attempt, skipping already-favorited ids so
> no retry can double-file a row. The invoice `POST` and message `POST` themselves still fail fast:
> a blind re-POST after an ambiguous failure (a 5xx) could double-file the very row it arranges.

- **Goal:** replace slow/fragile UI arranges with API preconditions, keeping assertions in the UI.
- **Existing precedents to extend (not reinvent):** `registerUserWithApi()` feeding
  `login.setup.ts`; `registerUserWithTotpEnabled()` feeding the TOTP login specs;
  `logged-session.fixture.ts` re-minting the 5-minute JWT per `@logged` test.
- **Candidates, in value order:**
  1. **`addFavoriteWithApi(request, credentials, productId?)`** → arrange for
     `favorites.spec.ts` removal/listing tests: register throwaway → favorite via API → UI login
     → assert the favorites page. Drops the add-via-UI arrange loop.
  2. **`createInvoiceWithApi(...)` (+ guest variant)** → arrange for `invoices.spec.ts`
     list/detail/search: an order exists without driving the full checkout wizard. Biggest
     time win; also decouples the invoices spec from checkout §33 contention.
  3. **`sendMessageWithApi(...)`** → arrange for `messages.spec.ts` and the admin messages
     UI view (a message exists to find).
  4. **Cart seeding for checkout specs — evaluate first.** `POST /carts` + inject the cart id
     into the SPA's browser storage before `goto`. Gate: inspect where the app persists the cart
     id (localStorage vs sessionStorage, key name, shape) via devtools before building anything;
     if the contract looks private/brittle, explicitly keep the UI `addProductToCart` fixture
     (it is already stable) and close this item as rejected.
  5. **`login.setup.ts` API-token `storageState`** (roadmap C3) — optional perf follow-up,
     only if setup time becomes a bottleneck. Not part of this effort.
- **Mechanics:** each candidate = an API factory in `src/api/factories/` (sanctioned `expect()`
  for fail-fast arranges, §33 retry where it's a precondition) + where a flow repeats across
  specs, an action fixture à la `cartActionTest`. UI specs keep asserting through the UI — the
  API is arrange/teardown only.
- **Files:** new factories, possibly `src/ui/fixtures/*-action.fixture.ts`, the touched UI specs,
  `CLAUDE.md` architecture note.

## Conventions

- **Tags:** native `tag:` option — `@api` on everything, plus the feature tag
  (`@products`, `@cart`, `@auth`, `@invoices`, `@messages`, `@admin`), `@smoke` on each group's
  happy path. Aligns with the TEST_PLAN taxonomy.
- **Layout:** `tests/api/<area>/<name>.api.spec.ts` (subfolders, L11 style). Move the existing
  `users.smoke.spec.ts` → `tests/api/users/users.smoke.api.spec.ts` in Phase A.
- **Structure:** AAA; hard `expect` on status first, `expect.soft` for body-shape follow-ups
  (L11 pattern); status-mismatch messages include observed vs expected.
- **Data:** all ids resolved live; all users throwaway; DDT tables live in `src/api/data/`.
- **Docs upkeep per phase:** update the `TEST_PLAN.md` coverage map, log any spec-vs-observed
  surprise in `PRODUCT_EXPLORATION.md`, refresh the CLAUDE.md API-layer paragraph when the
  fixture surface changes.

## Open questions (resolve during implementation, not blockers)

1. ~~Does an anonymous `POST /brands`/`/categories` really 401 (spec says nothing)?~~
   **Partly answered in Phase B, and deliberately left open.** No: an empty anonymous `POST` returns
   **422** — the validator runs before the auth layer. `PUT`/`PATCH` likewise 404 on an unknown id
   (existence before auth); only `DELETE` gates correctly (401 anonymous, 403 customer token).
   Whether a _valid_ anonymous `POST` is rejected or **creates a real catalog row** is untested by
   design: with no in-scope admin-write path to delete it, finding out risks permanently polluting
   the shared catalog. Verify on a local instance if it matters. See `PRODUCT_EXPLORATION.md` §4.

   This also revised the Phase B plan as written: the negative specs target a fabricated
   `UNKNOWN_ID`, never a live row, because the pre-auth existence check means the plan's original
   "customer-token `DELETE` on a real id" probe could have mutated production before the
   "2xx-is-a-failure" assertion could report it.

2. ~~`attach-file`: the UI enforces a 0-byte file — does the API enforce the same?~~ **Answered in
   Phase E: yes.** A non-empty file → 400 `{"errors": ["Currently we only allow empty files."]}`; the
   rule is genuinely server-side, not client-only. See `PRODUCT_EXPLORATION.md` §API-E.
3. ~~Cart-id browser-storage contract (Phase G item 4) — inspect before building.~~ **Answered in
   Phase G: rejected.** `sessionStorage['cart_id']` + a client-maintained `cart_quantity` badge
   counter — a private two-key contract not worth faking. See the Phase G note and
   `PRODUCT_EXPLORATION.md` §8.
