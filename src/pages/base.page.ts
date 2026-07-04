import { Page } from '@playwright/test';

export abstract class BasePage {
  readonly page: Page;
  abstract readonly PAGE_URL: string;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(): Promise<void> {
    await this.page.goto(this.PAGE_URL);
  }
}
