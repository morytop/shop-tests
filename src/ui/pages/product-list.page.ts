import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { API_PATHS } from '@src/api/utils/api.util';
import { waitForApi } from '@src/ui/utils/network.util';

/**
 * Shared product-listing interface backing both the home/overview page and the
 * per-category pages, which are the same Angular overview component (the
 * category variant is merely pre-scoped to a category server-side). Concrete
 * subclasses only supply their own PAGE_URL (and, for category pages, a
 * category heading); the grid/filter/search/sort/price/pagination behaviour
 * lives here once.
 */
export abstract class ProductListPage extends BasePage {
  // Safety bound for the page walkers: far above the real catalog size, it only
  // exists so a broken next-button can't loop a walk forever.
  private static readonly MAX_PAGINATION_PAGES = 50;

  readonly productCards: Locator;
  readonly productCardImages: Locator;
  readonly productCardNames: Locator;
  readonly productCardPrices: Locator;
  readonly outOfStockLabelSelector: Locator;
  readonly outOfStockLabels: Locator;
  readonly outOfStockCard: Locator;
  readonly inStockCard: Locator;
  readonly paginationNextLink: Locator;
  readonly paginationNextItem: Locator;
  readonly paginationPrevItem: Locator;
  readonly activePageItem: Locator;
  readonly searchInput: Locator;
  readonly searchSubmitButton: Locator;
  readonly searchResetButton: Locator;
  readonly categoriesGroup: Locator;
  readonly topLevelCategoryCheckboxes: Locator;
  readonly childCategoryCheckboxes: Locator;
  readonly checkedChildCategoryCheckboxes: Locator;
  readonly brandCheckboxes: Locator;
  readonly sortSelect: Locator;
  readonly priceRangeMinHandle: Locator;
  readonly priceRangeMaxHandle: Locator;

  constructor(page: Page) {
    super(page);
    this.productCards = this.page.locator('a.card[data-test^="product-"]');
    this.productCardImages = this.productCards.locator('img');
    this.productCardNames = this.productCards.getByTestId('product-name');
    this.productCardPrices = this.productCards.getByTestId('product-price');
    this.outOfStockLabelSelector = this.page.getByTestId('out-of-stock');
    this.outOfStockLabels = this.productCards.locator(
      this.outOfStockLabelSelector,
    );
    this.outOfStockCard = this.productCards
      .filter({ has: this.outOfStockLabelSelector })
      .first();
    // The catalog is shared, mutable production data, so any test that drives the cart
    // must pick its product by stock rather than by grid position — an out-of-stock
    // product PATCHed to the front of the grid disables those controls (§26/§28). The
    // grid never contains rentals (the overview always queries `is_rental=false`), so
    // "in stock" is the only predicate such a test needs.
    this.inStockCard = this.productCards
      .filter({ hasNot: this.outOfStockLabelSelector })
      .first();
    this.paginationNextLink = this.page.getByTestId('pagination-next');
    this.paginationNextItem = this.paginationNextLink.locator('..');
    this.paginationPrevItem = this.page
      .getByTestId('pagination-prev')
      .locator('..');
    this.activePageItem = this.page.locator('ul.pagination li.active');
    this.searchInput = this.page.getByTestId('search-query');
    this.searchSubmitButton = this.page.getByTestId('search-submit');
    this.searchResetButton = this.page.getByTestId('search-reset');
    this.categoriesGroup = this.page
      .getByRole('group', { name: 'Categories', exact: true })
      .first();
    this.topLevelCategoryCheckboxes = this.categoriesGroup
      .locator('> div.checkbox > label')
      .getByRole('checkbox');
    this.childCategoryCheckboxes = this.categoriesGroup
      .locator('ul')
      .getByRole('checkbox');
    this.checkedChildCategoryCheckboxes = this.childCategoryCheckboxes.and(
      this.page.locator(':checked'),
    );
    this.brandCheckboxes = this.page.locator('[data-test^="brand-"]');
    this.sortSelect = this.page.getByTestId('sort');
    this.priceRangeMinHandle = this.page.getByRole('slider', {
      name: 'ngx-slider',
      exact: true,
    });
    this.priceRangeMaxHandle = this.page.getByRole('slider', {
      name: 'ngx-slider-max',
      exact: true,
    });
  }

  async getProductNames(): Promise<string[]> {
    return this.productCardNames.allTextContents();
  }

  async getProductPrices(): Promise<string[]> {
    return this.productCardPrices.allTextContents();
  }

  // Pagination controls are removed from the DOM entirely when the (possibly
  // filtered) result set fits on a single page, so absence means "last page".
  async isOnLastPage(): Promise<boolean> {
    if ((await this.paginationNextItem.count()) === 0) return true;
    return (
      (await this.paginationNextItem.getAttribute('class'))?.includes(
        'disabled',
      ) ?? true
    );
  }

  // The grid is rendered by a post-navigation XHR, so a walk started right after
  // goto() can outrun the first paint: with no cards and no pagination yet,
  // isOnLastPage() reads "no pagination => last page" and the walk bails on page
  // one. Wait for the first card before walking a freshly-loaded listing.
  // (Walks kicked off after a filter change instead already awaited that fetch,
  // and must not wait here — their result set can legitimately be empty.)
  private async waitForGrid(): Promise<void> {
    await this.productCards.first().waitFor();
  }

  // Every filter change and page turn re-fetches the grid from GET/QUERY
  // /products; awaiting that response keeps reads in step with the server
  // instead of racing the previous result set (which showed up as products
  // from an unrelated filter leaking into a freshly-collected page).
  private async triggerAndAwaitProducts(action: Promise<void>): Promise<void> {
    await Promise.all([waitForApi(this.page, API_PATHS.PRODUCTS), action]);
  }

  // Advance exactly one page, awaiting both the re-fetch (QUERY /products) and
  // the subsequent re-render (the active page number incrementing). The old
  // fire-and-forget `paginationNextLink.click()` let successive clicks overlap,
  // so their /products responses could settle out of order and leave the walker
  // short of — or bouncing off — the true last page; serialising the turn keeps
  // every caller's next DOM read in step with the page actually shown. Callers
  // must confirm `!isOnLastPage()` first: clicking a disabled next fires no
  // request and would hang the awaited response.
  private async goToNextPage(): Promise<void> {
    const current = Number((await this.activePageItem.textContent())?.trim());
    await this.triggerAndAwaitProducts(this.paginationNextLink.click());
    await this.activePageItem
      .filter({ hasText: new RegExp(`^${current + 1}$`) })
      .waitFor();
  }

  async filterByChildCategory(index: number): Promise<void> {
    await this.triggerAndAwaitProducts(
      this.childCategoryCheckboxes.nth(index).check(),
    );
  }

  async clearChildCategoryFilter(index: number): Promise<void> {
    await this.triggerAndAwaitProducts(
      this.childCategoryCheckboxes.nth(index).uncheck(),
    );
  }

  async filterByBrand(index: number): Promise<void> {
    await this.triggerAndAwaitProducts(this.brandCheckboxes.nth(index).check());
  }

  /**
   * Walk the grid page by page, running `visit` on each until it returns true;
   * false means the last page was reached without a hit. `waitForFirstCard`
   * gates a walk over a freshly-loaded listing (see waitForGrid); walks kicked
   * off after a filter change must pass false — that re-fetch was already
   * awaited and its result set can legitimately be empty.
   */
  private async walkPages(
    visit: () => Promise<boolean>,
    options: { waitForFirstCard: boolean },
  ): Promise<boolean> {
    if (options.waitForFirstCard) await this.waitForGrid();
    for (let i = 0; i < ProductListPage.MAX_PAGINATION_PAGES; i++) {
      if (await visit()) return true;
      if (await this.isOnLastPage()) return false;
      await this.goToNextPage();
    }
    return false;
  }

  // Collects from every page; callers run it after a filter/search change, so
  // no first-card wait (the result set can legitimately be empty).
  async getAllProductNamesAcrossPages(): Promise<string[]> {
    const allNames: string[] = [];
    await this.walkPages(
      async () => {
        allNames.push(...(await this.getProductNames()));
        return false;
      },
      { waitForFirstCard: false },
    );
    return allNames;
  }

  async search(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.searchSubmitButton.click();
  }

  async sortBy(value: string): Promise<void> {
    await this.sortSelect.selectOption(value);
  }

  async decreasePriceRangeMax(times: number): Promise<void> {
    await this.priceRangeMaxHandle.focus();
    for (let i = 0; i < times; i++) {
      await this.page.keyboard.press('ArrowLeft');
    }
  }

  async increasePriceRangeMin(times: number): Promise<void> {
    await this.priceRangeMinHandle.focus();
    for (let i = 0; i < times; i++) {
      await this.page.keyboard.press('ArrowRight');
    }
  }

  async getPriceRangeMaxValue(): Promise<string | null> {
    return this.priceRangeMaxHandle.getAttribute('aria-valuenow');
  }

  async getPriceRangeMinValue(): Promise<string | null> {
    return this.priceRangeMinHandle.getAttribute('aria-valuenow');
  }

  async goToPage(pageNumber: number): Promise<void> {
    await this.page.getByLabel(`Page-${pageNumber}`).click();
  }

  async goToLastPage(): Promise<void> {
    await this.walkPages(async () => false, { waitForFirstCard: true });
  }

  async clickProductCard(index: number): Promise<void> {
    await this.productCards.nth(index).click();
  }

  async findOutOfStockCardAcrossPages(): Promise<boolean> {
    return this.walkPages(async () => (await this.outOfStockCard.count()) > 0, {
      waitForFirstCard: true,
    });
  }

  // Leaves the grid on the page holding the match, so callers click `inStockCard` next.
  async findInStockCardAcrossPages(): Promise<boolean> {
    return this.walkPages(async () => (await this.inStockCard.count()) > 0, {
      waitForFirstCard: true,
    });
  }
}
