import { expect, test } from '@src/fixtures/merge.fixture';

test.describe('Verify checkout sign-in step', () => {
  test(
    'guest proceeding from the cart is shown the login form',
    { tag: ['@smoke', '@checkout', '@auth'] },
    async ({ addProductToCart, cartPage, checkoutSigninPage }) => {
      await addProductToCart();
      await cartPage.goto();

      await cartPage.proceedToCheckout();

      await expect(checkoutSigninPage.continueAsGuestTab).toBeVisible();
      await expect(checkoutSigninPage.signInTab).toHaveClass(/active/);
      await expect(checkoutSigninPage.loginHeading).toBeVisible();
      await expect(checkoutSigninPage.emailInput).toBeVisible();
      await expect(checkoutSigninPage.passwordInput).toBeVisible();
      await expect(checkoutSigninPage.loginButton).toBeVisible();
    },
  );
});
