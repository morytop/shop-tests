import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { API_PATHS } from '@src/api/utils/api.util';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { waitForApi } from '@src/ui/utils/network.util';

/**
 * Forgot-password form (`/auth/forgot-password`).
 *
 * Careful: submitting a *registered* address is destructive — the endpoint resets
 * that account's password outright rather than mailing a reset link (TEST_PLAN.md
 * §21). Only ever drive it with a disposable user or an unregistered address.
 */
export class ForgotPasswordPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.FORGOT_PASSWORD;
  readonly heading: Locator;
  readonly form: Locator;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  /** Client-side validation block, revealed only after a submit attempt. */
  readonly emailError: Locator;
  /**
   * Server-response banners. Neither carries a data-test, so they are located by
   * role composed with the bootstrap variant class.
   */
  readonly successAlert: Locator;
  readonly errorAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = this.page.getByRole('heading', { name: 'Forgot Password' });
    this.form = this.page.getByTestId('forgot-password-form');
    this.emailInput = this.page.getByTestId('email');
    this.submitButton = this.page.getByTestId('forgot-password-submit');
    this.emailError = this.page.getByTestId('email-error');
    this.successAlert = this.page
      .getByRole('alert')
      .and(this.page.locator('.alert-success'));
    this.errorAlert = this.page
      .getByRole('alert')
      .and(this.page.locator('.alert-danger'));
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
    const forgotPasswordResponse = waitForApi(
      this.page,
      API_PATHS.FORGOT_PASSWORD,
    );
    await this.submit(email);
    await forgotPasswordResponse;
  }
}
