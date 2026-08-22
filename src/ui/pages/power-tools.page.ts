import { ProductListPage } from './product-list.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

export class PowerToolsPage extends ProductListPage {
  readonly heading: Locator;

  constructor(page: Page) {
    super(page, PAGE_URLS.POWER_TOOLS);
    this.heading = page.getByRole('heading', {
      name: 'Category: Power Tools',
    });
  }
}
