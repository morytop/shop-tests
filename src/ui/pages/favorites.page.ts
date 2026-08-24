import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { API_PATHS } from '@src/api/utils/api.util';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

export class FavoritesPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.FAVORITES;
  readonly emptyMessage: Locator;
  readonly favoriteCards: Locator;
  readonly favoriteCardByName: (name: string) => Locator;
  readonly favoriteImages: Locator;
  readonly favoriteNames: Locator;
  readonly favoriteDescriptions: Locator;
  readonly deleteButtons: Locator;

  constructor(page: Page) {
    super(page);
    const favoritesRoot = this.page.locator('app-favorites');
    // The empty-state message carries no `data-test` and no role of its own — a bare
    // `<div>` with the copy as its only content — so exact text is the only handle.
    this.emptyMessage = favoritesRoot.getByText(
      'There are no favorites yet. In order to add favorites, please go to the product listing and mark some products as your favorite.',
      { exact: true },
    );
    // `data-test` holds the *favorite's* id, not the product's, so match on the prefix.
    this.favoriteCards = favoritesRoot.locator(
      'div.card[data-test^="favorite-"]',
    );
    this.favoriteCardByName = (name: string): Locator =>
      this.favoriteCards.filter({ hasText: name });
    this.favoriteImages = this.favoriteCards.getByRole('img');
    this.favoriteNames = this.favoriteCards.getByTestId('product-name');
    this.favoriteDescriptions = this.favoriteCards.getByTestId(
      'product-description',
    );
    this.deleteButtons = this.favoriteCards.getByTestId('delete');
  }

  async gotoAndAwaitLoaded(): Promise<void> {
    await this.gotoAndAwaitApi(API_PATHS.FAVORITES, { method: 'GET' });
  }

  async removeFavorite(index: number): Promise<void> {
    await this.deleteButtons.nth(index).click();
  }
}
