import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { API_PATHS } from '@src/api/utils/api.util';
import { TotpFormComponent } from '@src/ui/components/totp-form.component';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { waitForApi } from '@src/ui/utils/network.util';

export class LoginPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.LOGIN;
  readonly heading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly loginError: Locator;
  /**
   * Second-factor prompt: replaces the credentials form in place on /auth/login once
   * the account is TOTP-enabled. `loginError` is shared with the credential errors.
   */
  readonly totpForm: TotpFormComponent;
  readonly forgotPasswordLink: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.page.getByRole('heading', { name: 'Login' });
    this.emailInput = this.page.getByTestId('email');
    this.passwordInput = this.page.getByTestId('password');
    this.loginButton = this.page.getByTestId('login-submit');
    this.loginError = this.page.getByTestId('login-error');
    this.forgotPasswordLink = this.page.getByTestId('forgot-password-link');
    this.totpForm = new TotpFormComponent(page);
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
