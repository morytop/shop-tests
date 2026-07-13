import { AdminPage } from './admin.page';
import { Locator, Page } from '@playwright/test';

/**
 * Shared shell of the two average-sales reports (per month, per week). Both render a
 * `[data-test="year"]` select over a bare `<canvas>` chart and carry no table
 * (TEST_PLAN.md §31); concrete subclasses supply only their `PAGE_URL`.
 */
export abstract class AdminSalesReportPage extends AdminPage {
  readonly yearSelect: Locator;
  readonly salesChart: Locator;

  constructor(page: Page) {
    super(page);
    this.yearSelect = this.page.getByTestId('year');
    this.salesChart = this.page.locator('canvas');
  }
}
