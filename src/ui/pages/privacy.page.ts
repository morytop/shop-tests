import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

export class PrivacyPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.PRIVACY;
  readonly content: Locator;
  readonly sectionTitles: Locator;
  readonly footerLink: Locator;

  constructor(page: Page) {
    super(page);
    this.content = page.locator('app-privacy');
    // <strong> has an implicit ARIA "strong" role (HTML-AAM) — verified live that
    // Playwright's accessibility tree exposes it, so role-based beats a raw tag selector.
    this.sectionTitles = this.content.getByRole('strong');
    this.footerLink = page
      .getByRole('contentinfo')
      .getByRole('link', { name: 'Privacy Policy' });
  }
}
