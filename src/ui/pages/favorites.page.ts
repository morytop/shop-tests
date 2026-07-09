import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

/**
 * Customer favorites page (`/account/favorites`). Reachable only from the navbar user
 * menu or directly — the `/account` dashboard offers no favorites tile.
 *
 * The component initialises its list to `[]` and guards the empty-state message with
 * `@if (!favorites?.length)`, so that message is on screen *while* `GET /favorites` is
 * still in flight. Reading the page before that response lands therefore looks
 * identical to "this user has no favorites" — callers must enter via
 * `gotoAndAwaitLoaded()` rather than the inherited `goto()`.
 *
 * Card descriptions are truncated server-side of the DOM by the app's `TruncatePipe`
 * (250 chars + "..."), not by CSS — see `truncate()` in `src/ui/utils/text.util.ts`.
 */
export class FavoritesPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.FAVORITES;
  readonly title: Locator;
  readonly emptyMessage: Locator;
  readonly favoriteCards: Locator;
  readonly favoriteImages: Locator;
  readonly favoriteNames: Locator;
  readonly favoriteDescriptions: Locator;
  readonly deleteButtons: Locator;

  constructor(page: Page) {
    super(page);
    const favoritesRoot = this.page.locator('app-favorites');
    this.title = this.page.locator('[data-test="page-title"]');
    // The empty-state message carries no `data-test` and no role of its own; the only
    // thing distinguishing it from a favorite is that it is not a card.
    this.emptyMessage = favoritesRoot.locator('div.col > div:not(.card)');
    // `data-test` holds the *favorite's* id, not the product's, so match on the prefix.
    this.favoriteCards = favoritesRoot.locator(
      'div.card[data-test^="favorite-"]',
    );
    this.favoriteImages = this.favoriteCards.locator('img.card-img');
    this.favoriteNames = this.favoriteCards.locator(
      '[data-test="product-name"]',
    );
    this.favoriteDescriptions = this.favoriteCards.locator(
      '[data-test="product-description"]',
    );
    this.deleteButtons = this.favoriteCards.locator('[data-test="delete"]');
  }

  /**
   * Navigate and wait for the list to actually arrive. Without this gate the
   * empty-state message is indistinguishable from a not-yet-loaded list (see the
   * class doc), so an assertion on it could pass before the user's favorites render.
   */
  async gotoAndAwaitLoaded(): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname.endsWith('/favorites') &&
          response.request().method() === 'GET',
      ),
      this.goto(),
    ]);
  }

  /**
   * Removal is a `DELETE /favorites/{id}` followed by a refetch of the whole list, not
   * an optimistic splice — so the click alone is the action, and callers assert the
   * resulting list with auto-retrying expectations rather than awaiting a redraw here.
   */
  async removeFavorite(index: number): Promise<void> {
    await this.deleteButtons.nth(index).click();
  }
}
