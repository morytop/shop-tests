import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';

/**
 * Shared shell of every page in the admin back office. All of them — dashboard, the six
 * list sections, settings and the three report pages — render exactly one
 * `<h1 data-test="page-title">`, which is the only locator common to the whole area and
 * the anchor for the smoke sweep (TEST_PLAN.md §31).
 *
 * Admin pages are entered by direct URL: the section links live in the collapsed account
 * dropdown (`NavbarComponent.userMenu`), not a sidebar (§9).
 */
export abstract class AdminPage extends BasePage {
  readonly pageTitle: Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = this.page.getByTestId('page-title');
  }
}
