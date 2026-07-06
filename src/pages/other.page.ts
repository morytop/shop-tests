import { PAGE_URLS } from '../constants/page-urls';
import { ProductListPage } from './product-list.page';
import { Locator, Page } from '@playwright/test';

export class OtherPage extends ProductListPage {
  readonly PAGE_URL = PAGE_URLS.OTHER;
  readonly heading: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', {
      name: 'Category: Other',
    });
  }
}
