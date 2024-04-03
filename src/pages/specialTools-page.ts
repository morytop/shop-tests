import { BookmarksComponent } from '../components/bookmarks';
import { BasePage } from './base-page';
import { Page } from '@playwright/test';

export class SpecialToolsPage extends BasePage {
  url = '/#/category/special-tools';
  bookmarks = new BookmarksComponent(this.page);

  constructor(page: Page) {
    super(page);
  }
}
