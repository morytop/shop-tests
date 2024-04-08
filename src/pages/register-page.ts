import { BookmarksComponent } from '../components/bookmarks';
import { BasePage } from './base-page';
import { Page } from '@playwright/test';

export class RegisterPage extends BasePage {
  url = '/#/auth/register';
  heading = this.page.getByRole('heading', { name: 'Customer registration' });
  bookmarks = new BookmarksComponent(this.page);
  firstNameInput = this.page.locator('[data-test="first-name"]');
  lastNameInput = this.page.locator('[data-test="last-name"]');
  dateOfBirthInput = this.page.locator('[data-test="dob"]');
  addressInput = this.page.locator('[data-test="address"]');
  postcodeInput = this.page.locator('[data-test="postcode"]');
  cityInput = this.page.locator('[data-test="city"]');
  stateInput = this.page.locator('[data-test="state"]');
  countrySelect = this.page.locator('[data-test="country"]');
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
    address: string,
    postcode: string,
    city: string,
    state: string,
    country: string,
    phone: string,
    email: string,
    password: string,
  ): Promise<void> {
    await this.firstNameInput.fill(firstName);
    await this.lastNameInput.fill(lastName);
    await this.dateOfBirthInput.fill(dateOfBirth);
    await this.addressInput.fill(address);
    await this.postcodeInput.fill(postcode);
    await this.cityInput.fill(city);
    await this.stateInput.fill(state);
    await this.countrySelect.selectOption(country);
    await this.phoneInput.fill(phone);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.registerButton.click();
  }
}
