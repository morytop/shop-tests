import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

export class CheckoutSigninPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.CHECKOUT;
  readonly signInTab: Locator;
  readonly continueAsGuestTab: Locator;
  readonly loginHeading: Locator;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly guestEmailInput: Locator;
  readonly guestFirstNameInput: Locator;
  readonly guestLastNameInput: Locator;
  readonly guestSubmitButton: Locator;
  readonly proceedAsGuestButton: Locator;
  readonly proceedAsUserButton: Locator;
  readonly alreadyLoggedInMessage: Locator;

  constructor(page: Page) {
    super(page);
    this.signInTab = this.page.getByRole('tab', { name: 'Sign in' });
    this.continueAsGuestTab = this.page.getByRole('tab', {
      name: 'Continue as Guest',
    });
    this.loginHeading = this.page.getByRole('heading', { name: 'Login' });
    this.emailInput = this.page.getByTestId('email');
    this.passwordInput = this.page.getByTestId('password');
    this.loginButton = this.page.getByTestId('login-submit');
    this.guestEmailInput = this.page.getByTestId('guest-email');
    this.guestFirstNameInput = this.page.getByTestId('guest-first-name');
    this.guestLastNameInput = this.page.getByTestId('guest-last-name');
    this.guestSubmitButton = this.page.getByTestId('guest-submit');
    this.proceedAsGuestButton = this.page.getByTestId('proceed-2-guest');
    this.proceedAsUserButton = this.page.getByTestId('proceed-2');
    this.alreadyLoggedInMessage = this.page.getByText(
      'you are already logged in',
    );
  }

  async continueAsGuest(
    email: string,
    firstName: string,
    lastName: string,
  ): Promise<void> {
    await this.continueAsGuestTab.click();
    await this.guestEmailInput.fill(email);
    await this.guestFirstNameInput.fill(firstName);
    await this.guestLastNameInput.fill(lastName);
    await this.guestSubmitButton.click();
    await this.proceedAsGuestButton.click();
  }

  async proceedAsLoggedInUser(): Promise<void> {
    await this.proceedAsUserButton.click();
  }
}
