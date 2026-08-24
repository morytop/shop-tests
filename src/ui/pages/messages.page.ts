import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { API_PATHS } from '@src/api/utils/api.util';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { waitForApi } from '@src/ui/utils/network.util';

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
    this.messageRows = this.messageTable
      .getByRole('row')
      .filter({ has: this.page.getByRole('cell') });
    this.messageRow = (subject: string): Locator =>
      this.messageRows.filter({
        has: this.page.getByRole('cell', { name: subject, exact: true }),
      });
    this.messageRowCell = (subject: string, text: string | RegExp): Locator =>
      this.messageRow(subject).getByRole('cell', { name: text, exact: true });
  }

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
