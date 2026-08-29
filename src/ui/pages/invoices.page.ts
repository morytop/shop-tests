import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { API_PATHS } from '@src/api/utils/api.util';
import { PAGE_URLS } from '@src/ui/utils/page-urls.util';

const INVOICE_COLUMNS = [
  'invoiceNumber',
  'billingAddress',
  'invoiceDate',
  'total',
] as const;
export type InvoiceColumn = (typeof INVOICE_COLUMNS)[number];

export class InvoicesPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.INVOICES;
  readonly invoiceTable: Locator;
  readonly invoiceRow: (invoiceNumber: string) => Locator;
  readonly invoiceRowCell: (
    invoiceNumber: string,
    column: InvoiceColumn,
  ) => Locator;

  constructor(page: Page) {
    super(page);
    this.invoiceTable = this.page.getByRole('table');
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

  async gotoAndAwaitLoaded(): Promise<void> {
    await this.gotoAndAwaitApi(API_PATHS.INVOICES, { method: 'GET' });
  }

  async openDetails(invoiceNumber: string): Promise<void> {
    await this.invoiceRow(invoiceNumber)
      .getByRole('link', { name: 'Details' })
      .click();
  }
}
