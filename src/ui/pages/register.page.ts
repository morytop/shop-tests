import { BasePage } from './base.page';
import { Page } from '@playwright/test';
import { NavbarComponent } from '@src/ui/components/navbar.component';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

export class RegisterPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.REGISTER;
  heading = this.page.getByRole('heading', { name: 'Customer registration' });
  bookmarks = new NavbarComponent(this.page);
  firstNameInput = this.page.locator('[data-test="first-name"]');
  lastNameInput = this.page.locator('[data-test="last-name"]');
  dateOfBirthInput = this.page.locator('[data-test="dob"]');
  countrySelect = this.page.locator('[data-test="country"]');
  postcodeInput = this.page.locator('[data-test="postal_code"]');
  houseInput = this.page.locator('[data-test="house_number"]');
  streetInput = this.page.locator('[data-test="street"]');
  cityInput = this.page.locator('[data-test="city"]');
  stateInput = this.page.locator('[data-test="state"]');
  phoneInput = this.page.locator('[data-test="phone"]');
  emailInput = this.page.locator('[data-test="email"]');
  passwordInput = this.page.locator('[data-test="password"]');
  registerButton = this.page.locator('[data-test="register-submit"]');

  constructor(page: Page) {
    super(page);
  }

  async register(
    firstName: string,
    lastName: string,
    dateOfBirth: string,
    country: string,
    street: string,
    postcode: string,
    houseNumber: string,
    city: string,
    state: string,
    phone: string,
    email: string,
    password: string,
  ): Promise<void> {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.dateOfBirthInput.fill(dateOfBirth);
    await this.countrySelect.selectOption(country);
    await this.streetInput.fill(street);
    await this.postcodeInput.fill(postcode);
    await this.houseInput.fill(houseNumber);
    await this.cityInput.fill(city);
    await this.stateInput.fill(state);
    await this.phoneInput.fill(phone);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.registerButton.click();
  }
}
