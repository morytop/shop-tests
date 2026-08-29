import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/utils/page-urls.util';

export class PrivacyPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.PRIVACY;
  readonly content: Locator;
  readonly sectionTitles: Locator;
  readonly footerLink: Locator;

  constructor(page: Page) {
    super(page);
    this.content = page.locator('app-privacy');
    this.sectionTitles = this.content.getByRole('strong');
    this.footerLink = page
      .getByRole('contentinfo')
      .getByRole('link', { name: 'Privacy Policy' });
  }
}
