import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
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

  // Server-side banner shown after a failed submit (e.g. a duplicate email).
  registerError = this.page.locator('[data-test="register-error"]');

  // Password requirements list (#passwordHelp) — always rendered; each rule <li>
  // gains `.text-success` once the form control (updateOn:'blur') satisfies it.
  passwordRequirements = this.page.locator('#passwordHelp li');
  reqLength = this.page.locator('#passwordHelp li', {
    hasText: '8 characters',
  });
  reqMixedCase = this.page.locator('#passwordHelp li', {
    hasText: 'uppercase and lowercase',
  });
  reqNumber = this.page.locator('#passwordHelp li', {
    hasText: 'at least one number',
  });
  reqSymbol = this.page.locator('#passwordHelp li', {
    hasText: 'special symbol',
  });

  // Password strength meter — the filled bar and the currently-active label.
  strengthFill = this.page.locator('.strength-bar .fill');
  activeStrengthLabel = this.page.locator('.strength-labels span.active');

  constructor(page: Page) {
    super(page);
  }

  /** Inline error block for a field, keyed by its `data-test` id (e.g. `email`). */
  fieldError(dataTest: string): Locator {
    return this.page.locator(`[data-test="${dataTest}-error"]`);
  }

  /**
   * Type a password and blur it. The register form is `updateOn: 'blur'`, so the
   * requirements-list highlighting and control validity only recompute once focus
   * leaves the field — filling without blurring leaves the control pristine.
   */
  async enterPassword(value: string): Promise<void> {
    await this.passwordInput.fill(value);
    await this.passwordInput.blur();
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
