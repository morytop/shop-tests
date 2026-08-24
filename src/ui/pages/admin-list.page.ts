import { AdminPage } from './admin.page';
import { Locator, Page } from '@playwright/test';

export class AdminListPage extends AdminPage {
  readonly PAGE_URL: string;
  readonly table: Locator;
  readonly columnHeaders: Locator;
  readonly rows: Locator;

  constructor(page: Page, pageUrl: string) {
    super(page);
    this.PAGE_URL = pageUrl;
    this.table = this.page.getByRole('table');
    this.columnHeaders = this.table.getByRole('columnheader');
    // Body rows only — `getByRole('row')` on the table would include the header row.
    this.rows = this.table.locator('tbody').getByRole('row');
  }
}
