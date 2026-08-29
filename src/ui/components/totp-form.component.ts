import { Locator, Page } from '@playwright/test';

/**
 * The 6-digit second-factor form (`totp-code` + `verify-totp`). Rendered in two
 * places with identical markup.
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
