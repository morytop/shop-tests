import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { API_PATHS } from '@src/api/utils/api.util';
import { waitForApi } from '@src/ui/utils/network.util';

export class ProductListPage extends BasePage {
  // Hard ceiling on walkPages' loop: the catalog is shared, mutable production data
  // (no seeded reset, §3), so a stalled "Next" (app bug) or organic catalog growth
  // could otherwise hang a test indefinitely. Verified live the product grid currently
  // runs 5 pages and the same pagination component elsewhere (invoices) already reaches
  // 11 — 50 is a comfortable, not arbitrary, margin above that.
  private static readonly MAX_PAGINATION_PAGES = 50;

  readonly PAGE_URL: string;
  readonly productCards: Locator;
  readonly productCardImages: Locator;
  readonly productCardNames: Locator;
  readonly productCardPrices: Locator;
  readonly productCardsNotMatchingName: (term: string) => Locator;
  readonly outOfStockLabelSelector: Locator;
  readonly outOfStockLabels: Locator;
  readonly outOfStockCard: Locator;
  readonly inStockCard: Locator;
  readonly paginationNextLink: Locator;
  readonly paginationNextItem: Locator;
  readonly paginationPrevItem: Locator;
  readonly paginationPageLink: (pageNumber: number) => Locator;
  readonly activePageItem: Locator;
  readonly searchInput: Locator;
  readonly searchSubmitButton: Locator;
  readonly searchResetButton: Locator;
  readonly categoriesGroup: Locator;
  readonly topLevelCategoryCheckboxes: Locator;
  readonly childCategoryCheckboxes: Locator;
  readonly checkedChildCategoryCheckboxes: Locator;
  readonly brandsGroup: Locator;
  readonly brandCheckboxes: Locator;
  readonly sortSelect: Locator;
  readonly priceRangeMinHandle: Locator;
  readonly priceRangeMaxHandle: Locator;

  constructor(page: Page, pageUrl: string) {
    super(page);
    this.PAGE_URL = pageUrl;
    this.productCards = this.page
      .getByRole('link')
      .filter({ has: this.page.getByTestId('product-name') });
    this.productCardImages = this.productCards.getByRole('img');
    this.productCardNames = this.productCards.getByTestId('product-name');
    this.productCardPrices = this.productCards.getByTestId('product-price');
    this.productCardsNotMatchingName = (term: string): Locator =>
      this.productCards.filter({
        hasNot: this.page.getByTestId('product-name').filter({ hasText: term }),
      });
    this.outOfStockLabelSelector = this.page.getByTestId('out-of-stock');
    this.outOfStockLabels = this.productCards.locator(
      this.outOfStockLabelSelector,
    );
    this.outOfStockCard = this.productCards
      .filter({ has: this.outOfStockLabelSelector })
      .first();
    this.inStockCard = this.productCards
      .filter({ hasNot: this.outOfStockLabelSelector })
      .first();
    this.paginationNextLink = this.page.getByTestId('pagination-next');
    this.paginationNextItem = this.paginationNextLink.locator('..');
    this.paginationPrevItem = this.page
      .getByTestId('pagination-prev')
      .locator('..');
    this.paginationPageLink = (pageNumber: number): Locator =>
      this.page.getByLabel(`Page-${pageNumber}`);
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
    this.brandsGroup = this.page
      .getByRole('group', { name: 'Brands', exact: true })
      .first();
    this.brandCheckboxes = this.brandsGroup.getByRole('checkbox');
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

  async isOnLastPage(): Promise<boolean> {
    if ((await this.paginationNextItem.count()) === 0) return true;
    try {
      return (
        (
          await this.paginationNextItem.getAttribute('class', {
            timeout: 5_000,
          })
        )?.includes('disabled') ?? true
      );
    } catch {
      return true;
    }
  }

  private async waitForGrid(): Promise<void> {
    await this.productCards.first().waitFor();
  }

  private async triggerAndAwaitProducts(
    action: Promise<unknown>,
    path: string = API_PATHS.PRODUCTS,
  ): Promise<void> {
    await Promise.all([waitForApi(this.page, path), action]);
  }

  private async goToNextPage(): Promise<void> {
    const current = Number((await this.activePageItem.textContent())?.trim());
    await this.triggerAndAwaitProducts(this.paginationNextLink.click());
    // Anchored, not a plain string: hasText does substring matching, so an unanchored
    // '1' would also match an active item reading "10"/"11" — confirmed live this
    // pagination component does reach double digits elsewhere (invoices, 11 pages).
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

  async clearAllChildCategoryFilters(): Promise<void> {
    while ((await this.checkedChildCategoryCheckboxes.count()) > 0) {
      await this.triggerAndAwaitProducts(
        this.checkedChildCategoryCheckboxes.first().uncheck(),
      );
    }
  }

  async filterByBrand(index: number): Promise<void> {
    await this.triggerAndAwaitProducts(this.brandCheckboxes.nth(index).check());
  }

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
    await this.triggerAndAwaitProducts(
      this.searchSubmitButton.click(),
      API_PATHS.PRODUCT_SEARCH,
    );
  }

  async submitSearch(query: string): Promise<void> {
    await this.searchInput.fill(query);
    await this.searchSubmitButton.click();
  }

  async sortBy(value: string): Promise<void> {
    await this.triggerAndAwaitProducts(this.sortSelect.selectOption(value));
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

  // `.and()` here isn't picking a different element — it's the "wait until this same
  // handle also has the attribute" idiom (mirrors `checkedChildCategoryCheckboxes`
  // above): ngx-slider can render the handle before it attaches `aria-valuenow`.
  private async getSliderValue(handle: Locator): Promise<string> {
    const handleWithValue = handle.and(this.page.locator('[aria-valuenow]'));
    await handleWithValue.waitFor();
    const value = await handleWithValue.getAttribute('aria-valuenow');
    if (value === null) {
      throw new Error('slider handle lost its aria-valuenow after the wait');
    }
    return value;
  }

  async getPriceRangeMaxValue(): Promise<string> {
    return this.getSliderValue(this.priceRangeMaxHandle);
  }

  async getPriceRangeMinValue(): Promise<string> {
    return this.getSliderValue(this.priceRangeMinHandle);
  }

  async goToPage(pageNumber: number): Promise<void> {
    await this.triggerAndAwaitProducts(
      this.paginationPageLink(pageNumber).click(),
    );
    // Anchored for the same reason as goToNextPage — see its comment.
    await this.activePageItem
      .filter({ hasText: new RegExp(`^${pageNumber}$`) })
      .waitFor();
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

  async findInStockCardAcrossPages(): Promise<boolean> {
    return this.walkPages(async () => (await this.inStockCard.count()) > 0, {
      waitForFirstCard: true,
    });
  }
}
