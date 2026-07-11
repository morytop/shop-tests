# Checkout — Payment (§5.8) — test plan

**Scope (confirmed with user 2026-07-08):** the **validation** subset of `TEST_PLAN.md` §5.8 —
payment-method dropdown + per-method field validation + form-reset-on-switch. **Order placement
(the "successful order" AC) is explicitly OUT of this pass** (avoids writing real invoices to the
shared production DB). New spec `tests/ui/checkout-payment.spec.ts` + new
`src/ui/pages/checkout-payment.page.ts`.

## Goal

Cover the Payment step of the checkout wizard (`/checkout`, step 4, reached via
cart → sign-in (guest) → billing address → `proceed-3`):

- **AC1** — payment-method dropdown offers: Bank Transfer, Cash on Delivery, Credit Card,
  Buy Now Pay Later, Gift Card.
- **AC2** — Bank Transfer: bank name (letters/spaces only, rejects digits), account name
  (alphanumeric + `. ' -`), account number (digits only) — valid + invalid input per field.
- **AC3** — Credit Card: card number `XXXX-XXXX-XXXX-XXXX`, expiration `MM/YYYY` in the future,
  CVV 3–4 digits, holder name letters/spaces only.
- **AC4** — Credit Card past expiration date → "Expiration date must be in the future."
- **AC5** — Buy Now Pay Later: "Monthly installments" dropdown offers 3/6/9/12.
- **AC6** — Gift Card: gift card number + validation code, both required/alphanumeric.
- **AC7** — Cash on Delivery: no additional fields, proceeds directly.
- **AC8** — Switching payment method resets the form / shows the new method's fields (no stale
  values/errors carried over).

**OUT of scope this pass (per user):** the "successful order → confirmation with invoice number,
cart cleared" AC (one happy path per method). Deferred — would place real orders.

## Assumptions / open questions (to confirm via live exploration)

- Payment step reached via billing `proceed-3`; guest path used for all cases (no auth needed).
- Payment method is a `<select>` (`payment-method`?) with 5 options; choosing one reveals a
  method-specific sub-form.
- Validation mirrors the billing step: Angular reactive form, `ng-invalid` class + a disabled
  final button, likely **no** native `maxlength`/pattern attrs and possibly **no** visible error
  text — EXCEPT AC4 explicitly documents a visible "Expiration date must be in the future."
  message, so at least that error text renders. Verify which errors render as text vs. only
  `ng-invalid`.
- Field `data-test` ids (guess, verify live): `payment-method`, and per method e.g.
  `bank_name`/`account_name`/`account_number`, `credit_card_number`/`expiration_date`/`cvv`/
  `card_holder_name`, `monthly_installments`, `gift_card_number`/`validation_code`.
- The "confirm/pay" button (analogous to `proceed-3`) — its data-test and disabled behaviour.
- Whether switching method clears previously-entered values / clears validation errors (AC8).

## Risks / constraints

- **Data safety (§3):** do NOT place an order (out of scope anyway). Use a disposable faker guest
  identity for the sign-in step; never the seeded `customer@`/`admin@` accounts. Guest path
  mutates only the per-context localStorage cart (safe, §14).
- **Shared catalog (§3, §9):** pick the product dynamically by card index, no hard-coded
  id/name/price.
- **Prod-vs-docs (§9):** billing step needs the postcode-lookup await already handled by
  `CheckoutAddressPage.fillAddress`. Reuse it to reach payment. Watch for the real confirm-button
  data-test and the actual validation mechanism (visible error text vs. `ng-invalid` only) — fold
  findings back here and into `TEST_PLAN.md`.

## Planned steps

1. ✅ Read source-of-truth docs (test_plan §5.8/§9/§16, CODING_STANDARDS, CLAUDE, fixtures,
   cart/checkout-signin/checkout-address/product-detail page objects, address factory/model/data).
2. ✅ Confirm scope with user — validation subset only, no order placement.
3. Explore live (playwright-cli): drive cart → sign-in (guest) → billing → payment; capture the
   method dropdown options + values, each method's field `data-test` ids, the validation mechanism
   (ng-invalid vs. visible error text, esp. the expiration-in-future message), the confirm button,
   and form-reset-on-switch behaviour. Fold findings back into this file.
4. Get design sign-off (plan mode) on test cases / tags / files before implementing.
5. Implement `CheckoutPaymentPage` (locators + actions, no expect), register in
   `src/ui/fixtures/page-object.fixture.ts`; write `tests/ui/checkout-payment.spec.ts` (AAA, `tag`
   option, `@checkout` + `@regression`, AC references per §7). Reuse `addProductToCart`,
   `CartPage`, `CheckoutSigninPage.continueAsGuest`, `CheckoutAddressPage.fillAddress`.
6. Update `TEST_PLAN.md` with a new implementation-findings section + any new discrepancies.
7. Validate: `npm run lint`, `npm run format:check`, `npm run tsc:check`, run the new spec +
   `@smoke`; fix regressions.
8. Report; mark this file completed.

## Status: COMPLETED (2026-07-08) — ready for review

17 tests implemented and **executed live** (all pass `--workers=1`, ~1.6m). `TEST_PLAN.md` §17
records the findings, discrepancies, and the known parallel-load flake.

## Findings (2026-07-08)

**Network was down for most of the session, then returned.** Early on, production (and general
internet) was unreachable from the run environment, so locators/validation were first drafted from
the **pinned v5.0 Angular source** at `../practice-software-testing/sprint5/UI/src/app/checkout/
payment/` (the repo's named "Source of truth for behavior"; prod is v5.0 per §9). Connectivity
returned before finishing, so the specs were **executed and live-verified** — which surfaced two
places where prod has drifted ahead of the pinned source:

- **Gift card rules stricter + new copy:** number exactly 16 letters/digits, validation code
  exactly 4 (input `maxlength=4`), with new messages — not the source's `/^[a-zA-Z0-9]+$/` +
  "must be alphanumeric.". A negative validation-code test must use a 4-char value with a
  disallowed char (longer strings truncate to valid).
- **Card-holder field shows no error text** — a pattern violation renders an empty `.alert-danger`
  box (template only prints on `required`, field is pattern-only). Asserted via `ng-invalid` +
  Confirm disabled.

Also confirmed: **Credit Card fields are pattern-only, not required** (blank CC form is valid →
Confirm enabled). Lesson: the pinned source is a good first draft but live-verify error copy.

**Known flake:** each test runs the full guest checkout to reach payment; under `fullyParallel` at
the auto worker count against the slow shared server, an occasional test trips the 60s timeout (a
different one each run). Reliable serially and typically 16–17/17 in parallel. No global config
changed (out of scope).

**Payment step (`payment.component.html` / `.ts`):**

- Step heading `<h3>` = **"Payment"**. Confirm button `[data-test="finish"]`, label **"Confirm"**,
  `[disabled]="!cusPayment.valid"`. Whole form is one Angular reactive `FormGroup`.
- Method `<select data-test="payment-method">` options (value → label from `en.json`):
  `""`→"Choose your payment method" (disabled placeholder), `bank-transfer`→"Bank Transfer",
  `cash-on-delivery`→"Cash on Delivery", `credit-card`→"Credit Card",
  `buy-now-pay-later`→"Buy Now Pay Later", `gift-card`→"Gift Card". `payment_method` is `required`.
- Method-specific fields render behind `@if (selectedPaymentMethod === '<value>')`, so switching
  method **removes the old method's inputs from the DOM** (AC8 — nothing stale is shown). Errors are
  `.alert.alert-danger > div` text, shown only when the control is `invalid && (dirty || touched)`.
- **Validators (`updateValidation`) — the exact contract to test:**
  - Bank Transfer: `bank_name` required + `/^[a-zA-Z ]+$/`; `account_name` required +
    `/^[a-zA-Z0-9 .'-]+$/`; `account_number` required + `/^\d+$/`.
  - Gift Card: `gift_card_number` required + `/^[a-zA-Z0-9]+$/`; `validation_code` required +
    `/^[a-zA-Z0-9]+$/`.
  - Credit Card: `credit_card_number` **pattern-only** `/^\d{4}-\d{4}-\d{4}-\d{4}$/` (NOT required);
    `expiration_date` custom validator (`dateFormat` unless `MM/YYYY`, `datePast` if in the past,
    **null when empty**); `cvv` pattern-only `/^\d{3,4}$/`; `card_holder_name` pattern-only
    `/^[a-zA-Z ]+$/`. **Discrepancy vs. plan:** none of the CC fields are `required`, and the
    expiration validator passes on empty — so an all-empty Credit Card form is **valid** and the
    Confirm button is **enabled**. AC3 must assert malformed values are rejected, not required-ness.
  - Buy Now Pay Later: `monthly_installments` `<select data-test="monthly_installments">` required;
    options `""` (placeholder "Choose your monthly installments"), `3`/`6`/`9`/`12` →
    "N Monthly Installments".
  - Cash on Delivery: no validators, no fields → form valid as soon as the method is chosen.
- **Error message copy (`en.json`, asserted verbatim):** bank name "Bank name can only contain
  letters and spaces."; account name "Account name can contain letters, numbers, spaces, periods,
  apostrophes, and hyphens."; account number "Account number must be numeric."; card number
  "Invalid card number format."; exp format "Invalid date format. Use MM/YYYY."; exp past
  "Expiration date must be in the future."; cvv "CVV must be 3 or 4 digits."; card holder "Only
  letters and spaces are allowed."; gift card number "Gift card number must be alphanumeric.";
  validation code "Validation code must be alphanumeric."; installments "Please select the number of
  monthly installments."; method "Payment method is required."

**Reaching the payment step:** cart → `proceed-1` → sign-in (Continue as Guest) → billing address
→ `proceed-3`. Reuse `addProductToCart`, `CartPage`, `CheckoutSigninPage.continueAsGuest`,
`CheckoutAddressPage.fillAddress` + `proceedToPayment`.
