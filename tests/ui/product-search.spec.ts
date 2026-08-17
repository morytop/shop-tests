import { expect, test } from '@src/fixtures/merge.fixture';

// TEST_PLAN.md §5.1 Product Overview / Home — search
test.describe('Verify product overview / home — search', () => {
  test(
    'valid search query filters the grid to matching products only',
    { tag: ['@regression', '@product-overview'] },
    async ({ homePage }) => {
      await homePage.goto();
      await expect(homePage.productCards.first()).toBeVisible();
      // The term is read off a live card, never hard-coded (§3). Server search
      // matches product names only (verified live: a description-only word
      // returns zero hits), so "every card's name contains the term" is the
      // faithful invariant.
      const searchTerm = (
        await homePage.productCardNames.first().innerText()
      ).trim();

      await homePage.search(searchTerm);

      await expect(homePage.productCards.first()).toBeVisible();
      await expect(
        homePage.productCardsNotMatchingName(searchTerm),
      ).toHaveCount(0);
    },
  );

  test(
    'submitting a new search clears a previously active filter',
    { tag: ['@regression', '@product-overview'] },
    async ({ homePage }) => {
      await homePage.goto();
      const searchTerm = (
        await homePage.productCardNames.first().innerText()
      ).trim();
      await homePage.filterByBrand(0);
      await expect(homePage.brandCheckboxes.first()).toBeChecked();

      await homePage.search(searchTerm);

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

      // submitSearch, not search: the app rejects the query client-side and
      // never fires the request search() would await.
      await homePage.submitSearch('e');

      await expect(homePage.searchInput).toHaveClass(/ng-invalid/);
      const namesAfterSearch = await homePage.getProductNames();
      expect(
        namesAfterSearch,
        'grid changed after a rejected short query',
      ).toEqual(namesBeforeSearch);
    },
  );
});
