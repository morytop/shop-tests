import { AdminPage } from './admin.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

/**
 * Admin landing page (`/admin/dashboard`) — where a successful admin login redirects to.
 * Its page title is "Sales over the years" (the sales chart's own heading); the chart is
 * a bare `<canvas>` with no `data-test`, and "Latest orders" is a `table.table-hover`
 * with no `data-test` on the table/rows/cells (TEST_PLAN.md §31).
 *
 * The orders list is fed by `GET /invoices?…&in=status,AWAITING_FULFILLMENT` and renders
 * "No recent invoices." *while that request is still in flight* — the same pre-load race
 * as the favorites/invoices/messages lists (§26/§29/§30) — so enter via
 * `gotoAndAwaitLoaded()`, never the inherited `goto()`.
 */
export class AdminDashboardPage extends AdminPage {
  readonly PAGE_URL = PAGE_URLS.ADMIN_DASHBOARD;
  readonly salesChart: Locator;
  readonly latestOrdersHeading: Locator;
  readonly latestOrdersTable: Locator;
  readonly latestOrdersColumnHeaders: Locator;
  readonly noRecentInvoicesMessage: Locator;
  readonly latestOrdersResult: Locator;

  constructor(page: Page) {
    super(page);
    this.salesChart = this.page.locator('canvas');
    this.latestOrdersHeading = this.page.getByRole('heading', {
      name: 'Latest orders',
    });
    this.latestOrdersTable = this.page.getByRole('table');
    this.latestOrdersColumnHeaders =
      this.latestOrdersTable.getByRole('columnheader');
    this.noRecentInvoicesMessage = this.page.getByText('No recent invoices.');
    // The list resolves to exactly one of these two states. Which one depends on
    // whether any invoice is currently AWAITING_FULFILLMENT — shared production data,
    // so a spec must not demand rows (§3). Composing them lets the smoke check assert
    // that the list *resolved* without pinning how much data other people's orders left
    // behind.
    this.latestOrdersResult = this.latestOrdersTable.or(
      this.noRecentInvoicesMessage,
    );
  }

  async gotoAndAwaitLoaded(): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname.endsWith('/invoices') &&
          response.request().method() === 'GET',
      ),
      this.goto(),
    ]);
  }
}
