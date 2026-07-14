import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { PasswordStrengthComponent } from '@src/ui/components/password-strength.component';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { RegisterUser } from '@src/ui/models/user.model';

export class RegisterPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.REGISTER;
  readonly heading: Locator;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly dateOfBirthInput: Locator;
  readonly countrySelect: Locator;
  readonly postcodeInput: Locator;
  readonly houseInput: Locator;
  readonly streetInput: Locator;
  readonly cityInput: Locator;
  readonly stateInput: Locator;
  readonly phoneInput: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly registerButton: Locator;
  /** Server-side banner shown after a failed submit (e.g. a duplicate email). */
  readonly registerError: Locator;
  /**
   * Password requirements list (#passwordHelp) — always rendered; each rule <li>
   * gains `.text-success` once the form control (updateOn:'blur') satisfies it.
   */
  readonly passwordRequirements: Locator;
  readonly reqLength: Locator;
  readonly reqMixedCase: Locator;
  readonly reqNumber: Locator;
  readonly reqSymbol: Locator;
  readonly passwordStrength: PasswordStrengthComponent;

  constructor(page: Page) {
    super(page);
    this.heading = this.page.getByRole('heading', {
      name: 'Customer registration',
    });
    this.firstNameInput = this.page.getByTestId('first-name');
    this.lastNameInput = this.page.getByTestId('last-name');
    this.dateOfBirthInput = this.page.getByTestId('dob');
    this.countrySelect = this.page.getByTestId('country');
    this.postcodeInput = this.page.getByTestId('postal_code');
    this.houseInput = this.page.getByTestId('house_number');
    this.streetInput = this.page.getByTestId('street');
    this.cityInput = this.page.getByTestId('city');
    this.stateInput = this.page.getByTestId('state');
    this.phoneInput = this.page.getByTestId('phone');
    this.emailInput = this.page.getByTestId('email');
    this.passwordInput = this.page.getByTestId('password');
    this.registerButton = this.page.getByTestId('register-submit');
    this.registerError = this.page.getByTestId('register-error');
    this.passwordRequirements = this.page.locator('#passwordHelp li');
    this.reqLength = this.page.locator('#passwordHelp li', {
      hasText: '8 characters',
    });
    this.reqMixedCase = this.page.locator('#passwordHelp li', {
      hasText: 'uppercase and lowercase',
    });
    this.reqNumber = this.page.locator('#passwordHelp li', {
      hasText: 'at least one number',
    });
    this.reqSymbol = this.page.locator('#passwordHelp li', {
      hasText: 'special symbol',
    });
    this.passwordStrength = new PasswordStrengthComponent(page);
  }

  /** Inline error block for a field, keyed by its `data-test` id (e.g. `email`). */
  fieldError(dataTest: string): Locator {
    return this.page.getByTestId(`${dataTest}-error`);
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
