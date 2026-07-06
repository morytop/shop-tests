import { test } from '../src/fixtures/main';
import { expect } from '@playwright/test';

test.describe('Verify product overview / home', () => {
  test(
    'product grid renders with image, name, and price for each card',
    { tag: ['@smoke', '@regression'] },
    async ({ homePage }) => {
      await homePage.goto();

      await expect(homePage.productCards.first()).toBeVisible();
      const cardCount = await homePage.productCards.count();
      expect(cardCount).toBeGreaterThan(0);

      await expect(homePage.productCardImages.first()).toBeVisible();
      await expect(homePage.productCardNames.first()).not.toBeEmpty();
      await expect(homePage.productCardPrices.first()).toHaveText(
        /^\$\d+\.\d{2}$/,
      );
    },
  );

  test(
    'clicking a product card navigates to its detail page',
    { tag: '@regression' },
    async ({ homePage, page }) => {
      await homePage.goto();

      await homePage.clickProductCard(0);

      await expect(page).toHaveURL(/\/product\/[A-Za-z0-9]+/);
    },
  );

  test(
    'page 2 shows different products than page 1',
    { tag: '@regression' },
    async ({ homePage }) => {
      await homePage.goto();
      const page1Names = await homePage.getProductNames();

      await homePage.goToPage(2);
      const page2Names = await homePage.getProductNames();

      expect(page2Names).not.toEqual(page1Names);
    },
  );

  test(
    "last page's next pagination control is disabled",
    { tag: '@regression' },
    async ({ homePage }) => {
      await homePage.goto();

      await homePage.goToLastPage();

      await expect(homePage.paginationNextItem).toHaveClass(/disabled/);
    },
  );

  test(
    'out-of-stock product card shows "Out of stock" label',
    { tag: '@regression' },
    async ({ homePage }) => {
      await homePage.goto();

      const found = await homePage.findOutOfStockCardAcrossPages();

      expect(found).toBe(true);
      await expect(homePage.outOfStockLabels.first()).toHaveText(
        'Out of stock',
      );
    },
  );
});
