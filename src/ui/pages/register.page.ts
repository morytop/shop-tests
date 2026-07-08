import { BasePage } from './base.page';
import { Page } from '@playwright/test';
import { NavbarComponent } from '@src/ui/components/navbar.component';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { RegisterUser } from '@src/ui/models/user.model';

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

  async register(user: RegisterUser): Promise<void> {
    await this.firstNameInput.fill(user.firstName);
    await this.lastNameInput.fill(user.lastName);
    await this.dateOfBirthInput.fill(user.dateOfBirth);
    await this.countrySelect.selectOption(user.country);
    await this.streetInput.fill(user.street);
    await this.postcodeInput.fill(user.postcode);
    await this.houseInput.fill(user.houseNumber);
    await this.cityInput.fill(user.city);
    await this.stateInput.fill(user.state);
    await this.phoneInput.fill(user.phone);
    await this.emailInput.fill(user.email);
    await this.passwordInput.fill(user.password);
    await this.registerButton.click();
  }
}
