import { expect, test } from '@src/fixtures/merge.fixture';
import { BARE_PRICE_REGEX } from '@src/ui/constants/formats';

test.describe('Verify product detail', () => {
  test(
    'detail page shows image, name, price, description, category and brand',
    { tag: '@regression' },
    async ({ homePage, productDetailPage }) => {
      await homePage.goto();

      await homePage.clickProductCard(0);

      await expect(productDetailPage.productImage).toBeVisible();
      await expect(productDetailPage.productName).not.toBeEmpty();
      await expect(productDetailPage.productPrice).toHaveText(BARE_PRICE_REGEX);
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
      const found = await homePage.findInStockCardAcrossPages();
      expect(found, 'no in-stock product found across pages').toBe(true);
      await homePage.inStockCard.click();

      await expect(productDetailPage.quantityInput).toHaveValue('1');

      await productDetailPage.decreaseQuantity(1);
      await expect(productDetailPage.quantityInput).toHaveValue('1');

      await productDetailPage.increaseQuantity(2);
      await expect(productDetailPage.quantityInput).toHaveValue('3');

      await productDetailPage.decreaseQuantity(1);
      await expect(productDetailPage.quantityInput).toHaveValue('2');
    },
  );

  test(
    'manual quantity entry is clamped to [1, 99]',
    { tag: '@regression' },
    async ({ homePage, productDetailPage }) => {
      await homePage.goto();
      const found = await homePage.findInStockCardAcrossPages();
      expect(found, 'no in-stock product found across pages').toBe(true);
      await homePage.inStockCard.click();

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
    async ({ homePage, productDetailPage, navbar }) => {
      await homePage.goto();
      const found = await homePage.findInStockCardAcrossPages();
      expect(found, 'no in-stock product found across pages').toBe(true);
      await homePage.inStockCard.click();

      await productDetailPage.addToCart();

      await expect(
        productDetailPage.toastWithText('Product added to shopping cart.'),
      ).toBeVisible();
      await expect(navbar.cartQuantity).toHaveText('1');
    },
  );

  test(
    'out-of-stock product disables add-to-cart and shows the out-of-stock label',
    { tag: '@regression' },
    async ({ homePage, productDetailPage }) => {
      await homePage.goto();
      const found = await homePage.findOutOfStockCardAcrossPages();
      expect(found, 'no out-of-stock product found across pages').toBe(true);

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

  test(
    'adding a product to favorites shows a success message',
    { tag: ['@auth', '@favorites', '@regression'] },
    async ({ homePage, loginAsFreshUser, productDetailPage }) => {
      await loginAsFreshUser();

      await homePage.goto();
      await homePage.clickProductCard(0);

      const status = await productDetailPage.addToFavorites();

      expect(status, 'favorites POST should answer 201 Created').toBe(201);
      await expect(
        productDetailPage.toastWithText(
          'Product added to your favorites list.',
        ),
      ).toBeVisible();
    },
  );

  test(
    'adding the same product to favorites twice reports it is already there',
    { tag: ['@auth', '@favorites', '@regression'] },
    async ({ homePage, loginAsFreshUser, productDetailPage }) => {
      await loginAsFreshUser();

      await homePage.goto();
      await homePage.clickProductCard(0);
      const firstStatus = await productDetailPage.addToFavorites();

      const secondStatus = await productDetailPage.addToFavorites();

      expect(firstStatus, 'arranging add should answer 201 Created').toBe(201);
      expect(
        secondStatus,
        'duplicate favorites POST should answer 409 Conflict',
      ).toBe(409);
      await expect(
        productDetailPage.toastWithText(
          'Product already in your favorites list.',
        ),
      ).toBeVisible();
    },
  );

  test(
    'adding to favorites while logged out is rejected as unauthorized',
    { tag: ['@favorites', '@regression'] },
    async ({ homePage, productDetailPage }) => {
      await homePage.goto();
      await homePage.clickProductCard(0);

      const status = await productDetailPage.addToFavorites();

      expect(
        status,
        'logged-out favorites POST should answer 401 Unauthorized',
      ).toBe(401);
      await expect(
        productDetailPage.toastWithText(
          'Unauthorized, can not add product to your favorite list.',
        ),
      ).toBeVisible();
    },
  );
});
