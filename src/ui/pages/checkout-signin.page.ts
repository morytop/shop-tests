import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { NavbarComponent } from '@src/ui/components/navbar.component';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

/**
 * The "Sign in" step of the checkout wizard (`/checkout`), reached by proceeding
 * from the cart step (`proceed-1`) — `goto()` lands on the cart step, not here,
 * like `ProductDetailPage`. The step renders a tabbed panel ("Sign in" /
 * "Continue as Guest"); the default "Sign in" tab holds the login form. The
 * "Continue as Guest" tab is the wizard-only marker absent on `/auth/login`
 * (TEST_PLAN.md §15).
 */
export class CheckoutSigninPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.CHECKOUT;
  readonly bookmarks: NavbarComponent;
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
    this.bookmarks = new NavbarComponent(this.page);
    // Tabs are bare `<a role="tab">` links with no data-test/id.
    this.signInTab = this.page.getByRole('tab', { name: 'Sign in' });
    this.continueAsGuestTab = this.page.getByRole('tab', {
      name: 'Continue as Guest',
    });
    // The active tabpanel's `<h3>Login</h3>` heading (no data-test).
    this.loginHeading = this.page.getByRole('heading', { name: 'Login' });
    // Form fields reuse the same data-test ids as the standalone /auth/login page;
    // the submit button is labelled "Login".
    this.emailInput = this.page.locator('[data-test="email"]');
    this.passwordInput = this.page.locator('[data-test="password"]');
    this.loginButton = this.page.locator('[data-test="login-submit"]');
    // The "Continue as Guest" tab reveals an intermediate details form (email +
    // name) that must be submitted before the wizard advances to Billing Address.
    this.guestEmailInput = this.page.locator('[data-test="guest-email"]');
    this.guestFirstNameInput = this.page.locator(
      '[data-test="guest-first-name"]',
    );
    this.guestLastNameInput = this.page.locator(
      '[data-test="guest-last-name"]',
    );
    this.guestSubmitButton = this.page.locator('[data-test="guest-submit"]');
    // After guest details are submitted, a distinct "Proceed to checkout" button
    // (proceed-2-guest) advances to Billing Address; the logged-in path uses
    // proceed-2 instead.
    this.proceedAsGuestButton = this.page.locator(
      '[data-test="proceed-2-guest"]',
    );
    this.proceedAsUserButton = this.page.locator('[data-test="proceed-2"]');
    // Shown on the sign-in step only when already authenticated (TEST_PLAN.md §9):
    // "Hello {First} {Last}, you are already logged in. You can proceed to checkout."
    this.alreadyLoggedInMessage = this.page.getByText(
      'you are already logged in',
    );
  }

  /**
   * Guest path from the sign-in step to Billing Address: open the "Continue as
   * Guest" tab, provide the required guest details, then advance twice
   * (guest-submit reveals the proceed-2-guest button).
   */
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
