import { BookmarksComponent } from '../components/bookmarks';
import { BasePage } from './base-page';
import { Page } from '@playwright/test';

export class LoginPage extends BasePage {
  url = '/#/auth/login';
  heading = this.page.getByRole('heading', { name: 'Login' });
  bookmarks = new BookmarksComponent(this.page);

  constructor(page: Page) {
    super(page);
  }
}
