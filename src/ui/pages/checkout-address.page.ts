import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { NavbarComponent } from '@src/ui/components/navbar.component';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { Address, AddressTextField } from '@src/ui/models/address.model';

/**
 * The "Billing Address" step of the checkout wizard (`/checkout`), reached by
 * advancing past the sign-in step (guest or logged-in) — `goto()` lands on the
 * cart step, not here, like `CheckoutSigninPage`/`ProductDetailPage`. The form is
 * an Angular reactive form: every field is required and the "Proceed to checkout"
 * button (`proceed-3`) stays disabled until the whole form is valid. There are no
 * native `maxlength` attributes and no visible error text — an empty/over-long
 * field only carries the `ng-invalid` class (TEST_PLAN.md §16).
 */
export class CheckoutAddressPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.CHECKOUT;
  readonly bookmarks: NavbarComponent;
  readonly heading: Locator;
  readonly countrySelect: Locator;
  readonly postalCodeInput: Locator;
  readonly houseNumberInput: Locator;
  readonly streetInput: Locator;
  readonly cityInput: Locator;
  readonly stateInput: Locator;
  readonly proceedButton: Locator;
  /** Text fields keyed by name, so the boundary tests can drive one at a time. */
  readonly textFields: Record<AddressTextField, Locator>;

  constructor(page: Page) {
    super(page);
    this.bookmarks = new NavbarComponent(this.page);
    this.heading = this.page.getByRole('heading', { name: 'Billing Address' });
    // Country is a `<select>` (ISO-code values, full-name option text), not the
    // free-text field the docs imply (TEST_PLAN.md §9).
    this.countrySelect = this.page.getByTestId('country');
    this.postalCodeInput = this.page.getByTestId('postal_code');
    this.houseNumberInput = this.page.getByTestId('house_number');
    this.streetInput = this.page.getByTestId('street');
    this.cityInput = this.page.getByTestId('city');
    this.stateInput = this.page.getByTestId('state');
    this.proceedButton = this.page.getByTestId('proceed-3');
    this.textFields = {
      postalCode: this.postalCodeInput,
      houseNumber: this.houseNumberInput,
      street: this.streetInput,
      city: this.cityInput,
      state: this.stateInput,
    };
  }

  async selectCountry(label: string): Promise<void> {
    await this.countrySelect.selectOption({ label });
  }

  async fillAddress(address: Address): Promise<void> {
    await this.selectCountry(address.country);
    await this.postalCodeInput.fill(address.postalCode);
    // Country + postal + house triggers an async postcode-lookup that auto-fills
    // street/city/state from an external geocoder (TEST_PLAN.md §16). Await it so a
    // stale in-flight lookup can't resolve later and overwrite a field the boundary
    // tests deliberately set over-long (the response echoes the valid values back).
    const lookup = this.page.waitForResponse((response) =>
      response.url().includes('/postcode-lookup'),
    );
    await this.houseNumberInput.fill(address.houseNumber);
    await lookup;
    // Overwrite the geocoded street/city/state with our deterministic values.
    await this.streetInput.fill(address.street);
    await this.cityInput.fill(address.city);
    await this.stateInput.fill(address.state);
  }

  /**
   * Fill only country + postal code + house number and let the postcode lookup
   * auto-fill street/city/state, leaving those geocoded values untouched. The
   * invoice API cross-validates city ↔ country, so a manually-typed city is
   * rejected (422) — only the geocoded triple is internally consistent and
   * orderable (TEST_PLAN.md §18). House number is cleared then refilled to force
   * the lookup even when the field is already pre-filled (logged-in path).
   */
  async fillAddressViaLookup(
    country: string,
    postalCode: string,
    houseNumber: string,
  ): Promise<void> {
    const lookup = this.page.waitForResponse((response) =>
      response.url().includes('/postcode-lookup'),
    );
    await this.selectCountry(country);
    await this.postalCodeInput.fill(postalCode);
    await this.houseNumberInput.fill('');
    await this.houseNumberInput.fill(houseNumber);
    await lookup;
  }

  async proceedToPayment(): Promise<void> {
    await this.proceedButton.click();
  }
}
