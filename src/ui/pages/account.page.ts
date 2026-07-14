import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

export class AccountPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.ACCOUNT;
  readonly pageTitle: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = this.page.getByTestId('page-title');
  }
}
