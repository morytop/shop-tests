import { Page } from '@playwright/test';

export class HomePage {
  constructor(private page: Page) {}

  async goto(): Promise<void> {
    await this.page.goto('');
  }
}
