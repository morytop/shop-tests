import { NavbarComponent } from '../components/navbar';
import { PAGE_URLS } from '../constants/page-urls';
import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';

export class ContactPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.CONTACT;
  readonly heading: Locator;
  bookmarks = new NavbarComponent(this.page);

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Contact' });
  }
}
