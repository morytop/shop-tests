import { NavbarComponent } from '../components/navbar';
import { PAGE_URLS } from '../constants/page-urls';
import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';

/**
 * The cart step of the checkout wizard (`/checkout`), reachable as a guest.
 * Minimal for now — only the pieces §5.4 needs (rental item labelling); §5.5
 * Cart is expected to extend this with quantity/total/delete behaviour.
 */
export class CartPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.CHECKOUT;
  readonly bookmarks: NavbarComponent;
  readonly productTitles: Locator;
  readonly rentalItemLabel: Locator;

  constructor(page: Page) {
    super(page);
    this.bookmarks = new NavbarComponent(this.page);
    this.productTitles = this.page.locator('[data-test="product-title"]');
    // Rental line label; a bare `<small>` with no data-test, matched by text.
    this.rentalItemLabel = this.page.getByText('Item for rent, price per hour');
  }
}
