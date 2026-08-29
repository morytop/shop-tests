import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { API_PATHS } from '@src/api/utils/api.util';
import { PAGE_URLS } from '@src/ui/utils/page-urls.util';

export class AdminDashboardPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.ADMIN_DASHBOARD;
  readonly salesChart: Locator;
  readonly latestOrdersHeading: Locator;
  readonly latestOrdersTable: Locator;
  readonly latestOrdersColumnHeaders: Locator;
  readonly noRecentInvoicesMessage: Locator;
  readonly latestOrdersResult: Locator;

  constructor(page: Page) {
    super(page);
    // the chart is a bare `<canvas>`
    this.salesChart = this.page.locator('canvas');
    this.latestOrdersHeading = this.page.getByRole('heading', {
      name: 'Latest orders',
    });
    this.latestOrdersTable = this.page.getByRole('table');
    this.latestOrdersColumnHeaders =
      this.latestOrdersTable.getByRole('columnheader');
    this.noRecentInvoicesMessage = this.page.getByText('No recent invoices.');
    // The list resolves to exactly one of these two states.
    this.latestOrdersResult = this.latestOrdersTable.or(
      this.noRecentInvoicesMessage,
    );
  }

  async gotoAndAwaitLoaded(): Promise<void> {
    await this.gotoAndAwaitApi(API_PATHS.INVOICES, { method: 'GET' });
  }
}
