import { addFavoritesWithApi } from '@src/api/factories/favorite.api.factory';
import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import { expect, test } from '@src/merge.fixture';
import { truncate } from '@src/ui/utils/text.util';

// User Stories v5 — Favorites (TEST_PLAN.md §5.16). The favorites page is entered via
// `gotoAndAwaitLoaded()` in every test: the component renders its empty-state message
// while `GET /favorites` is still in flight, so a bare `goto()` makes "not loaded yet"
// look exactly like "no favorites" (§26).
//
// Data safety (§3): all three ACs mutate the account's favorites, so each registers its
// own throwaway user via the API and logs in inline. None may use `testUser1` (it IS the
// shared seeded `customer@` account) or ride the `@logged` storageState session, which
// `tests/setup/login.setup.ts` shares across every `@logged` spec in a run. AC1 also
// needs a guaranteed-empty list, which only a fresh user gives.
//
// The catalog is shared, mutable production data (§3/§9), so product names and
// descriptions are read off the live detail page rather than hard-coded.
//
// See TEST_PLAN.md §26 and .ai-docs/favorites-plan.md.

test.describe('Verify favorites', () => {
  // AC1 — a user with no favorites sees the empty-state message and no cards.
  test(
    'show the empty state for a user with no favorites',
    { tag: ['@auth', '@favorites', '@regression'] },
    async ({ accountPage, favoritesPage, loginPage, usersRequest }) => {
      const user = await registerUserWithApi(usersRequest);

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.pageTitle.waitFor();
      await favoritesPage.gotoAndAwaitLoaded();

      await expect(favoritesPage.pageTitle).toHaveText('Favorites');
      await expect(favoritesPage.emptyMessage).toHaveText(
        'There are no favorites yet. In order to add favorites, please go to the product listing and mark some products as your favorite.',
      );
      await expect(favoritesPage.favoriteCards).toHaveCount(0);
    },
  );

  // AC2 — a product favorited from its detail page surfaces on the favorites page with
  // its image, name, and description. The card's description is cut by the app's
  // `truncate: 250` pipe, so the expected text is derived from the full description
  // rather than asserted verbatim — this holds for short descriptions too, where the
  // pipe is the identity (§26).
  test(
    'show a product favorited from its detail page',
    { tag: ['@auth', '@favorites', '@regression'] },
    async ({
      accountPage,
      favoritesPage,
      homePage,
      loginPage,
      productDetailPage,
      usersRequest,
    }) => {
      const user = await registerUserWithApi(usersRequest);

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.pageTitle.waitFor();
      await homePage.goto();
      await homePage.clickProductCard(0);
      const productName = await productDetailPage.productName.innerText();
      const productDescription =
        await productDetailPage.productDescription.innerText();

      await productDetailPage.addToFavoritesAndAwaitResponse();
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

  // AC3 — removing a favorite updates the list in place. Deletion refetches the whole
  // list rather than splicing optimistically, so the auto-retrying count assertion is
  // what proves the card disappeared without a reload. The two names are read off the
  // rendered list rather than assumed from insertion order.
  //
  // The two favorites are arranged over the API (Phase G): favoriting through the UI
  // is AC2's subject, so here the add loop is pure precondition and the UI only drives
  // what this AC is about — the removal.
  test(
    'remove a favorite and update the list immediately',
    { tag: ['@auth', '@favorites', '@regression'] },
    async ({
      accountPage,
      favoritesPage,
      loginPage,
      request,
      usersRequest,
    }) => {
      const user = await registerUserWithApi(usersRequest);
      await addFavoritesWithApi(request, user, 2);

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.pageTitle.waitFor();
      await favoritesPage.gotoAndAwaitLoaded();
      await expect(favoritesPage.favoriteCards).toHaveCount(2);
      const [removedName, remainingName] =
        await favoritesPage.favoriteNames.allInnerTexts();

      await favoritesPage.removeFavorite(0);

      await expect(favoritesPage.favoriteCards).toHaveCount(1);
      await expect(favoritesPage.favoriteNames).toHaveText([remainingName]);
      await expect(
        favoritesPage.favoriteCards.filter({ hasText: removedName }),
      ).toHaveCount(0);
    },
  );
});
