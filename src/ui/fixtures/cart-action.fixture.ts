import { pageObjectTest } from './page-object.fixture';
import { faker } from '@faker-js/faker';
import { makeValidAddress } from '@src/ui/factories/address.factory';

export interface CartActions {
  addProductToCart: (
    index?: number,
    expectedBadgeCount?: string,
  ) => Promise<void>;
  reachPaymentAsGuest: () => Promise<void>;
}

// Extends the page-object fixtures with reusable cross-page arrange flows.
//
// - addProductToCart: open home, add the product at `index`, and wait for the cart
//   badge to reach `expectedBadgeCount` (the running cart total, so a second add in
//   the same test awaits '2', not '1'). Opening the cart / proceeding to checkout
//   stays in the test, since where those happen varies per case.
// - reachPaymentAsGuest: advance a guest all the way to the Payment step of the
//   wizard (add to cart → cart → Continue as Guest → fill a valid billing address →
//   proceed). Composes several page objects, so it belongs in an action fixture
//   rather than on one page. Guest identity is throwaway faker data and the billing
//   address is filled via the postcode lookup (country/postcode/house → geocoded
//   street/city/state), which leaves the reached state internally consistent and
//   thus orderable — the invoice API rejects a manually-typed mismatched city
//   (§3, §16, §18). So the checkout-e2e spec can reuse this and then place the order.
export const cartActionTest = pageObjectTest.extend<CartActions>({
  addProductToCart: async ({ homePage, productDetailPage }, use) => {
    await use(async (index = 0, expectedBadgeCount = '1'): Promise<void> => {
      await homePage.goto();
      await homePage.clickProductCard(index);
      await productDetailPage.addToCartAndAwaitBadge(expectedBadgeCount);
    });
  },
  reachPaymentAsGuest: async (
    { addProductToCart, cartPage, checkoutSigninPage, checkoutAddressPage },
    use,
  ) => {
    await use(async (): Promise<void> => {
      await addProductToCart();
      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await checkoutSigninPage.continueAsGuest(
        faker.internet.email(),
        faker.person.firstName(),
        faker.person.lastName(),
      );
      const address = makeValidAddress();
      await checkoutAddressPage.fillAddressViaLookup(
        address.country,
        address.postalCode,
        address.houseNumber,
      );
      await checkoutAddressPage.proceedToPayment();
    });
  },
});
