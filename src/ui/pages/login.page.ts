import { BasePage } from './base.page';
import { Page } from '@playwright/test';
import { NavbarComponent } from '@src/ui/components/navbar.component';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

export class LoginPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.LOGIN;
  heading = this.page.getByRole('heading', { name: 'Login' });
  bookmarks = new NavbarComponent(this.page);
  emailInput = this.page.locator('[data-test="email"]');
  passwordInput = this.page.locator('[data-test="password"]');
  loginButton = this.page.locator('[data-test="login-submit"]');
  loginError = this.page.locator('[data-test="login-error"]');
  forgotPasswordLink = this.page.locator('[data-test="forgot-password-link"]');

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
    const loginResponse = this.page.waitForResponse((response) =>
      response.url().includes('/users/login'),
    );
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
