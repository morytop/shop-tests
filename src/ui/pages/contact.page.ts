import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { NavbarComponent } from '@src/ui/components/navbar.component';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

export class ContactPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.CONTACT;
  readonly heading: Locator;
  bookmarks = new NavbarComponent(this.page);

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Contact' });
  }
}
