import { ProductListPage } from './product-list.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

export class HandToolsPage extends ProductListPage {
  readonly PAGE_URL = PAGE_URLS.HAND_TOOLS;
  readonly heading: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', {
      name: 'Category: Hand Tools',
    });
  }
}
