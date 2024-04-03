import { Page } from '@playwright/test';

export class BasePage {
  url = '';
  title = this.page.locator('[data-test="page-title"]');
  constructor(protected page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto(this.url);
  }
}
