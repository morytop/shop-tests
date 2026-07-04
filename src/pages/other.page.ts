import { NavbarComponent } from '../components/navbar';
import { PAGE_URLS } from '../constants/page-urls';
import { BasePage } from './base.page';
import { Page } from '@playwright/test';

export class OtherPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.OTHER;
  bookmarks = new NavbarComponent(this.page);

  constructor(page: Page) {
    super(page);
  }
}
