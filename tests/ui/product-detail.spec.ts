import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import { expect, test } from '@src/merge.fixture';

// User Stories v5 — Product Detail (test_plan.md §5.3), core subset:
// display fields, quantity stepper + manual clamp, add-to-cart, out-of-stock,
// related products, favorites. Discount and the rental slider are deferred (see
// .ai-docs/product-detail-core-plan.md). Detail pages are reached by clicking a
// live product card (never a hard-coded id) per §9.
//
// Card selection (§28): the catalog is shared, mutable production data, so the three
// tests that drive *cart* controls pick their product by stock rather than by grid
// position — an out-of-stock product PATCHed to the front of the grid disables those
// controls, which is exactly how they broke once. Tests indifferent to stock (display
// fields, related products, favorites) still take the first card.
//
// Favorites (§27): the component fires `POST /favorites` unconditionally and picks its
// toast from the server's reply — 201 → success, 409 → duplicate, 401 → unauthorized —
// so each favorites test asserts the status alongside the copy. Adding a favorite
// mutates the account, so those tests register their own throwaway user and log in
// inline; never `testUser1` (it IS the shared seeded `customer@` account) or the
// `@logged` storageState session user.
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
      const found = await homePage.findInStockCardAcrossPages();
      expect(found).toBe(true);
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

  // The §5.3 AC documents a [1, 999999999] clamp, but production actually clamps
  // manual entry to [1, 99] (verified live — see test_plan.md §12). Assert the
  // real bounds.
  test(
    'manual quantity entry is clamped to [1, 99]',
    { tag: '@regression' },
    async ({ homePage, productDetailPage }) => {
      await homePage.goto();
      const found = await homePage.findInStockCardAcrossPages();
      expect(found).toBe(true);
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
    async ({ homePage, productDetailPage }) => {
      await homePage.goto();
      const found = await homePage.findInStockCardAcrossPages();
      expect(found).toBe(true);
      await homePage.inStockCard.click();

      await productDetailPage.addToCart();

      await expect(productDetailPage.successToast).toHaveText(
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

  // §5.3 favorites, logged in — the happy path.
  test(
    'adding a product to favorites shows a success message',
    { tag: ['@auth', '@favorites', '@regression'] },
    async ({
      accountPage,
      homePage,
      loginPage,
      productDetailPage,
      usersRequest,
    }) => {
      const user = await registerUserWithApi(usersRequest);

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.title.waitFor();
      await homePage.goto();
      await homePage.clickProductCard(0);

      const status = await productDetailPage.addToFavoritesAndAwaitResponse();

      expect(status).toBe(201);
      await expect(productDetailPage.successToast).toHaveText(
        'Product added to your favorites list.',
      );
      await expect(productDetailPage.errorToast).toHaveCount(0);
    },
  );

  // §5.3 favorites, logged in — re-adding the same product. The server rejects the
  // duplicate with 409; the success toast from the first add may still be on screen, so
  // the assertion targets the error toast specifically (§27).
  test(
    'adding the same product to favorites twice reports it is already there',
    { tag: ['@auth', '@favorites', '@regression'] },
    async ({
      accountPage,
      homePage,
      loginPage,
      productDetailPage,
      usersRequest,
    }) => {
      const user = await registerUserWithApi(usersRequest);

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.title.waitFor();
      await homePage.goto();
      await homePage.clickProductCard(0);
      const firstStatus =
        await productDetailPage.addToFavoritesAndAwaitResponse();

      const secondStatus =
        await productDetailPage.addToFavoritesAndAwaitResponse();

      expect(firstStatus).toBe(201);
      expect(secondStatus).toBe(409);
      await expect(productDetailPage.errorToast).toHaveText(
        'Product already in your favorites list.',
      );
    },
  );

  // §5.3 favorites, logged out. There is no client-side guard: the POST is fired and
  // rejected server-side with 401, so "does not persist anything" is asserted as the
  // rejected status plus the absence of a success toast (§27).
  test(
    'adding to favorites while logged out is rejected as unauthorized',
    { tag: ['@favorites', '@regression'] },
    async ({ homePage, productDetailPage }) => {
      await homePage.goto();
      await homePage.clickProductCard(0);

      const status = await productDetailPage.addToFavoritesAndAwaitResponse();

      expect(status).toBe(401);
      await expect(productDetailPage.errorToast).toHaveText(
        'Unauthorized, can not add product to your favorite list.',
      );
      await expect(productDetailPage.successToast).toHaveCount(0);
    },
  );
});
