import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { PasswordStrengthComponent } from '@src/ui/components/password-strength.component';
import { TotpFormComponent } from '@src/ui/components/totp-form.component';
import { TOTP_SECRET_REGEX } from '@src/ui/constants/formats';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { ProfileDetails } from '@src/ui/models/user.model';

const FIRST_NAME_SELECTOR = '[data-test="first-name"]';

export class ProfilePage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.PROFILE;
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly phoneInput: Locator;
  readonly streetInput: Locator;
  readonly postalCodeInput: Locator;
  readonly cityInput: Locator;
  readonly stateInput: Locator;
  readonly countryInput: Locator;
  readonly updateProfileButton: Locator;
  readonly profileFields: Record<keyof ProfileDetails, Locator>;
  readonly profileForm: Locator;
  readonly profileSuccess: Locator;
  readonly profileError: Locator;
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly changePasswordButton: Locator;
  readonly passwordForm: Locator;
  readonly passwordSuccess: Locator;
  readonly passwordError: Locator;
  readonly passwordStrength: PasswordStrengthComponent;
  readonly totpHeading: Locator;
  readonly totpQrCode: Locator;
  readonly totpSecret: Locator;
  readonly populatedTotpSecret: Locator;
  readonly totpForm: TotpFormComponent;
  readonly totpError: Locator;
  readonly totpSuccess: Locator;

  constructor(page: Page) {
    super(page);
    this.totpHeading = this.page.getByRole('heading', {
      name: 'Set up Two-Factor Authentication',
    });
    this.totpQrCode = this.page.locator('qrcode canvas');
    this.totpSecret = this.page.getByTestId('totp-secret');
    this.populatedTotpSecret = this.totpSecret.filter({
      hasText: TOTP_SECRET_REGEX,
    });
    this.totpForm = new TotpFormComponent(page);
    this.totpError = this.page.getByTestId('totp-error');
    this.totpSuccess = this.page.getByTestId('totp-success');
    this.firstNameInput = this.page.getByTestId('first-name');
    this.lastNameInput = this.page.getByTestId('last-name');
    this.emailInput = this.page.getByTestId('email');
    this.phoneInput = this.page.getByTestId('phone');
    this.streetInput = this.page.getByTestId('street');
    this.postalCodeInput = this.page.getByTestId('postal_code');
    this.cityInput = this.page.getByTestId('city');
    this.stateInput = this.page.getByTestId('state');
    this.countryInput = this.page.getByTestId('country');
    this.updateProfileButton = this.page.getByTestId('update-profile-submit');
    this.profileFields = {
      firstName: this.firstNameInput,
      lastName: this.lastNameInput,
      phone: this.phoneInput,
      street: this.streetInput,
      postalCode: this.postalCodeInput,
      city: this.cityInput,
      state: this.stateInput,
      country: this.countryInput,
    };
    this.profileForm = this.page
      .locator('form')
      .filter({ has: this.updateProfileButton });
    this.profileSuccess = this.profileForm
      .getByRole('alert')
      .and(this.page.locator('.alert-success'));
    this.profileError = this.profileForm
      .getByRole('alert')
      .and(this.page.locator('.alert-danger'));

    this.currentPasswordInput = this.page.getByTestId('current-password');
    this.newPasswordInput = this.page.getByTestId('new-password');
    this.confirmPasswordInput = this.page.getByTestId('new-password-confirm');
    this.changePasswordButton = this.page.getByTestId('change-password-submit');
    this.passwordForm = this.page
      .locator('form')
      .filter({ has: this.changePasswordButton });
    this.passwordSuccess = this.passwordForm
      .getByRole('alert')
      .and(this.page.locator('.alert-success'));
    this.passwordError = this.passwordForm
      .getByRole('alert')
      .and(this.page.locator('.alert-danger'));
    this.passwordStrength = new PasswordStrengthComponent(this.passwordForm);
  }

  async waitForProfileLoaded(): Promise<void> {
    await this.page.waitForFunction((selector) => {
      const input = document.querySelector<HTMLInputElement>(selector);

      return Boolean(input?.value);
    }, FIRST_NAME_SELECTOR);
  }

  async fillProfile(details: ProfileDetails): Promise<void> {
    await this.firstNameInput.fill(details.firstName);
    await this.lastNameInput.fill(details.lastName);
    await this.phoneInput.fill(details.phone);
    await this.streetInput.fill(details.street);
    await this.postalCodeInput.fill(details.postalCode);
    await this.cityInput.fill(details.city);
    await this.stateInput.fill(details.state);
    await this.countryInput.fill(details.country);
  }

  async submitProfile(): Promise<void> {
    await this.updateProfileButton.click();
  }

  async updateProfile(details: ProfileDetails): Promise<void> {
    await this.fillProfile(details);
    await this.submitProfile();
  }

  /**
   * Type a new password. Unlike the register form (`updateOn: 'blur'`), this control
   * recomputes the strength meter straight off the typed value, so no blur is needed.
   */
  async enterNewPassword(password: string): Promise<void> {
    await this.newPasswordInput.fill(password);
  }

  async changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string,
  ): Promise<void> {
    await this.currentPasswordInput.fill(currentPassword);
    await this.newPasswordInput.fill(newPassword);
    await this.confirmPasswordInput.fill(confirmPassword);
    await this.changePasswordButton.click();
  }

  /**
   * The manual-entry key, read fresh — a page load rotates it. Waits for the
   * async `/totp/setup` write to land before reading, otherwise the element is
   * present but empty.
   */
  async readTotpSecret(): Promise<string> {
    await this.populatedTotpSecret.waitFor();

    return (await this.totpSecret.innerText()).trim();
  }
}
