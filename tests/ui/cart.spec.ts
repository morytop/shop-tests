import { expect, test } from '@src/fixtures/merge.fixture';
import { USD_PRICE_REGEX, parsePrice } from '@src/ui/utils/formats.util';

test.describe('Verify cart', () => {
  test(
    'cart lists an added item with Item/Quantity/Price/Total columns',
    { tag: '@regression' },
    async ({ addProductToCart, cartPage }) => {
      await addProductToCart();

      await cartPage.goto();

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
      await expect(cartPage.productPrices.first()).toHaveText(USD_PRICE_REGEX);
      await expect(cartPage.linePrices.first()).toHaveText(USD_PRICE_REGEX);
      await expect(cartPage.cartTotal).toHaveText(USD_PRICE_REGEX);
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

      await expect(cartPage.updateToast).toBeVisible();
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
