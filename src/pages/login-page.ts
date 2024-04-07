import { BookmarksComponent } from '../components/bookmarks';
import { BasePage } from './base-page';
import { Page } from '@playwright/test';

export class LoginPage extends BasePage {
  url = '/#/auth/login';
  heading = this.page.getByRole('heading', { name: 'Login' });
  bookmarks = new BookmarksComponent(this.page);
  emailInput = this.page.locator('[data-test="email"]');
  passwordInput = this.page.locator('[data-test="password"]');
  loginButton = this.page.locator('[data-test="login-submit"]');

  constructor(page: Page) {
    super(page);
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }
}
