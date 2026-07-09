import { BasePage } from './base.page';
import { Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

/**
 * Customer profile page (`/account/profile`), currently modelling only its
 * "Set up Two-Factor Authentication" section.
 *
 * Loading the page POSTs `/totp/setup`, which mints and persists a **new** secret
 * on every visit for an eligible account — so the secret must be read from the DOM
 * at the moment it is used, never cached across navigations. The seeded
 * `customer@`/`admin@` accounts are refused (403) and see only `totpError`.
 */
export class ProfilePage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.PROFILE;
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
