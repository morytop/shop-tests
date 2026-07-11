import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { NavbarComponent } from '@src/ui/components/navbar.component';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

/**
 * Static privacy policy (`/privacy`). Rendered by the `app-privacy` component as bare
 * `<strong>`/`<p>` pairs: it carries **no `data-test` attributes and no headings at all**
 * (TEST_PLAN.md §35), so the section titles can only be located structurally — hence the
 * `strong` CSS step, which no role/label locator can replace here.
 *
 * The "Privacy Policy" link in the global footer is the page's only in-app entry point.
 */
export class PrivacyPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.PRIVACY;
  readonly content: Locator;
  readonly sectionTitles: Locator;
  readonly footerLink: Locator;
  bookmarks = new NavbarComponent(this.page);

  constructor(page: Page) {
    super(page);
    this.content = page.locator('app-privacy');
    this.sectionTitles = this.content.locator('strong');
    this.footerLink = page
      .getByRole('contentinfo')
      .getByRole('link', { name: 'Privacy Policy' });
  }
}
