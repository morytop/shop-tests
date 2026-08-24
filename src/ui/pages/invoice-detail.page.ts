import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

const LINE_ITEM_COLUMNS = ['quantity', 'product', 'price', 'total'] as const;
export type LineItemColumn = (typeof LINE_ITEM_COLUMNS)[number];

export class InvoiceDetailPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.INVOICES;
  readonly invoiceNumber: Locator;
  readonly invoiceDate: Locator;
  readonly subtotal: Locator;
  readonly discount: Locator;
  readonly discountLabel: Locator;
  readonly total: Locator;
  readonly street: Locator;
  readonly postalCode: Locator;
  readonly city: Locator;
  readonly state: Locator;
  readonly country: Locator;
  readonly paymentMethod: Locator;
  readonly lineItemsTable: Locator;
  readonly lineItemRows: Locator;
  readonly lineItemCell: (rowIndex: number, column: LineItemColumn) => Locator;
  readonly notFoundMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.invoiceNumber = this.page.getByTestId('invoice-number');
    this.invoiceDate = this.page.getByTestId('invoice-date');
    // Present only on a discounted invoice. `#additional_discount_percentage` holds
    // an *amount* ("$ 22.60") despite its id — the 15% appears only in the label.
    // Must stay id-based, not getByTestId: verified live that on a discounted invoice
    // all three of subtotal/discount/total share the exact same `data-test="total"`
    // (PRODUCT_EXPLORATION.md §5/§33 — a documented app bug), which would make
    // getByTestId('total') match all three at once.
    this.subtotal = this.page.locator('#subtotal');
    this.discount = this.page.locator('#additional_discount_percentage');
    this.discountLabel = this.page.getByText('Discount (15%)');
    this.total = this.page.locator('#total');
    this.street = this.page.getByTestId('street');
    this.postalCode = this.page.getByTestId('postal_code');
    this.city = this.page.getByTestId('city');
    this.state = this.page.getByTestId('state');
    this.country = this.page.getByTestId('country');
    this.paymentMethod = this.page.getByTestId('payment-method');
    this.lineItemsTable = this.page.getByRole('table');
    this.lineItemRows = this.lineItemsTable.locator('tbody').getByRole('row');
    this.lineItemCell = (rowIndex: number, column: LineItemColumn): Locator =>
      this.lineItemRows
        .nth(rowIndex)
        .getByRole('cell')
        .nth(LINE_ITEM_COLUMNS.indexOf(column));
    this.notFoundMessage = this.page.getByText("This invoice doesn't exist.");
  }

  async gotoInvoice(id: string): Promise<void> {
    await this.page.goto(`${this.PAGE_URL}/${id}`);
  }
}
