import { pageObjectTest } from './page-object.fixture';
import { faker } from '@faker-js/faker';
import { makeValidAddress } from '@src/ui/factories/address.factory';

export interface PlacedOrder {
  invoiceNumber: string;
  street: string;
  total: string;
}

export interface CartActions {
  addProductToCart: (
    index?: number,
    expectedBadgeCount?: string,
  ) => Promise<void>;
  addRentalToCart: (
    index?: number,
    expectedBadgeCount?: string,
  ) => Promise<void>;
  reachPaymentAsGuest: () => Promise<void>;
  placeCodOrderFromCart: () => Promise<PlacedOrder>;
  placeCodOrderAsLoggedInUser: () => Promise<PlacedOrder>;
}

export const cartActionTest = pageObjectTest.extend<CartActions>({
  addProductToCart: async ({ homePage, productDetailPage, navbar }, use) => {
    await use(async (index = 0, expectedBadgeCount = '1'): Promise<void> => {
      await homePage.goto();
      const found = await homePage.findInStockCardsAcrossPages(index + 1);
      if (!found) {
        throw new Error(
          `fewer than ${index + 1} in-stock products found across pages`,
        );
      }
      await homePage.inStockCards.nth(index).click();
      await productDetailPage.addToCart();
      await navbar.waitForCartQuantity(expectedBadgeCount);
    });
  },
  addRentalToCart: async ({ rentalsPage, productDetailPage, navbar }, use) => {
    await use(async (index = 0, expectedBadgeCount = '1'): Promise<void> => {
      await rentalsPage.goto();
      await rentalsPage.clickRentalCard(index);
      await productDetailPage.addToCart();
      await navbar.waitForCartQuantity(expectedBadgeCount);
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

  placeCodOrderFromCart: async (
    { cartPage, checkoutSigninPage, checkoutAddressPage, checkoutPaymentPage },
    use,
  ) => {
    await use(async (): Promise<PlacedOrder> => {
      await cartPage.goto();
      const total = (await cartPage.cartTotal.innerText()).trim();

      await cartPage.proceedToCheckout();
      await checkoutSigninPage.proceedAsLoggedInUser();

      const address = makeValidAddress();
      await checkoutAddressPage.fillAddressViaLookup(
        address.country,
        address.postalCode,
        address.houseNumber,
      );
      const street = await checkoutAddressPage.streetInput.inputValue();
      await checkoutAddressPage.proceedToPayment();

      await checkoutPaymentPage.selectPaymentMethod('cash-on-delivery');
      await checkoutPaymentPage.confirmOrder();
      const invoiceNumber = await checkoutPaymentPage.readInvoiceNumber();

      return { invoiceNumber, street, total };
    });
  },
  // The common single-product case: seed the cart with one non-rental product, then
  // place the order. An undiscounted cart, so the returned total is the plain sum.
  placeCodOrderAsLoggedInUser: async (
    { addProductToCart, placeCodOrderFromCart },
    use,
  ) => {
    await use(async (): Promise<PlacedOrder> => {
      await addProductToCart();

      return placeCodOrderFromCart();
    });
  },
});
