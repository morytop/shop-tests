import { BookmarksComponent } from '../components/bookmarks';
import { BasePage } from './base-page';
import { Page } from '@playwright/test';

export class ContactPage extends BasePage {
  url = '/#/contact';
  heading = this.page.getByRole('heading', { name: 'Contact' });
  bookmarks = new BookmarksComponent(this.page);

  constructor(page: Page) {
    super(page);
  }
}
