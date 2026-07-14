import { Locator, Page } from '@playwright/test';

/**
 * The 6-digit second-factor form (`totp-code` + `verify-totp`). Rendered in two
 * places with identical markup: the login page (swapped in for the credentials
 * form after a TOTP-enabled account submits valid credentials) and the profile
 * page's "Set up Two-Factor Authentication" section. Page-scoped, so the owning
 * page objects instantiate it — unlike the global navbar/chat-widget fixtures.
 */
export class TotpFormComponent {
  readonly page: Page;
  readonly codeInput: Locator;
  readonly verifyButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.codeInput = this.page.getByTestId('totp-code');
    this.verifyButton = this.page.getByTestId('verify-totp');
  }

  async submitCode(code: string): Promise<void> {
    await this.codeInput.fill(code);
    await this.verifyButton.click();
  }
}
