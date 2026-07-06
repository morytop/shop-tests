import { NavbarComponent } from '../components/navbar';
import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';

/**
 * Shared product-listing interface backing both the home/overview page and the
 * per-category pages, which are the same Angular overview component (the
 * category variant is merely pre-scoped to a category server-side). Concrete
 * subclasses only supply their own PAGE_URL (and, for category pages, a
 * category heading); the grid/filter/search/sort/price/pagination behaviour
 * lives here once.
 */
export abstract class ProductListPage extends BasePage {
  readonly bookmarks: NavbarComponent;
  readonly productCards: Locator;
  readonly productCardImages: Locator;
  readonly productCardNames: Locator;
  readonly productCardPrices: Locator;
  readonly outOfStockLabelSelector: Locator;
  readonly outOfStockLabels: Locator;
  readonly outOfStockCard: Locator;
  readonly paginationNextLink: Locator;
  readonly paginationNextItem: Locator;
  readonly paginationPrevItem: Locator;
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
    this.bookmarks = new NavbarComponent(this.page);
    this.productCards = this.page.locator('a.card[data-test^="product-"]');
    this.productCardImages = this.productCards.locator('img');
    this.productCardNames = this.productCards.locator(
      '[data-test="product-name"]',
    );
    this.productCardPrices = this.productCards.locator(
      '[data-test="product-price"]',
    );
    this.outOfStockLabelSelector = this.page.locator(
      '[data-test="out-of-stock"]',
    );
    this.outOfStockLabels = this.productCards.locator(
      this.outOfStockLabelSelector,
    );
    this.outOfStockCard = this.productCards
      .filter({ has: this.outOfStockLabelSelector })
      .first();
    this.paginationNextLink = this.page.locator(
      '[data-test="pagination-next"]',
    );
    this.paginationNextItem = this.paginationNextLink.locator('..');
    this.paginationPrevItem = this.page
      .locator('[data-test="pagination-prev"]')
      .locator('..');
    this.searchInput = this.page.locator('[data-test="search-query"]');
    this.searchSubmitButton = this.page.locator('[data-test="search-submit"]');
    this.searchResetButton = this.page.locator('[data-test="search-reset"]');
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
    this.sortSelect = this.page.locator('[data-test="sort"]');
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

  // Every filter change and page turn re-fetches the grid from GET/QUERY
  // /products; awaiting that response keeps reads in step with the server
  // instead of racing the previous result set (which showed up as products
  // from an unrelated filter leaking into a freshly-collected page).
  private async triggerAndAwaitProducts(action: Promise<void>): Promise<void> {
    await Promise.all([
      this.page.waitForResponse((response) =>
        new URL(response.url()).pathname.endsWith('/products'),
      ),
      action,
    ]);
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

  async getAllProductNamesAcrossPages(): Promise<string[]> {
    const allNames: string[] = [];
    const maxPages = 50;
    for (let i = 0; i < maxPages; i++) {
      allNames.push(...(await this.getProductNames()));
      if (await this.isOnLastPage()) return allNames;
      await this.triggerAndAwaitProducts(this.paginationNextLink.click());
    }
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
    const maxPages = 50;
    for (let i = 0; i < maxPages; i++) {
      if (await this.isOnLastPage()) return;
      await this.paginationNextLink.click();
    }
  }

  async clickProductCard(index: number): Promise<void> {
    await this.productCards.nth(index).click();
  }

  async findOutOfStockCardAcrossPages(): Promise<boolean> {
    const maxPages = 50;
    for (let i = 0; i < maxPages; i++) {
      if ((await this.outOfStockCard.count()) > 0) return true;

      if (await this.isOnLastPage()) return false;
      await this.paginationNextLink.click();
    }
    return false;
  }
}
