import { expect, test } from '@src/merge.fixture';

// User Stories v5 — Product Detail (test_plan.md §5.3), core subset:
// display fields, quantity stepper + manual clamp, add-to-cart, out-of-stock,
// related products. Discount, rental slider and favorites are deferred (see
// .ai-docs/product-detail-core-plan.md). Detail pages are reached by clicking a
// live product card (never a hard-coded id) per §9.
test.describe('Verify product detail', () => {
  test(
    'detail page shows image, name, price, description, category and brand',
    { tag: '@regression' },
    async ({ homePage, productDetailPage }) => {
      await homePage.goto();

      await homePage.clickProductCard(0);

      await expect(productDetailPage.productImage).toBeVisible();
      await expect(productDetailPage.productName).not.toBeEmpty();
      await expect(productDetailPage.productPrice).toHaveText(/^\d+\.\d{2}$/);
      await expect(productDetailPage.productDescription).not.toBeEmpty();
      await expect(productDetailPage.categoryBadge).not.toBeEmpty();
      await expect(productDetailPage.brandBadge).not.toBeEmpty();
    },
  );

  test(
    'quantity stepper defaults to 1, increments/decrements, and floors at 1',
    { tag: '@regression' },
    async ({ homePage, productDetailPage }) => {
      await homePage.goto();
      await homePage.clickProductCard(0);

      await expect(productDetailPage.quantityInput).toHaveValue('1');

      await productDetailPage.decreaseQuantity(1);
      await expect(productDetailPage.quantityInput).toHaveValue('1');

      await productDetailPage.increaseQuantity(2);
      await expect(productDetailPage.quantityInput).toHaveValue('3');

      await productDetailPage.decreaseQuantity(1);
      await expect(productDetailPage.quantityInput).toHaveValue('2');
    },
  );

  // The §5.3 AC documents a [1, 999999999] clamp, but production actually clamps
  // manual entry to [1, 99] (verified live — see test_plan.md §12). Assert the
  // real bounds.
  test(
    'manual quantity entry is clamped to [1, 99]',
    { tag: '@regression' },
    async ({ homePage, productDetailPage }) => {
      await homePage.goto();
      await homePage.clickProductCard(0);

      await productDetailPage.setQuantity('0');
      await expect(productDetailPage.quantityInput).toHaveValue('1');

      await productDetailPage.setQuantity('100000');
      await expect(productDetailPage.quantityInput).toHaveValue('99');

      await productDetailPage.setQuantity('50');
      await expect(productDetailPage.quantityInput).toHaveValue('50');
    },
  );

  test(
    'adding to cart shows a confirmation and updates the cart badge',
    { tag: ['@smoke', '@regression'] },
    async ({ homePage, productDetailPage }) => {
      await homePage.goto();
      await homePage.clickProductCard(0);

      await productDetailPage.addToCart();

      await expect(productDetailPage.cartToast).toHaveText(
        'Product added to shopping cart.',
      );
      await expect(productDetailPage.bookmarks.cartQuantity).toHaveText('1');
    },
  );

  test(
    'out-of-stock product disables add-to-cart and shows the out-of-stock label',
    { tag: '@regression' },
    async ({ homePage, productDetailPage }) => {
      await homePage.goto();
      const found = await homePage.findOutOfStockCardAcrossPages();
      expect(found).toBe(true);

      await homePage.outOfStockCard.click();

      await expect(productDetailPage.addToCartButton).toBeDisabled();
      await expect(productDetailPage.outOfStockLabel).toHaveText(
        'Out of stock',
      );
      await expect(productDetailPage.outOfStockLabel).toHaveClass(
        /text-danger/,
      );
    },
  );

  test(
    'detail page shows a related products section',
    { tag: '@regression' },
    async ({ homePage, productDetailPage }) => {
      await homePage.goto();
      await homePage.clickProductCard(0);

      await expect(productDetailPage.relatedProductsHeading).toBeVisible();
      await expect(productDetailPage.relatedProductCards.first()).toBeVisible();
    },
  );
});
