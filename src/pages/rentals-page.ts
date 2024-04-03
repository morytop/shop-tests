import { BookmarksComponent } from '../components/bookmarks';
import { BasePage } from './base-page';
import { Page } from '@playwright/test';

export class RentalsPage extends BasePage {
  url = '/#/rentals';
  bookmarks = new BookmarksComponent(this.page);

  constructor(page: Page) {
    super(page);
  }
}
