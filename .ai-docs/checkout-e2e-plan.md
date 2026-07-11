# §5.9 End-to-end checkout — plan

## Goal

Implement `tests/ui/checkout-e2e.spec.ts` (TEST_PLAN.md §5.9) — the critical-path
smoke test that places a **real order** end-to-end and asserts the order
confirmation (invoice number) + cart emptied. Two ACs:

1. **Guest:** browse → add to cart → checkout → continue-as-guest → billing
   address → payment (**Cash on Delivery**) → confirmation with invoice number →
   cart emptied.
2. **Logged-in user:** add to cart → checkout skips the login step (already-logged-in
   panel) → pre-filled address → payment → confirmation.

This is the piece §17 deliberately deferred ("successful order → confirmation with
invoice number, cart cleared"); §17 names `reachPaymentAsGuest` + `CheckoutPaymentPage`
as the natural extension points. Tag `@smoke` (per the section title + §4 smoke suite),
plus `@checkout` / `@e2e`.

## Assumptions and open questions

- **Order placement is in-scope here despite §17 deferring it.** §5.9 is by definition
  the place we place an order. Data-safety (§3): the guest order is owned by a throwaway
  faker identity; the logged-in order is owned by the fresh API-registered `@logged`
  user (a disposable account, per `tests/setup/login.setup.ts`) — **never** the shared
  seeded `customer@`/`admin@`. Cash on Delivery = fake/simulated payment (§2), no real
  money movement. So placing these orders is safe and matches the plan's own smoke-suite
  definition ("add-to-cart → checkout happy path").
- **"register/login inline" (AC1 wording) = the wizard's "Continue as Guest" path.** The
  checkout wizard sign-in step offers only _Sign in_ / _Continue as Guest_ (no inline
  registration form) — §15/§16. Guest is the true critical path and reuses
  `reachPaymentAsGuest`. Confirm live that a guest order yields a confirmation + invoice
  number (open question: does the guest path surface an invoice number, or only the
  logged-in one?).
- **AC2 country pre-fill gap (§16):** logged-in billing pre-fills the text fields
  (street/city/state/postcode/house) but the **Country `<select>` stays empty** (the API
  stores the country _name_ "Germany", which matches no option `value`). So `proceed-3`
  starts disabled; the test must select a country to complete the form before proceeding.
  Assert the text fields ARE pre-filled (the AC), then select country to advance.
- **Open:** exact confirmation locators (invoice-number `data-test`, the "payment was
  successful" message) and cart-empty signal (nav cart badge disappears?) — not modelled
  anywhere yet (§17 deferred). Must live-verify before writing locators.

## Risks and constraints

- **Writes shared prod data** (an invoice per run). Acceptable per above; do not place
  orders on seeded accounts, do not assert on absolute invoice list counts.
- **Slow shared public server + full guest flow** — §17 records an environmental flake
  (occasional 60s timeout under `fullyParallel`). Only 2 tests here; keep them lean. Don't
  change global config (out of scope).
- Products chosen dynamically by card index — no hard-coded id/name/price (§3, §9).
- No `expect()` in page objects; AAA; tag via `tag` option; import from `@src/merge.fixture`.

## Planned steps

1. ✅ Read source-of-truth docs + survey existing checkout page objects/fixtures/specs.
2. Write this plan.
3. **Live-explore** (playwright-cli): complete one guest Cash-on-Delivery order to the
   confirmation screen; capture the invoice-number locator, confirmation message copy,
   and how the cart-empty state renders. Fold findings back here.
4. Extend `CheckoutPaymentPage` with a `confirmOrder()` action + confirmation locators
   (invoice number, success message). No new page object expected.
5. Add a `reachPaymentAsLoggedIn()` action fixture (mirror of `reachPaymentAsGuest`) for
   AC2, OR compose inline if it's only used once — decide after step 3.
6. Write `tests/ui/checkout-e2e.spec.ts`: AC1 guest (`@smoke @checkout @e2e`), AC2
   logged-in (`@smoke @checkout @e2e @logged`).
7. Update `TEST_PLAN.md` (new §18 findings + §5.9 status) and `CLAUDE.md` spec list.
8. Validate: lint, format:check, tsc:check, run the new spec (both projects), run `@smoke`.
9. Report; mark this plan complete.

## Live-exploration findings (2026-07-08)

- **Confirm is a two-click sequence.** On the Payment step: 1st `[data-test="finish"]`
  click → `POST /payment/check` (200) → a `[data-test="payment-success-message"]`
  ("Payment was successful") appears, Confirm stays; 2nd `finish` click → the invoice
  POST → order confirmation.
- **Confirmation** is `<div id="order-confirmation">` (no data-test): _"Thanks for your
  order! Your invoice number is INV-2026000004."_ — invoice number format `INV-` + digits
  (`/INV-\d+/`). After it renders, the nav **cart badge (`cart-quantity`) and the
  `nav-cart` link both disappear** — the cart-emptied signal.
- **The invoice API cross-validates city ↔ country.** A manually-entered mismatched city
  is rejected: `POST /invoices/guest` → **422** _"The billing_country does not match the
  entered address. The city does not belong to the selected country."_ Even `Berlin`/`DE`
  failed — so `makeValidAddress()`'s `Berlin/Bavaria` overwrite (used by
  `reachPaymentAsGuest` for the payment-validation tests, which never place an order) is
  **not orderable**. The order flow must instead leave the **geocoded** street/city/state
  the postcode lookup fills (DE / 12345 / 42 → Schüttegasse / Lampertheim / Sachsen-Anhalt),
  which are internally consistent. → new `fillAddressViaLookup()` that awaits the lookup
  and does NOT overwrite.
- **Logged-in path:** sign-in step shows _"Hello {First} {Last}, you are already logged in.
  You can proceed to checkout."_ + `proceed-2`. Billing pre-fills the text fields, country
  `<select>` empty (§16) — **re-confirmed by running the existing checkout-address AC5
  `@logged` test green today**. (A manual playwright-cli login landed in a half-authenticated
  SPA state — token in localStorage but Angular treated it as guest: empty billing +
  `/invoices/guest` 404. That's a cli artifact; the real storageState session hydrates auth
  correctly. So AC2 must be driven under the `@logged` project, not cli.)

## Design decisions

- **`CheckoutAddressPage.fillAddressViaLookup(country, postalCode, houseNumber)`** — selects
  country, fills postcode + (clear&refill) house to force the lookup, awaits `/postcode-lookup`,
  leaves the geocoded street/city/state. Orderable + deterministic. (Existing `fillAddress`
  overwrite kept as-is for the boundary/guest address tests that need it.)
- **`CheckoutPaymentPage.confirmOrder()`** + `paymentSuccessMessage` / `orderConfirmation`
  locators — click finish, waitFor the success message, click finish, waitFor confirmation
  (no `expect` in the page object; sync via `waitFor`).
- **`reachPaymentAsGuest` switches to `fillAddressViaLookup`** so the reached state is
  orderable (strictly more correct; the payment-validation tests only need to _reach_ payment,
  so unaffected). AC1 reuses it, then `confirmOrder`. Re-run the payment spec to confirm.
- **AC2** driven inline under `@logged` (mirrors the AC5 arrange): reach billing, assert
  pre-fill (the AC), then `fillAddressViaLookup` to make it orderable, pay, confirm.

## Validation (2026-07-08)

- `npm run tsc:check`, `npm run lint`, `npm run format:check` — all green.
- `tests/ui/checkout-e2e.spec.ts` — **3 passed** (guest under `chromium`, logged-in under
  `chromium-logged` + its setup). Both place a real Cash-on-Delivery order and assert the
  invoice number + emptied cart.
- Shared-code regression check: `checkout-payment.spec.ts` (uses the modified
  `reachPaymentAsGuest`) — **17/17 passed serially (2.1m)**. A parallel run scored 11/17,
  but the failures were spread across unrelated tests (cash-on-delivery, bank transfer,
  credit card) against an unusually slow shared server — the exact `fullyParallel`
  environmental flake §17 documents, not a logic break (my change does fewer steps than the
  old overwrite path). Confirmed green serially.

## Status: COMPLETE — ready for review
