# Checkout — Sign in step (§5.6) — AC1 only

## Goal

Implement the first acceptance criterion of `TEST_PLAN.md` §5.6 in a new spec file
`tests/checkout-signin.spec.ts`:

- **AC1**: A guest proceeding from the cart is shown a login form (email, password,
  submit) as part of the checkout wizard.

Scope confirmed with the user (2026-07-07): **AC1 only**. AC2 (TOTP prompt), AC3
(valid credentials → billing address), AC4 (already-logged-in copy) are deferred.

## Assumptions & open questions

- The checkout wizard advances Cart (`proceed-1`) → Sign in step → Billing → Payment.
- The sign-in step renders a login form. `cart.spec.ts` already asserts a
  `[data-test="email"]` becomes visible after `proceed-1`, so the email field id is
  known; need to confirm the **password** field and **submit** button locators for
  this step live (they may differ from the standalone `/auth/login` page's
  `[data-test="login-submit"]`).
- Guest cart is a per-context localStorage cart (empty per test, §12/§14) — safe to
  mutate, no shared-account concern for AC1.
- Need to confirm whether the sign-in step shows a heading/label and any
  "Proceed to checkout" gating, and the step indicator state.

## Risks & constraints

- Shared/mutable catalog (§3, §9): pick the product dynamically by card index, no
  hard-coded id/name/price.
- No `expect()` in page objects (CODING_STANDARDS); assertions live only in the spec.
- Reuse existing page objects (`HomePage`, `ProductDetailPage`, `CartPage`) for the
  Arrange steps; add a new `CheckoutSigninPage` only for the sign-in-step surface.

## Status: COMPLETED (2026-07-07)

## Planned steps

1. [x] Read source-of-truth docs (test_plan §5.6/§9/§14, CLAUDE, CODING_STANDARDS,
       playwright.config), survey existing cart/login page objects + specs.
2. [x] Confirm scope with user → AC1 only.
3. [x] Explore the live sign-in step (playwright-cli) to confirm the email/password/
       submit locators and any heading/step marker. Fold findings back here.
4. [x] Create `src/pages/checkout-signin.page.ts` (locators + navigation only, no
       `expect()`); register it in `src/fixtures/pages.ts` (both `Pages` type and `pages`).
5. [x] Write `tests/checkout-signin.spec.ts` with the AC1 test, tagged per taxonomy,
       with a §5.6 traceability comment.
6. [x] Update `TEST_PLAN.md` with a §15 implementation-findings note + any discrepancies.
7. [x] Validate: lint + format:check green; new spec passes (14.7s); full `@smoke`
       suite 13/13 passing.
8. [x] Report; plan marked completed.

## Findings (live exploration 2026-07-07)

- The sign-in step (after `proceed-1` from the cart, URL stays `/checkout`) renders a
  **tabbed panel** — a `role="tablist"` with two `role="tab"` links: **"Sign in"**
  (active by default, `a.nav-link.active`, `href="#signin-tab"`) and **"Continue as
  Guest"**. Neither tab has a `data-test`/id → locate via `getByRole('tab', {name})`.
  This tabbed layout is **not mentioned in §5.6 AC1** (docs just say "shown a login
  form") — a discrepancy to record.
- The active "Sign in" tabpanel shows a **`<h3>Login</h3>`** heading (no data-test →
  `getByRole('heading', {name:'Login'})`) and the login form:
  - Email: `[data-test="email"]`
  - Password: `[data-test="password"]`
  - Submit button: `[data-test="login-submit"]`, **labelled "Login"** (not "submit")
  - plus "Register your account" / "Forgot your Password?" links.
    These reuse the same `data-test` ids as the standalone `/auth/login` page.
- The wizard **step indicator** is a `<ul>` whose active step is `<li class="current">`
  (no data-test/role); the Sign in step shows number "2". The distinctive
  wizard-only anchor (absent on `/auth/login`) is the **"Continue as Guest" tab**.
- Decision: model the step as a new `CheckoutSigninPage` (PAGE_URL = `/checkout`,
  reached by proceeding from the cart — `goto()` lands on the cart step, like
  `ProductDetailPage`). Assert AC1 via: signInTab active + email/password/loginButton
  visible + continueAsGuestTab present (proves it's the wizard, not `/auth/login`).
