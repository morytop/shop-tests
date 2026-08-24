import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { API_PATHS } from '@src/api/utils/api.util';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { waitForApi } from '@src/ui/utils/network.util';

export class FavoritesPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.FAVORITES;
  readonly pageTitle: Locator;
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
    this.pageTitle = this.page.getByTestId('page-title');
    // The empty-state message carries no `data-test` and no role of its own; the only
    // thing distinguishing it from a favorite is that it is not a card.
    this.emptyMessage = favoritesRoot.locator('div.col > div:not(.card)');
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
    await Promise.all([
      waitForApi(this.page, API_PATHS.FAVORITES, { method: 'GET' }),
      this.goto(),
    ]);
  }

  async removeFavorite(index: number): Promise<void> {
    await this.deleteButtons.nth(index).click();
  }
}
