import { ProductListPage } from './product-list.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/utils/page-urls.util';

export class SpecialToolsPage extends ProductListPage {
  readonly heading: Locator;

  constructor(page: Page) {
    super(page, PAGE_URLS.SPECIAL_TOOLS);
    this.heading = page.getByRole('heading', {
      name: 'Category: Special Tools',
    });
  }
}
