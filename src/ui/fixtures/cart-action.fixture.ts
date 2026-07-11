import { pageObjectTest } from './page-object.fixture';
import { faker } from '@faker-js/faker';
import { makeValidAddress } from '@src/ui/factories/address.factory';

/** The order facts a placed COD order surfaces, for asserting on its invoice. */
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

// Extends the page-object fixtures with reusable cross-page arrange flows.
//
// - addProductToCart: open home, add the product at `index`, and wait for the cart
//   badge to reach `expectedBadgeCount` (the running cart total, so a second add in
//   the same test awaits '2', not '1'). Opening the cart / proceeding to checkout
//   stays in the test, since where those happen varies per case.
// - addRentalToCart: the same, from the /rentals listing. A rental is a distinct
//   listing component (§13) but shares the product detail page, so this is the only
//   way to get a rental into the cart — which the 15% rental + non-rental combination
//   discount needs (§33). Pairs with addProductToCart to build a discounted cart.
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
  addRentalToCart: async ({ rentalsPage, productDetailPage }, use) => {
    await use(async (index = 0, expectedBadgeCount = '1'): Promise<void> => {
      await rentalsPage.goto();
      await rentalsPage.clickRentalCard(index);
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
  // Place a Cash on Delivery order from whatever is *already* in the cart, as a user
  // who is already logged in (the spec registers + logs in a throwaway user first, so
  // the same page context stays authenticated for the later invoice assertions — the
  // fixture doesn't own auth). Advances cart → "already logged in" proceed → billing
  // via the postcode lookup (the invoice API cross-validates city ↔ country, §18) →
  // COD → confirm, and returns the order facts the invoice should reflect: the invoice
  // number (from the confirmation banner), the geocoded street, and the cart total —
  // which is the *discounted* total when the cart holds a rental + non-rental (§33).
  // Seeding is the caller's job, so a discounted cart can reuse the same flow.
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
