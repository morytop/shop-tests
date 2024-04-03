import { BookmarksComponent } from '../components/bookmarks';
import { BasePage } from './base-page';
import { Page } from '@playwright/test';

export class HandToolsPage extends BasePage {
  url = '/#/category/hand-tools';
  bookmarks = new BookmarksComponent(this.page);

  constructor(page: Page) {
    super(page);
  }
}
