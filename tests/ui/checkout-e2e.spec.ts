import { expect, test } from '@src/fixtures/merge.fixture';
import { makeValidAddress } from '@src/ui/factories/address.factory';

test.describe('Verify end-to-end checkout', () => {
  test(
    'guest completes checkout and gets an invoice number',
    { tag: ['@smoke', '@checkout', '@e2e'] },
    async ({ reachPaymentAsGuest, checkoutPaymentPage, navbar }) => {
      await reachPaymentAsGuest();

      await checkoutPaymentPage.selectPaymentMethod('cash-on-delivery');
      await checkoutPaymentPage.confirmOrder();

      await expect(checkoutPaymentPage.orderConfirmation).toBeVisible();
      await expect(navbar.cartQuantity).toBeHidden();
    },
  );

  test(
    'logged-in user completes checkout from a pre-filled address',
    { tag: ['@smoke', '@checkout', '@e2e', '@logged'] },
    async ({
      addProductToCart,
      cartPage,
      checkoutSigninPage,
      checkoutAddressPage,
      checkoutPaymentPage,
      navbar,
    }) => {
      await addProductToCart();
      await cartPage.goto();
      await cartPage.proceedToCheckout();

      await expect(checkoutSigninPage.alreadyLoggedInMessage).toBeVisible();
      await checkoutSigninPage.proceedAsLoggedInUser();

      await expect(checkoutAddressPage.heading).toBeVisible();
      await expect(checkoutAddressPage.streetInput).not.toHaveValue('');
      await expect(checkoutAddressPage.cityInput).not.toHaveValue('');
      await expect(checkoutAddressPage.stateInput).not.toHaveValue('');

      const address = makeValidAddress();
      await checkoutAddressPage.fillAddressViaLookup(
        address.country,
        address.postalCode,
        address.houseNumber,
      );
      await checkoutAddressPage.proceedToPayment();

      await checkoutPaymentPage.selectPaymentMethod('cash-on-delivery');
      await checkoutPaymentPage.confirmOrder();

      await expect(checkoutPaymentPage.orderConfirmation).toBeVisible();
      await expect(navbar.cartQuantity).toBeHidden();
    },
  );
});
