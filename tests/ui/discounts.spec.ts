import { expect, test } from '@src/fixtures/merge.fixture';
import { parsePrice } from '@src/ui/utils/formats.util';

const PRODUCT_CARD_INDEX = 0;
const RENTAL_CARD_INDEX = 0;
const CART_BADGE_AFTER_PRODUCT = '1';
const CART_BADGE_AFTER_RENTAL = '2';
const COMBINATION_DISCOUNT_RATE = 0.15;

test.describe('Verify discounts', () => {
  test(
    'cart with a rental and a non-rental item gets the 15% combination discount',
    { tag: ['@checkout', '@discounts', '@regression'] },
    async ({ addProductToCart, addRentalToCart, cartPage }) => {
      await addProductToCart(PRODUCT_CARD_INDEX, CART_BADGE_AFTER_PRODUCT);
      await addRentalToCart(RENTAL_CARD_INDEX, CART_BADGE_AFTER_RENTAL);

      await cartPage.goto();

      await expect(cartPage.productTitles).toHaveCount(2);
      await expect(cartPage.cartDiscountLabel).toBeVisible();

      const summary = await cartPage.getFinancialSummary();

      expect(summary.subtotal).toBeCloseTo(
        summary.lineTotals[0] + summary.lineTotals[1],
        2,
      );
      expect(summary.discount).toBeCloseTo(
        summary.subtotal * COMBINATION_DISCOUNT_RATE,
        2,
      );
      expect(summary.total).toBeCloseTo(summary.subtotal - summary.discount, 2);
      expect(summary.total).toBeLessThan(summary.subtotal);
    },
  );

  test(
    'removing the rental removes the combination discount and reverts the total',
    { tag: ['@checkout', '@discounts', '@regression'] },
    async ({ addProductToCart, addRentalToCart, cartPage }) => {
      await addProductToCart(PRODUCT_CARD_INDEX, CART_BADGE_AFTER_PRODUCT);
      await addRentalToCart(RENTAL_CARD_INDEX, CART_BADGE_AFTER_RENTAL);
      await cartPage.goto();
      await expect(cartPage.cartDiscount).toBeVisible();
      const survivorLine = (
        await cartPage.linePrices.nth(0).innerText()
      ).trim();

      await cartPage.removeItem(1);

      await expect(cartPage.productTitles).toHaveCount(1);
      await expect(cartPage.cartSubtotal).toHaveCount(0);
      await expect(cartPage.cartDiscount).toHaveCount(0);
      await expect(cartPage.cartDiscountLabel).toHaveCount(0);
      await expect(cartPage.cartTotal).toHaveText(survivorLine);
    },
  );

  test(
    'discounted order invoice shows the subtotal, discount, and discounted total',
    { tag: ['@auth', '@checkout', '@discounts', '@invoices', '@regression'] },
    async ({
      addProductToCart,
      addRentalToCart,
      cartPage,
      invoiceDetailPage,
      invoicesPage,
      loginAsFreshUser,
      placeCodOrderFromCart,
    }) => {
      await loginAsFreshUser();

      await addProductToCart(PRODUCT_CARD_INDEX, CART_BADGE_AFTER_PRODUCT);
      await addRentalToCart(RENTAL_CARD_INDEX, CART_BADGE_AFTER_RENTAL);
      await cartPage.goto();
      const subtotal = parsePrice(await cartPage.cartSubtotal.innerText());
      const discount = parsePrice(await cartPage.cartDiscount.innerText());

      const order = await placeCodOrderFromCart();

      await invoicesPage.gotoAndAwaitLoaded();
      await invoicesPage.openDetails(order.invoiceNumber);

      // The invoice renders money with a space after the `$` ("$ 12.01"), unlike the
      // cart and the invoice list (§29).
      await expect(invoiceDetailPage.discountLabel).toBeVisible();
      await expect(invoiceDetailPage.subtotal).toHaveValue(
        `$ ${subtotal.toFixed(2)}`,
      );
      await expect(invoiceDetailPage.discount).toHaveValue(
        `$ ${discount.toFixed(2)}`,
      );
      await expect(invoiceDetailPage.total).toHaveValue(
        `$ ${(subtotal - discount).toFixed(2)}`,
      );

      const invoiceTotal = parsePrice(
        await invoiceDetailPage.total.inputValue(),
      );
      expect(invoiceTotal).toBeCloseTo(parsePrice(order.total), 2);
      expect(discount).toBeCloseTo(subtotal * COMBINATION_DISCOUNT_RATE, 2);

      await expect(invoiceDetailPage.lineItemRows).toHaveCount(2);
    },
  );
});
