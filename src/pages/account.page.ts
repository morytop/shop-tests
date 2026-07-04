import { PAGE_URLS } from '../constants/page-urls';
import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';

export class AccountPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.ACCOUNT;
  readonly title: Locator;
  constructor(page: Page) {
    super(page);
    this.title = this.page.locator('[data-test="page-title"]');
  }
}
