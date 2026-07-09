import { BasePage } from './base.page';
import { Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

/**
 * Forgot-password form (`/auth/forgot-password`).
 *
 * Careful: submitting a *registered* address is destructive — the endpoint resets
 * that account's password outright rather than mailing a reset link (test_plan.md
 * §21). Only ever drive it with a disposable user or an unregistered address.
 */
export class ForgotPasswordPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.FORGOT_PASSWORD;
  heading = this.page.getByRole('heading', { name: 'Forgot Password' });
  form = this.page.locator('[data-test="forgot-password-form"]');
  emailInput = this.page.locator('[data-test="email"]');
  submitButton = this.page.locator('[data-test="forgot-password-submit"]');

  // Client-side validation block, revealed only after a submit attempt.
  emailError = this.page.locator('[data-test="email-error"]');

  // Server-response banners. Neither carries a data-test, so they are located by
  // role composed with the bootstrap variant class.
  successAlert = this.page
    .getByRole('alert')
    .and(this.page.locator('.alert-success'));
  errorAlert = this.page
    .getByRole('alert')
    .and(this.page.locator('.alert-danger'));

  constructor(page: Page) {
    super(page);
  }

  /**
   * Submit without awaiting the network: an invalid email is rejected client-side
   * and never reaches the API, so awaiting a response here would hang.
   */
  async submit(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  /**
   * Submit and await the API round-trip. Both banners are removed again ~3s after
   * they render, so an assertion that races a slow response can miss them entirely.
   */
  async submitAndAwaitResponse(email: string): Promise<void> {
    const forgotPasswordResponse = this.page.waitForResponse((response) =>
      response.url().includes('/users/forgot-password'),
    );
    await this.submit(email);
    await forgotPasswordResponse;
  }
}
