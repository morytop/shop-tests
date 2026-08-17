import { expect, test } from '@src/fixtures/merge.fixture';
import {
  expectGridSorted,
  expectPricesAtMost,
} from '@src/ui/utils/grid-assert.util';

// TEST_PLAN.md §5.1 Product Overview / Home — category/brand filters, sorting, price range
test.describe('Verify product overview / home — filters, sort, price range', () => {
  test(
    'selecting one category narrows the grid',
    { tag: ['@regression', '@product-overview'] },
    async ({ homePage }) => {
      await homePage.goto();
      await expect(homePage.productCards.first()).toBeVisible();
      const baselineNames = await homePage.getProductNames();

      await homePage.filterByChildCategory(0);

      await expect(homePage.productCardNames).not.toHaveText(baselineNames);
      await expect(homePage.productCards.first()).toBeVisible();
    },
  );

  test(
    'selecting a parent category auto-checks its children',
    { tag: ['@regression', '@product-overview'] },
    async ({ homePage }) => {
      await homePage.goto();

      await homePage.topLevelCategoryCheckboxes.first().check();

      await expect(
        homePage.checkedChildCategoryCheckboxes.first(),
      ).toBeVisible();
    },
  );

  test(
    'unchecking all children unchecks the parent',
    { tag: ['@regression', '@product-overview'] },
    async ({ homePage }) => {
      await homePage.goto();
      await homePage.topLevelCategoryCheckboxes.first().check();

      await homePage.clearAllChildCategoryFilters();

      await expect(
        homePage.topLevelCategoryCheckboxes.first(),
      ).not.toBeChecked();
    },
  );

  test(
    'selecting a brand narrows the grid',
    { tag: ['@regression', '@product-overview'] },
    async ({ homePage }) => {
      await homePage.goto();
      await expect(homePage.productCards.first()).toBeVisible();
      const baselineNames = await homePage.getProductNames();

      await homePage.filterByBrand(0);

      await expect(homePage.productCardNames).not.toHaveText(baselineNames);
      await expect(homePage.productCards.first()).toBeVisible();
    },
  );

  test(
    'combined category and brand filters apply as an intersection',
    { tag: ['@regression', '@product-overview'] },
    async ({ homePage }) => {
      await homePage.goto();
      await expect(homePage.productCards.first()).toBeVisible();

      // Collect each filter's full result set in isolation, then together.
      await homePage.filterByChildCategory(0);
      const categoryOnlyNames = new Set(
        await homePage.getAllProductNamesAcrossPages(),
      );

      await homePage.clearChildCategoryFilter(0);
      await homePage.filterByBrand(0);
      const brandOnlyNames = new Set(
        await homePage.getAllProductNamesAcrossPages(),
      );

      await homePage.filterByChildCategory(0);
      const combinedNames = await homePage.getAllProductNamesAcrossPages();

      // Category + brand together must yield exactly the set-intersection of
      // the two filters applied alone — no more (union) and no less.
      const expectedIntersection = [...categoryOnlyNames]
        .filter((name) => brandOnlyNames.has(name))
        .sort();
      expect([...combinedNames].sort()).toEqual(expectedIntersection);
    },
  );

  // The four sort options share one shape — apply a sort, then assert the grid
  // is ordered — so the cases reduce to field + direction; the name-vs-price
  // read lives inside expectGridSorted, where conditionals are allowed.
  const sortCases = [
    ['name', 'asc', 'Name (A-Z)'],
    ['name', 'desc', 'Name (Z-A)'],
    ['price', 'asc', 'Price (Low-High)'],
    ['price', 'desc', 'Price (High-Low)'],
  ] as const;

  for (const [field, direction, label] of sortCases) {
    test(
      `sorting by ${label} produces a correctly ordered grid`,
      { tag: ['@regression', '@product-overview'] },
      async ({ homePage }) => {
        await homePage.goto();
        await expect(homePage.productCards.first()).toBeVisible();

        await homePage.sortBy(`${field},${direction}`);

        await expectGridSorted(homePage, field, direction);
      },
    );
  }

  test(
    'lowering the price range max filters out pricier products',
    { tag: ['@regression', '@product-overview'] },
    async ({ homePage }) => {
      await homePage.goto();
      await expect(homePage.productCards.first()).toBeVisible();

      await homePage.decreasePriceRangeMax(50);

      const maxValue = Number(await homePage.getPriceRangeMaxValue());
      await expectPricesAtMost(homePage, maxValue);
    },
  );
});
