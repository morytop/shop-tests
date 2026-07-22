import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { API_PATHS } from '@src/api/utils/api.util';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { waitForApi } from '@src/ui/utils/network.util';

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
  readonly pageTitle: Locator;
  readonly messageTable: Locator;
  readonly messageRows: Locator;
  readonly messageRow: (subject: string) => Locator;
  readonly messageRowCell: (subject: string, text: string | RegExp) => Locator;

  constructor(page: Page) {
    super(page);
    this.pageTitle = this.page.getByTestId('page-title');
    this.messageTable = this.page.getByRole('table');
    // Body rows only — the header row self-excludes because its cells are
    // `columnheader`s, not `cell`s.
    this.messageRows = this.messageTable
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell') });
    // Keyed on an exact Subject-cell match: body cells are ≥50 chars (truncated to 53),
    // so a subject value can never collide with another cell in the row.
    this.messageRow = (subject: string): Locator =>
      this.messageRows.filter({
        has: this.page.getByRole('cell', { name: subject, exact: true }),
      });
    // `exact` pins string matches; Playwright ignores it for RegExp names.
    this.messageRowCell = (subject: string, text: string | RegExp): Locator =>
      this.messageRow(subject).getByRole('cell', { name: text, exact: true });
  }

  /**
   * Navigate and wait for the list to actually arrive, so an assertion can't run against
   * a table that is merely still empty (favorites §26 / invoices §29 pattern).
   */
  async gotoAndAwaitLoaded(): Promise<void> {
    await Promise.all([
      waitForApi(this.page, API_PATHS.MESSAGES, { method: 'GET' }),
      this.goto(),
    ]);
  }

  async openDetails(subject: string): Promise<void> {
    await this.messageRow(subject)
      .getByRole('link', { name: 'Details' })
      .click();
  }
}
