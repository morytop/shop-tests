import { AdminPage } from './admin.page';
import { Locator, Page } from '@playwright/test';

/**
 * Shared listing shell of the six admin list sections (Brands, Categories, Products,
 * Orders, Users, Messages). Each renders a single `table.table-hover` whose table, rows
 * and cells carry **no `data-test`** — the same shape as the customer invoices and
 * messages lists (TEST_PLAN.md §29/§30) — so everything is located structurally by role.
 *
 * The six sections differ only in their URL, so this class is instantiated directly with
 * one of the `PAGE_URLS.ADMIN_*` constants rather than being subclassed per section. The
 * per-row edit/delete controls are keyed by entity ULID and are deliberately not modelled
 * here, this pass being read-only (§31).
 */
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
