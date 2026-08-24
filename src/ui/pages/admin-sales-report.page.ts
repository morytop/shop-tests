import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';

export class AdminSalesReportPage extends BasePage {
  readonly PAGE_URL: string;
  readonly yearSelect: Locator;
  readonly salesChart: Locator;

  constructor(page: Page, pageUrl: string) {
    super(page);
    this.PAGE_URL = pageUrl;
    this.yearSelect = this.page.getByTestId('year');
    this.salesChart = this.page.locator('canvas');
  }
}
