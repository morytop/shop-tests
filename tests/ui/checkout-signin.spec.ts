import { expect, test } from '@src/merge.fixture';

// User Stories v5 — Checkout Sign in step (TEST_PLAN.md §5.6), AC1 only: a guest
// proceeding from the cart is shown a login form (email, password, submit) as part
// of the checkout wizard. AC2 (TOTP prompt), AC3 (valid credentials → billing) and
// AC4 (already-logged-in copy) are deferred — see .ai-docs/checkout-signin-plan.md.
// The guest cart is per-context localStorage (empty per test, §12/§14), so the
// product is chosen dynamically by card index — no hard-coded id/name/price (§3, §9).

test.describe('Verify checkout sign-in step', () => {
  test(
    'guest proceeding from the cart is shown the login form',
    { tag: ['@smoke', '@checkout', '@auth'] },
    async ({ addProductToCart, cartPage, checkoutSigninPage }) => {
      await addProductToCart();
      await cartPage.goto();

      await cartPage.proceedToCheckout();

      // The wizard-only "Continue as Guest" tab (absent on /auth/login) confirms
      // this is the checkout sign-in step rather than the standalone login page.
      await expect(checkoutSigninPage.continueAsGuestTab).toBeVisible();
      await expect(checkoutSigninPage.signInTab).toHaveClass(/active/);
      await expect(checkoutSigninPage.loginHeading).toBeVisible();
      await expect(checkoutSigninPage.emailInput).toBeVisible();
      await expect(checkoutSigninPage.passwordInput).toBeVisible();
      await expect(checkoutSigninPage.loginButton).toBeVisible();
    },
  );
});
