import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { API_PATHS } from '@src/api/utils/api.util';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { Address, AddressTextField } from '@src/ui/models/address.model';
import { waitForApi } from '@src/ui/utils/network.util';

export class CheckoutAddressPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.CHECKOUT;
  readonly heading: Locator;
  readonly countrySelect: Locator;
  readonly postalCodeInput: Locator;
  readonly houseNumberInput: Locator;
  readonly streetInput: Locator;
  readonly cityInput: Locator;
  readonly stateInput: Locator;
  readonly proceedButton: Locator;
  //Text fields keyed by name, so the boundary tests can drive one at a time.
  readonly textFields: Record<AddressTextField, Locator>;

  constructor(page: Page) {
    super(page);
    this.heading = this.page.getByRole('heading', { name: 'Billing Address' });
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
    // street/city/state from an external geocoder (TEST_PLAN.md §16).
    const lookup = waitForApi(this.page, API_PATHS.POSTCODE_LOOKUP);
    await this.houseNumberInput.fill(address.houseNumber);
    await lookup;
    // Overwrite the geocoded street/city/state with our deterministic values.
    await this.streetInput.fill(address.street);
    await this.cityInput.fill(address.city);
    await this.stateInput.fill(address.state);
  }

  /**
   * Fill only country + postal code + house number and let the postcode lookup
   * auto-fill street/city/state, leaving those geocoded values untouched.
   */
  async fillAddressViaLookup(
    country: string,
    postalCode: string,
    houseNumber: string,
  ): Promise<void> {
    const lookup = waitForApi(this.page, API_PATHS.POSTCODE_LOOKUP);
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
