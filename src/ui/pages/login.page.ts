import { BasePage } from './base.page';
import { Page } from '@playwright/test';
import { API_PATHS } from '@src/api/utils/api.util';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { waitForApi } from '@src/ui/utils/network.util';

export class LoginPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.LOGIN;
  heading = this.page.getByRole('heading', { name: 'Login' });
  emailInput = this.page.getByTestId('email');
  passwordInput = this.page.getByTestId('password');
  loginButton = this.page.getByTestId('login-submit');
  loginError = this.page.getByTestId('login-error');
  forgotPasswordLink = this.page.getByTestId('forgot-password-link');

  // Second-factor prompt: replaces the credentials form in place on /auth/login once
  // the account is TOTP-enabled. `loginError` is shared with the credential errors.
  totpCodeInput = this.page.getByTestId('totp-code');
  verifyTotpButton = this.page.getByTestId('verify-totp');

  constructor(page: Page) {
    super(page);
  }

  async openForgotPassword(): Promise<void> {
    await this.forgotPasswordLink.click();
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * Submit the form and await the auth round-trip. Repeated-attempt flows can't
   * synchronize on the error element becoming visible — it is already visible from
   * the previous attempt, so its text is only repainted once the response lands.
   */
  async loginAndAwaitResponse(email: string, password: string): Promise<void> {
    const loginResponse = waitForApi(this.page, API_PATHS.LOGIN);
    await this.login(email, password);
    await loginResponse;
  }

  async submitTotpCode(code: string): Promise<void> {
    await this.totpCodeInput.fill(code);
    await this.verifyTotpButton.click();
  }

  async failLoginAttempts(
    email: string,
    password: string,
    attempts: number,
  ): Promise<void> {
    for (let attempt = 0; attempt < attempts; attempt++) {
      await this.loginAndAwaitResponse(email, password);
    }
  }
}
