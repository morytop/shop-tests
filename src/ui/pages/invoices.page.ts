import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { API_PATHS } from '@src/api/utils/api.util';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { waitForApi } from '@src/ui/utils/network.util';

/**
 * Customer invoices list (`/account/invoices`), reachable from the `/account`
 * dashboard tile or directly. Populated by `GET /invoices?page=1`, so the list
 * renders before the data lands (as on the favorites page) — enter via
 * `gotoAndAwaitLoaded()`, not the inherited `goto()`.
 *
 * The single `<table>` and its cells carry no `data-test`; columns are
 * `Invoice Number | Billing Address | Invoice Date | Total | (Details link)`, and
 * the "Billing Address" column shows the street only. Rows/cells are therefore
 * located structurally by role, and the per-row "Details" link (a bare `<a>` with
 * no `data-test`) is composed off the matching row (TEST_PLAN.md §29).
 */
// Column order of the invoices table. The cells carry no `data-test`, and the
// billing/date cells can't be keyed by their text (the values aren't known
// exactly — see the spec's §29 notes), so cells are addressed by named column.
const INVOICE_COLUMNS = [
  'invoiceNumber',
  'billingAddress',
  'invoiceDate',
  'total',
] as const;
export type InvoiceColumn = (typeof INVOICE_COLUMNS)[number];

export class InvoicesPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.INVOICES;
  readonly pageTitle: Locator;
  readonly invoiceTable: Locator;
  readonly invoiceRow: (invoiceNumber: string) => Locator;
  readonly invoiceRowCell: (
    invoiceNumber: string,
    column: InvoiceColumn,
  ) => Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = this.page.getByTestId('page-title');
    this.invoiceTable = this.page.getByRole('table');
    // A row's accessible name is its cells' text joined, so the full `INV-…`
    // number keys the row directly (this is also what codegen produces here).
    // Substring semantics are safe only because callers always pass the full
    // fixed-width number (it comes from the API's `invoice_number`): a partial
    // key like `INV-2026` would match every row of the year.
    this.invoiceRow = (invoiceNumber: string): Locator =>
      this.invoiceTable.getByRole('row', { name: invoiceNumber });
    this.invoiceRowCell = (
      invoiceNumber: string,
      column: InvoiceColumn,
    ): Locator =>
      this.invoiceRow(invoiceNumber)
        .getByRole('cell')
        .nth(INVOICE_COLUMNS.indexOf(column));
  }

  /**
   * Navigate and wait for the list to actually arrive. Without this gate the empty
   * table is indistinguishable from a not-yet-loaded one, so an assertion could run
   * before the user's invoices render (favorites §26 pattern).
   */
  async gotoAndAwaitLoaded(): Promise<void> {
    await Promise.all([
      waitForApi(this.page, API_PATHS.INVOICES, { method: 'GET' }),
      this.goto(),
    ]);
  }

  async openDetails(invoiceNumber: string): Promise<void> {
    await this.invoiceRow(invoiceNumber)
      .getByRole('link', { name: 'Details' })
      .click();
  }
}
