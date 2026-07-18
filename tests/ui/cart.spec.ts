import { expect, test } from '@src/fixtures/merge.fixture';
import { parsePrice } from '@src/ui/utils/price.util';

// User Stories v5 — Cart (TEST_PLAN.md §5.5), core subset AC1–AC5: columns,
// quantity update + confirmation, delete, empty-cart message, Proceed gating.
// AC6 (per-item discount badge) is unautomatable (server/IP-side is_location_offer,
// §10/§12); AC7/AC8 (15% combination discount) are deferred — see
// .ai-docs/cart-core-plan.md. The catalog is shared/mutable (§3, §9), so products
// are chosen dynamically by card index (no hard-coded id/name/price) and prices
// are read back from the DOM rather than asserted against fixed amounts.

test.describe('Verify cart', () => {
  test(
    'cart lists an added item with Item/Quantity/Price/Total columns',
    { tag: '@regression' },
    async ({ addProductToCart, cartPage }) => {
      await addProductToCart();

      await cartPage.goto();

      // The 5th (actions) column header is blank in production — the AC's
      // "Actions" label does not exist (see TEST_PLAN.md §14).
      await expect(cartPage.columnHeaders).toHaveText([
        'Item',
        'Quantity',
        'Price',
        'Total',
        '',
      ]);
      await expect(cartPage.productTitles).toHaveCount(1);
      await expect(cartPage.productTitles.first()).not.toBeEmpty();
      await expect(cartPage.quantityInputs.first()).toHaveValue('1');
      await expect(cartPage.productPrices.first()).toHaveText(/^\$\d+\.\d{2}$/);
      await expect(cartPage.linePrices.first()).toHaveText(/^\$\d+\.\d{2}$/);
      await expect(cartPage.deleteButtons).toHaveCount(1);
    },
  );

  test(
    'changing quantity recalculates line and cart total with a confirmation',
    { tag: '@regression' },
    async ({ addProductToCart, cartPage }) => {
      await addProductToCart();
      await cartPage.goto();
      const unitPrice = parsePrice(
        await cartPage.productPrices.first().innerText(),
      );

      await cartPage.updateQuantity(0, '3');

      await expect(cartPage.updateToast).toHaveText(
        'Product quantity updated.',
      );
      const expectedTotal = `$${(unitPrice * 3).toFixed(2)}`;
      await expect(cartPage.linePrices.first()).toHaveText(expectedTotal);
      await expect(cartPage.cartTotal).toHaveText(expectedTotal);
    },
  );

  test(
    'deleting an item removes it and recalculates the cart total',
    { tag: '@regression' },
    async ({ addProductToCart, cartPage }) => {
      await addProductToCart(0, '1');
      await addProductToCart(1, '2');
      await cartPage.goto();
      await expect(cartPage.productTitles).toHaveCount(2);
      const survivorTitle = (
        await cartPage.productTitles.nth(1).innerText()
      ).trim();
      const survivorLine = (
        await cartPage.linePrices.nth(1).innerText()
      ).trim();

      await cartPage.removeItem(0);

      await expect(cartPage.productTitles).toHaveCount(1);
      await expect(cartPage.productTitles).toHaveText([survivorTitle]);
      await expect(cartPage.cartTotal).toHaveText(survivorLine);
    },
  );

  // The empty-cart message renders only after the cart has been emptied (a
  // pristine cart shows nothing), and reads "The cart is empty. Nothing to
  // display." — not the documented "Your shopping cart is empty" (§14).
  test(
    'emptying the cart shows the empty-cart message',
    { tag: '@regression' },
    async ({ addProductToCart, cartPage }) => {
      await addProductToCart();
      await cartPage.goto();

      await cartPage.removeItem(0);

      await expect(cartPage.emptyCartMessage).toBeVisible();
      await expect(cartPage.productTitles).toHaveCount(0);
    },
  );

  test(
    'Proceed is available only with items and advances to the sign-in step',
    { tag: ['@smoke', '@regression'] },
    async ({ addProductToCart, cartPage }) => {
      await cartPage.goto();
      await expect(cartPage.proceedButton).toHaveCount(0);

      await addProductToCart();
      await cartPage.goto();

      await expect(cartPage.proceedButton).toBeEnabled();
      await cartPage.proceedToCheckout();
      await expect(cartPage.signInEmail).toBeVisible();
    },
  );
});
