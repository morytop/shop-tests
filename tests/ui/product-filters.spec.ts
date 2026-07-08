import { expect, test } from '@src/merge.fixture';
import { HomePage } from '@src/ui/pages/home.page';
import { parsePrice } from '@src/ui/utils/price.util';
import { isSorted, isSortedByString } from '@src/ui/utils/sort.util';

// test_plan.md §5.1 Product Overview / Home — category/brand filters, sorting, price range
test.describe('Verify product overview / home — filters, sort, price range', () => {
  test(
    'selecting one category narrows the grid',
    { tag: ['@regression', '@product-overview'] },
    async ({ homePage }) => {
      await homePage.goto();
      await expect(homePage.productCards.first()).toBeVisible();
      const baselineNames = await homePage.getProductNames();

      await homePage.childCategoryCheckboxes.first().check();

      await expect
        .poll(() => homePage.getProductNames())
        .not.toEqual(baselineNames);
      const filteredNames = await homePage.getProductNames();
      expect(filteredNames.length).toBeGreaterThan(0);
    },
  );

  test(
    'selecting a parent category auto-checks its children',
    { tag: ['@regression', '@product-overview'] },
    async ({ homePage }) => {
      await homePage.goto();

      await homePage.topLevelCategoryCheckboxes.first().check();

      const checkedChildCount =
        await homePage.checkedChildCategoryCheckboxes.count();
      expect(checkedChildCount).toBeGreaterThan(0);
    },
  );

  test(
    'unchecking all children unchecks the parent',
    { tag: ['@regression', '@product-overview'] },
    async ({ homePage }) => {
      await homePage.goto();
      await homePage.topLevelCategoryCheckboxes.first().check();

      const checkedChildCount =
        await homePage.checkedChildCategoryCheckboxes.count();
      for (let i = checkedChildCount - 1; i >= 0; i--) {
        await homePage.checkedChildCategoryCheckboxes.nth(i).uncheck();
      }

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

      await homePage.brandCheckboxes.first().check();

      await expect
        .poll(() => homePage.getProductNames())
        .not.toEqual(baselineNames);
      const filteredNames = await homePage.getProductNames();
      expect(filteredNames.length).toBeGreaterThan(0);
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

  // The four sort options share one shape — apply a sort, then poll until the grid
  // is ordered — so each case carries its own read-and-check closure (a conditional
  // on name-vs-price would not be allowed inside a test body).
  const sortCases: {
    label: string;
    sortValue: string;
    isOrdered: (home: HomePage) => Promise<boolean>;
  }[] = [
    {
      label: 'Name (A-Z)',
      sortValue: 'name,asc',
      isOrdered: async (home: HomePage): Promise<boolean> =>
        isSortedByString(await home.getProductNames(), 'asc'),
    },
    {
      label: 'Name (Z-A)',
      sortValue: 'name,desc',
      isOrdered: async (home: HomePage): Promise<boolean> =>
        isSortedByString(await home.getProductNames(), 'desc'),
    },
    {
      label: 'Price (Low-High)',
      sortValue: 'price,asc',
      isOrdered: async (home: HomePage): Promise<boolean> =>
        isSorted(
          (await home.getProductPrices()).map(parsePrice),
          (a, b) => a <= b,
        ),
    },
    {
      label: 'Price (High-Low)',
      sortValue: 'price,desc',
      isOrdered: async (home: HomePage): Promise<boolean> =>
        isSorted(
          (await home.getProductPrices()).map(parsePrice),
          (a, b) => a >= b,
        ),
    },
  ];

  for (const { label, sortValue, isOrdered } of sortCases) {
    test(
      `sorting by ${label} produces a correctly ordered grid`,
      { tag: ['@regression', '@product-overview'] },
      async ({ homePage }) => {
        await homePage.goto();
        await expect(homePage.productCards.first()).toBeVisible();

        await homePage.sortBy(sortValue);

        await expect.poll(() => isOrdered(homePage)).toBe(true);
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
      await expect
        .poll(async () => {
          const prices = (await homePage.getProductPrices()).map(parsePrice);
          return (
            prices.length > 0 && prices.every((price) => price <= maxValue)
          );
        })
        .toBe(true);
    },
  );
});
