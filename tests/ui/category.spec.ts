import { expect, test } from '@src/merge.fixture';
import { categories } from '@src/ui/test-data/category.data';
import { parsePrice } from '@src/ui/utils/price.util';
import { isSorted } from '@src/ui/utils/sort.util';

// test_plan.md §5.2 Browse by Category
test.describe('Verify browse by category', () => {
  for (const { name, slug } of categories) {
    test(
      `${name} nav link opens its category page titled by the category name`,
      { tag: ['@regression', '@category'] },
      async ({
        homePage,
        handToolsPage,
        powerToolsPage,
        otherPage,
        specialToolsPage,
        page,
      }) => {
        const navLinks = {
          'Hand Tools': homePage.bookmarks.handToolsNavLink,
          'Power Tools': homePage.bookmarks.powerToolsNavLink,
          Other: homePage.bookmarks.otherNavLink,
          'Special Tools': homePage.bookmarks.specialToolsNavLink,
        };
        const categoryHeadings = {
          'Hand Tools': handToolsPage.heading,
          'Power Tools': powerToolsPage.heading,
          Other: otherPage.heading,
          'Special Tools': specialToolsPage.heading,
        };

        await homePage.goto();

        await homePage.bookmarks.openCategories();
        await navLinks[name].click();

        // The on-page "Category: <Name>" heading is the reliable cross-category
        // title signal, so it is the assertion used for all four categories.
        // The document <title> is intentionally not checked here: Special Tools
        // renders the heading but never updates <title> (see test_plan.md §11),
        // so a shared toHaveTitle would be a false negative for it. The <title>
        // is instead covered by smoke/menu.spec.ts for Hand/Power/Other, which
        // asserts Special Tools via its heading for that same reason.
        await expect(page).toHaveURL(new RegExp(`/category/${slug}$`));
        await expect(categoryHeadings[name]).toBeVisible();
      },
    );
  }

  test(
    'category page sorts its grid by Price (Low - High)',
    { tag: ['@regression', '@category'] },
    async ({ handToolsPage }) => {
      await handToolsPage.goto();
      await expect(handToolsPage.productCards.first()).toBeVisible();

      await handToolsPage.sortBy('price,asc');

      await expect
        .poll(async () => {
          const prices = (await handToolsPage.getProductPrices()).map(
            parsePrice,
          );
          return isSorted(prices, (a, b) => a <= b);
        })
        .toBe(true);
    },
  );

  // Discrepancy vs test_plan.md §5.2 / §9: unlike the overview page, the
  // category page's sidebar omits the Price Range slider and the Search box —
  // it exposes only Sort, category/brand filters, and pagination. This codifies
  // that absence so a future app change re-adding them is caught.
  test(
    'category page omits the price range slider and search box',
    { tag: ['@regression', '@category'] },
    async ({ handToolsPage }) => {
      await handToolsPage.goto();
      await expect(handToolsPage.productCards.first()).toBeVisible();

      await expect(handToolsPage.priceRangeMinHandle).toHaveCount(0);
      await expect(handToolsPage.priceRangeMaxHandle).toHaveCount(0);
      await expect(handToolsPage.searchInput).toHaveCount(0);
    },
  );

  test(
    'category page paginates to a different set of products on page 2',
    { tag: ['@regression', '@category'] },
    async ({ handToolsPage }) => {
      await handToolsPage.goto();
      const page1Names = await handToolsPage.getProductNames();

      await handToolsPage.goToPage(2);
      const page2Names = await handToolsPage.getProductNames();

      expect(page2Names).not.toEqual(page1Names);
    },
  );
});
