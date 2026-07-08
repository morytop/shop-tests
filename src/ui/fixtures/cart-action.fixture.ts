import { pageObjectTest } from './page-object.fixture';

export interface CartActions {
  addProductToCart: (
    index?: number,
    expectedBadgeCount?: string,
  ) => Promise<void>;
}

// Extends the page-object fixtures with the add-to-cart arrange trio shared by the
// cart and checkout-billing specs: open home, add the product at `index`, and wait
// for the cart badge to reach `expectedBadgeCount` (the running cart total, so a
// second add in the same test awaits '2', not '1'). Opening the cart / proceeding to
// checkout stays in the test, since where those happen varies per case.
export const cartActionTest = pageObjectTest.extend<CartActions>({
  addProductToCart: async ({ homePage, productDetailPage }, use) => {
    await use(async (index = 0, expectedBadgeCount = '1'): Promise<void> => {
      await homePage.goto();
      await homePage.clickProductCard(index);
      await productDetailPage.addToCartAndAwaitBadge(expectedBadgeCount);
    });
  },
});
