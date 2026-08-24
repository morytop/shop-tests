import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

export class RentalsPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.RENTALS;
  readonly pageHeading: Locator;
  readonly rentalCards: Locator;
  readonly rentalCardImages: Locator;
  readonly rentalCardNames: Locator;
  readonly rentalCardDescriptions: Locator;

  constructor(page: Page) {
    super(page);
    this.pageHeading = this.page.getByRole('heading', {
      name: 'Rentals',
      exact: true,
    });
    this.rentalCards = this.page.locator('[data-test^="product-"]');
    this.rentalCardImages = this.rentalCards.getByRole('img');
    this.rentalCardNames = this.rentalCards.getByRole('heading', { level: 5 });
    this.rentalCardDescriptions = this.rentalCards.getByRole('paragraph');
  }

  async clickRentalCard(index: number): Promise<void> {
    await this.rentalCards.nth(index).click();
  }
}
