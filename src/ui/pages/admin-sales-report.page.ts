import { AdminPage } from './admin.page';
import { Locator, Page } from '@playwright/test';

/**
 * Shared shell of the two average-sales reports (per month, per week). Both render a
 * `[data-test="year"]` select over a bare `<canvas>` chart and carry no table
 * (TEST_PLAN.md §31). The two reports differ only in their URL, so this class is
 * instantiated directly with one of the `PAGE_URLS.ADMIN_AVERAGE_SALES_PER_*` constants
 * rather than being subclassed per report.
 */
export class AdminSalesReportPage extends AdminPage {
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
