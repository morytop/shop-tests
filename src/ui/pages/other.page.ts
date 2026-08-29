import { ProductListPage } from './product-list.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/utils/page-urls.util';

export class OtherPage extends ProductListPage {
  readonly heading: Locator;

  constructor(page: Page) {
    super(page, PAGE_URLS.OTHER);
    this.heading = page.getByRole('heading', {
      name: 'Category: Other',
    });
  }
}
