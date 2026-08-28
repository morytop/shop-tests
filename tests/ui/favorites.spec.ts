import { addFavoritesWithApi } from '@src/api/factories/favorite.api.factory';
import { expect, test } from '@src/fixtures/merge.fixture';
import { truncate } from '@src/ui/utils/text.util';

test.describe('Verify favorites', () => {
  test(
    'show the empty state for a user with no favorites',
    { tag: ['@auth', '@favorites', '@regression'] },
    async ({ favoritesPage, loginAsFreshUser }) => {
      await loginAsFreshUser();

      await favoritesPage.gotoAndAwaitLoaded();

      await expect(favoritesPage.pageTitle).toHaveText('Favorites');
      await expect(favoritesPage.emptyMessage).toBeVisible();
      await expect(favoritesPage.favoriteCards).toHaveCount(0);
    },
  );

  test(
    'show a product favorited from its detail page',
    { tag: ['@auth', '@favorites', '@regression'] },
    async ({
      favoritesPage,
      homePage,
      loginAsFreshUser,
      productDetailPage,
    }) => {
      await loginAsFreshUser();

      await homePage.goto();
      await homePage.clickProductCard(0);
      const productName = await productDetailPage.productName.innerText();
      const productDescription =
        await productDetailPage.productDescription.innerText();

      await productDetailPage.addToFavorites();
      await favoritesPage.gotoAndAwaitLoaded();

      await expect(favoritesPage.favoriteCards).toHaveCount(1);
      await expect(favoritesPage.emptyMessage).toHaveCount(0);
      await expect(favoritesPage.favoriteNames).toHaveText([productName]);
      await expect(favoritesPage.favoriteDescriptions).toHaveText([
        truncate(productDescription),
      ]);
      await expect(favoritesPage.favoriteImages).toBeVisible();
      await expect(favoritesPage.favoriteImages).toHaveAttribute(
        'alt',
        productName,
      );
    },
  );

  test(
    'remove a favorite and update the list immediately',
    { tag: ['@auth', '@favorites', '@regression'] },
    async ({ favoritesPage, loginAsFreshUser, request }) => {
      const user = await loginAsFreshUser();
      await addFavoritesWithApi(request, user, 2);

      await favoritesPage.gotoAndAwaitLoaded();
      await expect(favoritesPage.favoriteCards).toHaveCount(2);
      const [removedName, remainingName] =
        await favoritesPage.favoriteNames.allInnerTexts();

      await favoritesPage.removeFavorite(0);

      await expect(favoritesPage.favoriteCards).toHaveCount(1);
      await expect(favoritesPage.favoriteNames).toHaveText([remainingName]);
      await expect(favoritesPage.favoriteCardByName(removedName)).toHaveCount(
        0,
      );
    },
  );
});
