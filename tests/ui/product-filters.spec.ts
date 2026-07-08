import { expect, test } from '@src/merge.fixture';

function parsePrice(price: string): number {
  return Number(price.replace('$', ''));
}

function isSortedBy(
  values: number[],
  comparator: (a: number, b: number) => boolean,
): boolean {
  return values.every(
    (value, i) => i === 0 || comparator(values[i - 1], value),
  );
}

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

  test(
    'sorting by Name (A-Z) produces an alphabetically ascending grid',
    { tag: ['@regression', '@product-overview'] },
    async ({ homePage }) => {
      await homePage.goto();
      await expect(homePage.productCards.first()).toBeVisible();

      await homePage.sortBy('name,asc');

      await expect
        .poll(async () => {
          const names = await homePage.getProductNames();
          return names.every(
            (name, i) => i === 0 || name.localeCompare(names[i - 1]) >= 0,
          );
        })
        .toBe(true);
    },
  );

  test(
    'sorting by Name (Z-A) produces an alphabetically descending grid',
    { tag: ['@regression', '@product-overview'] },
    async ({ homePage }) => {
      await homePage.goto();
      await expect(homePage.productCards.first()).toBeVisible();

      await homePage.sortBy('name,desc');

      await expect
        .poll(async () => {
          const names = await homePage.getProductNames();
          return names.every(
            (name, i) => i === 0 || name.localeCompare(names[i - 1]) <= 0,
          );
        })
        .toBe(true);
    },
  );

  test(
    'sorting by Price (Low-High) produces an ascending grid',
    { tag: ['@regression', '@product-overview'] },
    async ({ homePage }) => {
      await homePage.goto();
      await expect(homePage.productCards.first()).toBeVisible();

      await homePage.sortBy('price,asc');

      await expect
        .poll(async () => {
          const prices = (await homePage.getProductPrices()).map(parsePrice);
          return isSortedBy(prices, (a, b) => a <= b);
        })
        .toBe(true);
    },
  );

  test(
    'sorting by Price (High-Low) produces a descending grid',
    { tag: ['@regression', '@product-overview'] },
    async ({ homePage }) => {
      await homePage.goto();
      await expect(homePage.productCards.first()).toBeVisible();

      await homePage.sortBy('price,desc');

      await expect
        .poll(async () => {
          const prices = (await homePage.getProductPrices()).map(parsePrice);
          return isSortedBy(prices, (a, b) => a >= b);
        })
        .toBe(true);
    },
  );

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
