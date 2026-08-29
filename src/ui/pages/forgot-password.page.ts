import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { API_PATHS } from '@src/api/utils/api.util';
import { waitForApi } from '@src/ui/utils/network.util';
import { PAGE_URLS } from '@src/ui/utils/page-urls.util';

export class ForgotPasswordPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.FORGOT_PASSWORD;
  readonly heading: Locator;
  readonly form: Locator;
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly emailError: Locator;
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

  async submit(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }

  async submitAndAwaitResponse(email: string): Promise<void> {
    const forgotPasswordResponse = waitForApi(
      this.page,
      API_PATHS.FORGOT_PASSWORD,
    );
    await this.submit(email);
    await forgotPasswordResponse;
  }
}
