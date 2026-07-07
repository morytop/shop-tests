# Checkout — Billing address (§5.7) — test plan

**Scope (confirmed with user 2026-07-07):** all 5 ACs of `test_plan.md` §5.7, new spec
`tests/checkout-address.spec.ts` + new `src/pages/checkout-address.page.ts`.

## Goal

Cover the Billing Address step of the checkout wizard (`/checkout`):

- **AC1** — all required fields present with correct max lengths: street ≤70, city ≤40,
  state ≤40, postal code ≤10, **house number** (extra field, §9), **Country as a `<select>`
  dropdown** (not free-text, §9 — so no Country max-length boundary).
- **AC2** — leaving a required field empty invalidates it and disables "Proceed to payment".
- **AC3** — exceeding a field's max length is truncated/rejected (boundary per text field;
  Country excluded, it's a dropdown).
- **AC4** — filling all fields validly enables proceeding to the payment step.
- **AC5** — a logged-in user's address fields are pre-filled from account data.

## Assumptions / open questions (to confirm via live exploration)

- Billing address step is reached from the sign-in step via **"Continue as Guest"** (guest
  path, AC1–AC4) or by being **already logged in** (AC5 path).
- Address fields carry native `maxlength` attributes that truncate typed input (drives AC1/AC3).
- "Proceed to payment" is disabled until required fields are valid (drives AC2/AC4).
- For AC5, registering via the UI persists the address to the account and the billing step
  re-populates from it. Need to confirm which registration fields map to which billing fields
  (esp. Country: registration uses a country **name/code** select; billing likely mirrors it).
- Field `data-test` ids (guess, to verify live): `street`, `city`, `state`, `postal_code`,
  `country`, and a proceed button `proceed-2` / `proceed-3`.

## Risks / constraints

- **Data safety (§3):** AC5 must register a disposable faker user — never mutate the shared
  seeded `customer@`/`admin@` accounts. Guest-path tests mutate only the per-context
  localStorage cart (safe, §14).
- **Shared catalog (§3, §9):** pick the product dynamically by card index, no hard-coded
  id/name/price. Fetch live product immediately before use.
- **Prod-vs-docs (§9):** Country is a select, House number exists — already folded into scope.
  Watch for the actual "Proceed" button data-test and the actual disabled/validation mechanism
  (Angular reactive-form `ng-invalid` class vs. a disabled attribute).

## Planned steps

1. ✅ Read source-of-truth docs (test_plan §5.6/§5.7/§9/§14/§15, CODING_STANDARDS, CLAUDE,
   fixtures, cart/checkout-signin/product-detail/register/login/account page objects).
2. ✅ Confirm scope with user — all 5 ACs, AC5 included.
3. Explore live (playwright-cli): drive cart → sign-in → Continue as Guest → billing address;
   capture field `data-test` ids, `maxlength` per field, Country select options, the Proceed
   button locator + its disabled/validation behavior. Then register a user + logged-in path to
   confirm pre-fill for AC5. Fold findings back into this file.
4. Get design sign-off (plan mode) on test cases / tags / files before implementing.
5. Implement `CheckoutAddressPage` (locators + actions, no expect), register in
   `src/fixtures/pages.ts`; write `tests/checkout-address.spec.ts` (AAA, `tag` option,
   `@checkout` + `@regression`, AC references per §7).
6. Update `test_plan.md` with a new implementation-findings section + any new discrepancies.
7. Validate: `npm run lint`, `npm run format:check`, run the new spec + `@smoke`; fix regressions.
8. Report; mark this file completed.

## Findings (live exploration, 2026-07-07)

**Reaching the Billing Address step (step 3 of the wizard):**

- From the cart step, `proceed-1` → **Sign in** step (a tabbed panel).
- **Guest path:** click the **"Continue as Guest"** tab → an intermediate form appears
  (`guest-email`, `guest-first-name`, `guest-last-name` + `guest-submit` button) → after
  submit it shows _"Continuing as guest: {First} {Last} ({email})"_ + a **`proceed-2-guest`**
  button → Billing Address. So "Continue as Guest" is **not** a one-click path to billing.
- **Logged-in path:** the Sign in step shows _"Hello {First} {Last}, you are already logged
  in. You can proceed to checkout."_ with a **`proceed-2`** button → Billing Address.
- Billing → Payment button is **`proceed-3`** ("Proceed to checkout").

**Billing address fields** (all `data-test`, all required, Angular reactive form):

| Field        | data-test      | Type                                                                                                                                | Max length     |
| ------------ | -------------- | ----------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| Country      | `country`      | `<select>` (default empty option "Your country \*", value `""`; option value = ISO code e.g. `DE`, text = full name e.g. "Germany") | n/a (dropdown) |
| Postal code  | `postal_code`  | text                                                                                                                                | 10             |
| House number | `house_number` | text                                                                                                                                | 10             |
| Street       | `street`       | text                                                                                                                                | 70             |
| City         | `city`         | text                                                                                                                                | 40             |
| State        | `state`        | text                                                                                                                                | 40             |

- **No native `maxlength` attributes** and **no user-visible validation error text.** Over-max
  or empty input only sets the field's `ng-invalid` class and keeps **`proceed-3` `disabled`**.
  Boundaries verified live: street 70 ok / 71 invalid; city & state 40/41; postal & house 10/11.
- **AC4 confirmed:** country selected + all text fields valid → `proceed-3` becomes enabled.

**AC5 is a discrepancy — billing is NOT pre-filled from account data.** Registered a fresh user
with a saved address (verified on `/account/profile`: street/city/state/postal/country all
stored), logged in, went through checkout twice — the billing fields render **empty** every
time. Instead the step shows helper text _"Enter country, postal code and house number. We will
fill in the rest automatically."_ and performs a **postal-code lookup**: filling
country+postal(+house) auto-fills street/city/state from an external geocoding service (verified:
DE + 12345 → street "Schüttegasse", city "Lampertheim", state "Sachsen-Anhalt" — external,
nondeterministic, not suitable for a stable value assertion). **Plan:** implement AC5's test
against the actual behavior (logged-in user reaches billing via `proceed-2` with **empty**,
manually-entered fields) and record the discrepancy in `test_plan.md`, rather than asserting a
pre-fill that never happens. Surfaced to user in plan mode before implementing.
