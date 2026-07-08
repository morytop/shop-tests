import { expect, test } from '@src/merge.fixture';
import { makeValidAddress } from '@src/ui/factories/address.factory';

// User Stories v5 — End-to-end checkout (test_plan.md §5.9), the critical-path
// smoke test that places a real order through the full wizard and asserts the order
// confirmation (invoice number) + emptied cart. Cash on Delivery = simulated payment
// (§2), so no real money moves; orders are owned by a throwaway guest identity (AC1)
// or the disposable API-registered @logged user (AC2) — never a shared seeded account
// (§3). Placing a mismatched city is rejected by the invoice API (§18), so the billing
// address is completed via the postcode lookup (geocoded, internally consistent).
// Products are chosen dynamically (§3, §9); see .ai-docs/checkout-e2e-plan.md.

test.describe('Verify end-to-end checkout', () => {
  // AC1 — Guest critical path: browse → add to cart → checkout → Continue as Guest
  // (the wizard offers no inline registration, §15) → billing via postcode lookup →
  // Cash on Delivery → confirmation with invoice number → cart emptied.
  test(
    'guest completes checkout and gets an invoice number',
    { tag: ['@smoke', '@checkout', '@e2e'] },
    async ({ reachPaymentAsGuest, checkoutPaymentPage }) => {
      await reachPaymentAsGuest();

      await checkoutPaymentPage.selectPaymentMethod('cash-on-delivery');
      await checkoutPaymentPage.confirmOrder();

      await expect(checkoutPaymentPage.orderConfirmation).toContainText(
        /Your invoice number is INV-\d+/,
      );
      await expect(checkoutPaymentPage.bookmarks.cartQuantity).toBeHidden();
    },
  );

  // AC2 — Logged-in critical path: add to cart → checkout skips the login step (the
  // "already logged in" panel + proceed-2) → address pre-filled from the account →
  // payment → confirmation. Runs under the @logged project, inheriting the
  // storageState session (a user registered via the API with a full address;
  // tests/setup/login.setup.ts). The billing text fields pre-fill while the country
  // <select> stays empty (§16); the pre-fill is asserted first (the AC), then the
  // address is completed via the lookup so the city ↔ country pair is orderable (§18).
  test(
    'logged-in user completes checkout from a pre-filled address',
    { tag: ['@smoke', '@checkout', '@e2e', '@logged'] },
    async ({
      addProductToCart,
      cartPage,
      checkoutSigninPage,
      checkoutAddressPage,
      checkoutPaymentPage,
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

      await expect(checkoutPaymentPage.orderConfirmation).toContainText(
        /Your invoice number is INV-\d+/,
      );
      await expect(checkoutPaymentPage.bookmarks.cartQuantity).toBeHidden();
    },
  );
});
