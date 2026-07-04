import { NavbarComponent } from '../components/navbar';
import { PAGE_URLS } from '../constants/page-urls';
import { BasePage } from './base.page';
import { Page } from '@playwright/test';

export class HandToolsPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.HAND_TOOLS;
  bookmarks = new NavbarComponent(this.page);

  constructor(page: Page) {
    super(page);
  }
}
