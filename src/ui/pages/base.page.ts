import { Locator, Page } from '@playwright/test';
import { WaitForApiOptions, waitForApi } from '@src/ui/utils/network.util';

export abstract class BasePage {
  readonly page: Page;
  abstract readonly PAGE_URL: string;
  readonly pageTitle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.pageTitle = this.page.getByTestId('page-title');
  }

  async goto(): Promise<void> {
    await this.page.goto(this.PAGE_URL);
  }

  protected async gotoAndAwaitApi(
    apiPath: string,
    options?: WaitForApiOptions,
  ): Promise<void> {
    await Promise.all([waitForApi(this.page, apiPath, options), this.goto()]);
  }
}
