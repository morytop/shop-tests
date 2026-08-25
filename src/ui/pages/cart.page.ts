import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { parsePrice } from '@src/ui/utils/price.util';

/** The cart's per-line prices plus the Subtotal/Discount/Total breakdown, parsed to numbers. */
export interface CartFinancialSummary {
  lineTotals: number[];
  subtotal: number;
  discount: number;
  total: number;
}

export class CartPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.CHECKOUT;
  readonly cartTable: Locator;
  readonly columnHeaders: Locator;
  readonly productTitles: Locator;
  readonly quantityInputs: Locator;
  readonly productPrices: Locator;
  readonly linePrices: Locator;
  readonly deleteButtons: Locator;
  readonly cartSubtotal: Locator;
  readonly cartDiscount: Locator;
  readonly cartDiscountLabel: Locator;
  readonly cartTotal: Locator;
  readonly proceedButton: Locator;
  readonly emptyCartMessage: Locator;
  readonly signInEmail: Locator;
  readonly updateToast: Locator;
  readonly rentalItemLabel: Locator;

  constructor(page: Page) {
    super(page);
    this.cartTable = this.page.getByRole('table');
    this.columnHeaders = this.cartTable.getByRole('columnheader');
    this.productTitles = this.page.getByTestId('product-title');
    this.quantityInputs = this.page.getByTestId('product-quantity');
    this.productPrices = this.page.getByTestId('product-price');
    this.linePrices = this.page.getByTestId('line-price');
    // The per-row delete control is a bare `<a class="btn btn-danger">` with an
    // aria-hidden icon — no data-test, role, or accessible name to target, so a
    // CSS chain scoped to the cart table is the only option
    this.deleteButtons = this.cartTable.locator('a.btn-danger');
    this.cartSubtotal = this.page.getByTestId('cart-subtotal');
    this.cartDiscount = this.page.getByTestId('cart-discount');
    this.cartDiscountLabel = this.page.getByText('Discount (15%)');
    this.cartTotal = this.page.getByTestId('cart-total');
    this.proceedButton = this.page.getByTestId('proceed-1');
    this.emptyCartMessage = this.page.getByText(
      'The cart is empty. Nothing to display.',
    );
    this.signInEmail = this.page.getByTestId('email');
    this.updateToast = this.page.getByRole('alert', {
      name: 'Product quantity updated.',
    });
    this.rentalItemLabel = this.page.getByText('Item for rent, price per hour');
  }

  async updateQuantity(index: number, value: string): Promise<void> {
    await this.quantityInputs.nth(index).fill(value);
    await this.quantityInputs.nth(index).blur();
  }

  async removeItem(index: number): Promise<void> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const removed = this.page.waitForResponse(
        (response) =>
          response.request().method() === 'DELETE' &&
          new URL(response.url()).pathname.startsWith('/carts/'),
      );
      await this.deleteButtons.nth(index).click();
      if ((await removed).ok()) return;
    }
    throw new Error('failed to remove cart item after 3 attempts');
  }

  async proceedToCheckout(): Promise<void> {
    await this.proceedButton.click();
  }

  async getFinancialSummary(): Promise<CartFinancialSummary> {
    const lineTotals = (await this.linePrices.allInnerTexts()).map(parsePrice);

    return {
      lineTotals,
      subtotal: parsePrice(await this.cartSubtotal.innerText()),
      discount: parsePrice(await this.cartDiscount.innerText()),
      total: parsePrice(await this.cartTotal.innerText()),
    };
  }
}
