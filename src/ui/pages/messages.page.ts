import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

/**
 * Customer messages list (`/account/messages`), reachable from the `/account` dashboard
 * tile or directly. Populated by `GET /messages?page=1`, and — like the invoices and
 * favorites lists — the table renders before that response lands, so callers must enter
 * via `gotoAndAwaitLoaded()` rather than the inherited `goto()`.
 *
 * Neither the table nor its cells carry a `data-test`; columns are
 * `Subject | Message | Status | Date | (Details link)`, where Subject is the raw select
 * value and Message is the body truncated by the app's `TruncatePipe` at 50 chars
 * (TEST_PLAN.md §30).
 */
export class MessagesPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.MESSAGES;
  readonly title: Locator;
  readonly messageTable: Locator;
  readonly messageRows: Locator;

  constructor(page: Page) {
    super(page);
    this.title = this.page.getByTestId('page-title');
    this.messageTable = this.page.getByRole('table');
    // Body rows only — `getByRole('row')` on the whole table includes the header row.
    this.messageRows = this.messageTable.locator('tbody').getByRole('row');
  }

  /**
   * Navigate and wait for the list to actually arrive, so an assertion can't run against
   * a table that is merely still empty (favorites §26 / invoices §29 pattern).
   */
  async gotoAndAwaitLoaded(): Promise<void> {
    await Promise.all([
      this.page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname.endsWith('/messages') &&
          response.request().method() === 'GET',
      ),
      this.goto(),
    ]);
  }

  async openDetails(index = 0): Promise<void> {
    await this.messageRows
      .nth(index)
      .getByRole('link', { name: 'Details' })
      .click();
  }
}
