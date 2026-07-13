import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { NavbarComponent } from '@src/ui/components/navbar.component';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

/**
 * The cart step of the checkout wizard (`/checkout`), reachable as a guest.
 * Models the cart line table (item/quantity/price/total + delete), the running
 * cart total, the empty-cart state, and the "Proceed to checkout" gate for §5.5.
 */
export class CartPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.CHECKOUT;
  readonly bookmarks: NavbarComponent;
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
    this.bookmarks = new NavbarComponent(this.page);
    this.cartTable = this.page.getByRole('table');
    this.columnHeaders = this.cartTable.getByRole('columnheader');
    this.productTitles = this.page.getByTestId('product-title');
    this.quantityInputs = this.page.getByTestId('product-quantity');
    this.productPrices = this.page.getByTestId('product-price');
    this.linePrices = this.page.getByTestId('line-price');
    // The per-row delete control is a bare `<a class="btn btn-danger">` with an
    // aria-hidden icon — no data-test, role, or accessible name to target, so a
    // CSS chain scoped to the cart table is the only option (CODING_STANDARDS
    // permits raw CSS when a role/label locator genuinely can't express it).
    this.deleteButtons = this.cartTable.locator('a.btn-danger');
    // The subtotal/discount breakdown rows exist only while the 15% rental +
    // non-rental combination discount applies — an undiscounted cart renders
    // neither (count 0), and shows just the total (TEST_PLAN.md §33).
    this.cartSubtotal = this.page.getByTestId('cart-subtotal');
    this.cartDiscount = this.page.getByTestId('cart-discount');
    this.cartDiscountLabel = this.page.getByText('Discount (15%)');
    this.cartTotal = this.page.getByTestId('cart-total');
    this.proceedButton = this.page.getByTestId('proceed-1');
    this.emptyCartMessage = this.page.getByText(
      'The cart is empty. Nothing to display.',
    );
    // Advancing past the cart step reveals the sign-in step's login email input;
    // it exists in the DOM on the cart step but stays hidden until you proceed.
    this.signInEmail = this.page.getByTestId('email');
    // ngx-toastr message body (quantity-updated / item-deleted confirmations).
    this.updateToast = this.page.locator('.toast-message');
    // Rental line label; a bare `<small>` with no data-test, matched by text.
    this.rentalItemLabel = this.page.getByText('Item for rent, price per hour');
  }

  // The quantity change only persists (updating the cart total and firing the
  // confirmation toast) on the input's change event, so blur after filling —
  // filling alone updates just the line-price display and reverts on reload.
  async updateQuantity(index: number, value: string): Promise<void> {
    await this.quantityInputs.nth(index).fill(value);
    await this.quantityInputs.nth(index).blur();
  }

  async removeItem(index: number): Promise<void> {
    await this.deleteButtons.nth(index).click();
  }

  async proceedToCheckout(): Promise<void> {
    await this.proceedButton.click();
  }
}
