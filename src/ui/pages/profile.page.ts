import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { ProfileDetails } from '@src/ui/models/user.model';

/** Shared by the `firstNameInput` locator and the `waitForProfileLoaded()` gate. */
const FIRST_NAME_SELECTOR = '[data-test="first-name"]';

/**
 * Customer profile page (`/account/profile`), modelling the profile form, the
 * change-password form below it, and the "Set up Two-Factor Authentication" section
 * below that.
 *
 * The profile form is populated by an async `GET /users/me` that lands *after*
 * navigation resolves, and Angular writes only the inputs' `value` property (the
 * `value` attribute stays absent) — so a `fill()` issued too early is silently
 * overwritten. Callers must gate on `waitForProfileLoaded()` first.
 *
 * Loading the page also POSTs `/totp/setup`, which mints and persists a **new**
 * secret on every visit for an eligible account — so the secret must be read from
 * the DOM at the moment it is used, never cached across navigations. The seeded
 * `customer@`/`admin@` accounts are refused (403) and see only `totpError`.
 *
 * The profile and change-password forms each render their own `.alert-*` banners as
 * siblings, so every alert locator here is scoped to its own form rather than matched
 * page-wide.
 */
export class ProfilePage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.PROFILE;
  readonly heading: Locator;
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
  /** Editable fields keyed by name, so the required-field tests can blank one at a time. */
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
  readonly strengthFill: Locator;
  readonly activeStrengthLabel: Locator;

  totpHeading = this.page.getByRole('heading', {
    name: 'Set up Two-Factor Authentication',
  });
  totpQrCode = this.page.locator('qrcode canvas');
  totpSecret = this.page.locator('[data-test="totp-secret"]');
  // The <p> is rendered before `/totp/setup` resolves, so it is briefly empty —
  // this narrows to the populated state for use as a synchronization gate.
  populatedTotpSecret = this.totpSecret.filter({ hasText: /^[A-Z2-7]{16}$/ });
  totpCodeInput = this.page.locator('[data-test="totp-code"]');
  verifyTotpButton = this.page.locator('[data-test="verify-totp"]');

  // Both banners are prefixed in the template (`Error:` / `Success:`).
  totpError = this.page.locator('[data-test="totp-error"]');
  totpSuccess = this.page.locator('[data-test="totp-success"]');

  constructor(page: Page) {
    super(page);
    this.heading = this.page.locator('[data-test="page-title"]');
    this.firstNameInput = this.page.locator(FIRST_NAME_SELECTOR);
    this.lastNameInput = this.page.locator('[data-test="last-name"]');
    this.emailInput = this.page.locator('[data-test="email"]');
    this.phoneInput = this.page.locator('[data-test="phone"]');
    this.streetInput = this.page.locator('[data-test="street"]');
    this.postalCodeInput = this.page.locator('[data-test="postal_code"]');
    this.cityInput = this.page.locator('[data-test="city"]');
    this.stateInput = this.page.locator('[data-test="state"]');
    // Free text here, unlike the billing step's <select> (test_plan.md §24).
    this.countryInput = this.page.locator('[data-test="country"]');
    this.updateProfileButton = this.page.locator(
      '[data-test="update-profile-submit"]',
    );
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
    // The sibling change-password form renders its own `.alert-*` banners, so both
    // alerts are scoped to the profile form rather than matched page-wide.
    this.profileForm = this.page
      .locator('form')
      .filter({ has: this.updateProfileButton });
    this.profileSuccess = this.profileForm.locator('.alert-success');
    this.profileError = this.profileForm.locator('.alert-danger');

    this.currentPasswordInput = this.page.locator(
      '[data-test="current-password"]',
    );
    this.newPasswordInput = this.page.locator('[data-test="new-password"]');
    this.confirmPasswordInput = this.page.locator(
      '[data-test="new-password-confirm"]',
    );
    this.changePasswordButton = this.page.locator(
      '[data-test="change-password-submit"]',
    );
    this.passwordForm = this.page
      .locator('form')
      .filter({ has: this.changePasswordButton });
    this.passwordSuccess = this.passwordForm.locator('.alert-success');
    this.passwordError = this.passwordForm.locator('.alert-danger');
    // The register form renders the same meter markup, but its copy is broken in
    // production (test_plan.md §19); this one tracks the typed value (§25).
    this.strengthFill = this.passwordForm.locator('.strength-bar .fill');
    this.activeStrengthLabel = this.passwordForm.locator(
      '.strength-labels span.active',
    );
  }

  /**
   * Block until `GET /users/me` has populated the form. The inputs carry no text and
   * no `value` attribute, so neither `waitFor()` nor `.filter()` can express this —
   * only the live `value` property can. This is a wait, not an assertion.
   */
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

  async submitTotpCode(code: string): Promise<void> {
    await this.totpCodeInput.fill(code);
    await this.verifyTotpButton.click();
  }
}
