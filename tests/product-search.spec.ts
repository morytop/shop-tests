import { test } from '../src/fixtures/main';
import { expect } from '@playwright/test';

// test_plan.md §5.1 Product Overview / Home — search
test.describe('Verify product overview / home — search', () => {
  test(
    'valid search query filters the grid to matching products only',
    { tag: ['@regression', '@product-overview'] },
    async ({ homePage }) => {
      await homePage.goto();
      await expect(homePage.productCards.first()).toBeVisible();

      await homePage.search('pliers');

      await expect
        .poll(async () => {
          const names = await homePage.getProductNames();
          return (
            names.length > 0 &&
            names.every((name) => name.toLowerCase().includes('pliers'))
          );
        })
        .toBe(true);
    },
  );

  test(
    'submitting a new search clears a previously active filter',
    { tag: ['@regression', '@product-overview'] },
    async ({ homePage }) => {
      await homePage.goto();
      await homePage.brandCheckboxes.first().check();
      await expect(homePage.brandCheckboxes.first()).toBeChecked();

      await homePage.search('pliers');

      await expect(homePage.brandCheckboxes.first()).not.toBeChecked();
    },
  );

  test(
    'search query shorter than 3 characters is rejected or ignored',
    { tag: ['@regression', '@product-overview'] },
    async ({ homePage }) => {
      await homePage.goto();
      await expect(homePage.productCards.first()).toBeVisible();
      const namesBeforeSearch = await homePage.getProductNames();

      await homePage.search('e');

      await expect(homePage.searchInput).toHaveClass(/ng-invalid/);
      const namesAfterSearch = await homePage.getProductNames();
      expect(namesAfterSearch).toEqual(namesBeforeSearch);
    },
  );
});
