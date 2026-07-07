import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { NavbarComponent } from '@src/ui/components/navbar.component';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

/**
 * The rentals listing (`/rentals`). Unlike the overview/category grid
 * (ProductListPage), rental cards are a distinct layout: a `card` wrapping a
 * `tabindex`-focusable `div[data-test^="product-"]` (not an `<a>`) that routes
 * to `/product/<id>` on click, and each card shows a description instead of a
 * price. Hence this stays a standalone BasePage, not a ProductListPage subclass.
 */
export class RentalsPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.RENTALS;
  readonly bookmarks: NavbarComponent;
  readonly pageHeading: Locator;
  readonly rentalCards: Locator;
  readonly rentalCardImages: Locator;
  readonly rentalCardNames: Locator;
  readonly rentalCardDescriptions: Locator;

  constructor(page: Page) {
    super(page);
    this.bookmarks = new NavbarComponent(this.page);
    this.pageHeading = this.page.getByRole('heading', {
      name: 'Rentals',
      exact: true,
    });
    this.rentalCards = this.page.locator('[data-test^="product-"]');
    this.rentalCardImages = this.rentalCards.locator('img');
    this.rentalCardNames = this.rentalCards.getByRole('heading', { level: 5 });
    this.rentalCardDescriptions = this.rentalCards.locator('p.card-text');
  }

  async clickRentalCard(index: number): Promise<void> {
    await this.rentalCards.nth(index).click();
  }
}
