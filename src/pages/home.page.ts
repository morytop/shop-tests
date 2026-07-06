import { PAGE_URLS } from '../constants/page-urls';
import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';

export class HomePage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.HOME;
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

  constructor(page: Page) {
    super(page);
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
  }

  async getProductNames(): Promise<string[]> {
    return this.productCardNames.allTextContents();
  }

  async goToPage(pageNumber: number): Promise<void> {
    await this.page.getByLabel(`Page-${pageNumber}`).click();
  }

  /**
   * Catalog size (and therefore page count) is shared mutable prod data, so the
   * last page is reached by clicking "next" until disabled rather than a fixed page number.
   */
  async goToLastPage(): Promise<void> {
    const maxPages = 50;
    for (let i = 0; i < maxPages; i++) {
      const isDisabled = (
        await this.paginationNextItem.getAttribute('class')
      )?.includes('disabled');
      if (isDisabled) return;
      await this.paginationNextLink.click();
    }
  }

  async clickProductCard(index: number): Promise<void> {
    await this.productCards.nth(index).click();
  }

  /**
   * Stock status is live catalog data, so an out-of-stock card isn't guaranteed
   * on any given page — pages through the grid until one is found or pages run out.
   * Leaves the grid positioned on the page where the card was found (if any),
   * so callers can assert against `outOfStockCard`/`outOfStockLabels` afterwards.
   */
  async findOutOfStockCardAcrossPages(): Promise<boolean> {
    const maxPages = 50;
    for (let i = 0; i < maxPages; i++) {
      if ((await this.outOfStockCard.count()) > 0) return true;

      const isLastPage = (
        await this.paginationNextItem.getAttribute('class')
      )?.includes('disabled');
      if (isLastPage) return false;
      await this.paginationNextLink.click();
    }
    return false;
  }
}
