import { BasePage } from './base-page';
import { Page } from '@playwright/test';

export class AccountPage extends BasePage {
  url = '/#/account';

  constructor(page: Page) {
    super(page);
  }
}
