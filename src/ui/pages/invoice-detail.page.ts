import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

/**
 * A single invoice's detail page (`/account/invoices/<id>`, where `<id>` is the
 * invoice's lowercase ULID — not the `INV-…` number). Reached by clicking a row's
 * "Details" link on the list (`InvoicesPage.openDetails`); `goto()` alone lands on
 * the list, so a specific invoice is opened via `gotoInvoice(id)`.
 *
 * The general/address/payment values render as read-only `<input>`s with clean
 * `data-test` ids (read via `value`). The line items are a separate `<table>` with
 * no `data-test` (the only table on the page). A missing/foreign id renders a bare
 * `<p>This invoice doesn't exist.</p>` instead of the fields (TEST_PLAN.md §29).
 *
 * Money fields are the exception: on a **discounted** invoice the app renders three
 * inputs that all share `data-test="total"` (subtotal, discount, grand total), and
 * all three of their `<label for>` attributes point at `"total"` — so neither the
 * data-test nor `getByLabel` can tell them apart, and `[data-test="total"]` would
 * match 3 elements under strict mode. Their `id`s are the only distinguishing hook
 * (TEST_PLAN.md §33), hence the id selectors below.
 */
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
  readonly notFoundMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.invoiceNumber = this.page.locator('[data-test="invoice-number"]');
    this.invoiceDate = this.page.locator('[data-test="invoice-date"]');
    // Present only on a discounted invoice. `#additional_discount_percentage` holds
    // an *amount* ("$ 22.60") despite its id — the 15% appears only in the label.
    this.subtotal = this.page.locator('#subtotal');
    this.discount = this.page.locator('#additional_discount_percentage');
    this.discountLabel = this.page.getByText('Discount (15%)');
    this.total = this.page.locator('#total');
    this.street = this.page.locator('[data-test="street"]');
    this.postalCode = this.page.locator('[data-test="postal_code"]');
    this.city = this.page.locator('[data-test="city"]');
    this.state = this.page.locator('[data-test="state"]');
    this.country = this.page.locator('[data-test="country"]');
    this.paymentMethod = this.page.locator('[data-test="payment-method"]');
    this.lineItemsTable = this.page.getByRole('table');
    this.lineItemRows = this.lineItemsTable.locator('tbody').getByRole('row');
    this.notFoundMessage = this.page.getByText("This invoice doesn't exist.");
  }

  async gotoInvoice(id: string): Promise<void> {
    await this.page.goto(`${this.PAGE_URL}/${id}`);
  }
}
