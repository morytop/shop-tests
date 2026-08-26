import { expect, test } from '@src/fixtures/merge.fixture';
import { categories } from '@src/ui/test-data/category.data';
import { expectGridSorted } from '@src/ui/utils/grid-assert.util';

test.describe('Verify browse by category', () => {
  for (const { name, url } of categories) {
    test(
      `${name} nav link opens its category page titled by the category name`,
      { tag: ['@regression', '@category'] },
      async ({
        homePage,
        handToolsPage,
        navbar,
        powerToolsPage,
        otherPage,
        specialToolsPage,
        page,
      }) => {
        const navLinks = {
          'Hand Tools': navbar.handToolsNavLink,
          'Power Tools': navbar.powerToolsNavLink,
          Other: navbar.otherNavLink,
          'Special Tools': navbar.specialToolsNavLink,
        };
        const categoryHeadings = {
          'Hand Tools': handToolsPage.heading,
          'Power Tools': powerToolsPage.heading,
          Other: otherPage.heading,
          'Special Tools': specialToolsPage.heading,
        };

        await homePage.goto();

        await navbar.openCategories();
        await navLinks[name].click();
        await expect(page).toHaveURL(url);
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

      await expectGridSorted(handToolsPage, 'price', 'asc');
    },
  );

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
      await expect(handToolsPage.productCards.first()).toBeVisible();
      const page1Names = await handToolsPage.getProductNames();

      await handToolsPage.goToPage(2);
      const page2Names = await handToolsPage.getProductNames();

      expect(
        page2Names,
        'page 2 shows the same product names as page 1',
      ).not.toEqual(page1Names);
    },
  );
});
