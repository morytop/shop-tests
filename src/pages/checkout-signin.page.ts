import { NavbarComponent } from '../components/navbar';
import { PAGE_URLS } from '../constants/page-urls';
import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';

/**
 * The "Sign in" step of the checkout wizard (`/checkout`), reached by proceeding
 * from the cart step (`proceed-1`) — `goto()` lands on the cart step, not here,
 * like `ProductDetailPage`. The step renders a tabbed panel ("Sign in" /
 * "Continue as Guest"); the default "Sign in" tab holds the login form. The
 * "Continue as Guest" tab is the wizard-only marker absent on `/auth/login`
 * (test_plan.md §15).
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
  }
}
