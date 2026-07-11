import { expect, test } from '@src/merge.fixture';

// User Stories v5 — Admin dashboard (test_plan.md §5.20), smoke level only. One test per
// admin section, asserting it loads for an admin and renders its own shell: the page
// title, and the list's column headers / the report's chart. CRUD (create/edit/delete a
// test-created product, category, brand or user, order status changes, admin message
// replies) is deliberately NOT covered — see §5.20 and §31 for what stays deferred.
//
// Data safety (§3): the seeded admin is shared, READ-ONLY fixture data. Every test here
// navigates and asserts; none submits a form. The settings page in particular rewrites
// APP-WIDE configuration for every user of the demo site, so it is only ever loaded.
//
// Sections are entered by direct URL; that the account dropdown actually links to each of
// them is asserted once, in dashboard.spec.ts (§9, §31).
//
// The row assertions take a seeded demo shop to have at least one brand/category/product/
// user/order/message. That is data-independent enough to be safe (§3 forbids pinning
// counts, names or ids — none are pinned) and it is what proves the list's fetch landed
// rather than just its empty shell.

test.describe('Verify admin sections', () => {
  test(
    'brands list loads',
    { tag: ['@admin', '@regression'] },
    async ({ adminBrandsPage, loginAsAdmin }) => {
      await loginAsAdmin();

      await adminBrandsPage.goto();

      await expect(adminBrandsPage.pageTitle).toHaveText('Brands');
      await expect(adminBrandsPage.columnHeaders).toHaveText([
        'Id',
        'Name',
        'Slug',
        '',
      ]);
      await expect(adminBrandsPage.rows.first()).toBeVisible();
    },
  );

  test(
    'categories list loads',
    { tag: ['@admin', '@regression'] },
    async ({ adminCategoriesPage, loginAsAdmin }) => {
      await loginAsAdmin();

      await adminCategoriesPage.goto();

      await expect(adminCategoriesPage.pageTitle).toHaveText('Categories');
      await expect(adminCategoriesPage.columnHeaders).toHaveText([
        'Id',
        'Parent_id',
        'Name',
        'Slug',
        '',
      ]);
      await expect(adminCategoriesPage.rows.first()).toBeVisible();
    },
  );

  test(
    'products list loads',
    { tag: ['@admin', '@regression'] },
    async ({ adminProductsPage, loginAsAdmin }) => {
      await loginAsAdmin();

      await adminProductsPage.goto();

      await expect(adminProductsPage.pageTitle).toHaveText('Products');
      await expect(adminProductsPage.columnHeaders).toHaveText([
        'Id',
        'Name',
        'Stock',
        'Price',
        '',
      ]);
      await expect(adminProductsPage.rows.first()).toBeVisible();
    },
  );

  // The page title here is the singular "Order", though the document title and the menu
  // entry both say "Orders" — a real production inconsistency (§31).
  test(
    'orders list loads',
    { tag: ['@admin', '@regression'] },
    async ({ adminOrdersPage, loginAsAdmin }) => {
      await loginAsAdmin();

      await adminOrdersPage.goto();

      await expect(adminOrdersPage.pageTitle).toHaveText('Order');
      await expect(adminOrdersPage.columnHeaders).toHaveText([
        'Invoice Number',
        'Billing Address',
        'Invoice Date',
        'Status',
        'Total',
        '',
      ]);
      await expect(adminOrdersPage.rows.first()).toBeVisible();
    },
  );

  test(
    'users list loads',
    { tag: ['@admin', '@regression'] },
    async ({ adminUsersPage, loginAsAdmin }) => {
      await loginAsAdmin();

      await adminUsersPage.goto();

      await expect(adminUsersPage.pageTitle).toHaveText('Users');
      await expect(adminUsersPage.columnHeaders).toHaveText([
        'Id',
        'Name',
        'Email',
        '',
      ]);
      await expect(adminUsersPage.rows.first()).toBeVisible();
    },
  );

  // Unlike the other five lists, this one has no trailing blank actions column — the row
  // action is a "Details" link inside the Date column's row (§31).
  test(
    'messages list loads',
    { tag: ['@admin', '@regression'] },
    async ({ adminMessagesPage, loginAsAdmin }) => {
      await loginAsAdmin();

      await adminMessagesPage.goto();

      await expect(adminMessagesPage.pageTitle).toHaveText('Messages');
      await expect(adminMessagesPage.columnHeaders).toHaveText([
        'Name',
        'Subject',
        'Status',
        'Date',
      ]);
      await expect(adminMessagesPage.rows.first()).toBeVisible();
    },
  );

  // ⚠ Read-only: submitting this form would change app-wide configuration for every user
  // of the shared demo site (§3, §31). The test asserts the controls are there; it never
  // touches them.
  test(
    'settings page loads',
    { tag: ['@admin', '@regression'] },
    async ({ adminSettingsPage, loginAsAdmin }) => {
      await loginAsAdmin();

      await adminSettingsPage.goto();

      await expect(adminSettingsPage.pageTitle).toHaveText('Settings');
      await expect(adminSettingsPage.paymentEndpointInput).toBeVisible();
      await expect(adminSettingsPage.geolocationInput).toBeVisible();
      await expect(adminSettingsPage.co2ScaleToggle).toBeVisible();
      await expect(adminSettingsPage.ecoBadgeToggle).toBeVisible();
      await expect(adminSettingsPage.settingsSubmit).toBeVisible();
    },
  );

  // §5.20's "monthly/weekly/general statistics" is three separate pages, not one Reports
  // page with three sections (§31). This is the "general" one.
  test(
    'statistics report renders its four sections',
    { tag: ['@admin', '@regression'] },
    async ({ adminStatisticsPage, loginAsAdmin }) => {
      await loginAsAdmin();

      await adminStatisticsPage.goto();

      await expect(adminStatisticsPage.pageTitle).toHaveText('Statistics');
      await expect(
        adminStatisticsPage.topSellingCategoriesHeading,
      ).toBeVisible();
      await expect(
        adminStatisticsPage.mostPurchasedProductsHeading,
      ).toBeVisible();
      await expect(adminStatisticsPage.customersByCountryHeading).toBeVisible();
      await expect(
        adminStatisticsPage.totalSalesPerCountryHeading,
      ).toBeVisible();
      await expect(adminStatisticsPage.reportTables).toHaveCount(4);
    },
  );

  test(
    'average sales per month report renders a chart',
    { tag: ['@admin', '@regression'] },
    async ({ adminAverageSalesPerMonthPage, loginAsAdmin }) => {
      await loginAsAdmin();

      await adminAverageSalesPerMonthPage.goto();

      await expect(adminAverageSalesPerMonthPage.pageTitle).toHaveText(
        'Average sales per month',
      );
      await expect(adminAverageSalesPerMonthPage.yearSelect).toBeVisible();
      await expect(adminAverageSalesPerMonthPage.salesChart).toBeVisible();
    },
  );

  test(
    'average sales per week report renders a chart',
    { tag: ['@admin', '@regression'] },
    async ({ adminAverageSalesPerWeekPage, loginAsAdmin }) => {
      await loginAsAdmin();

      await adminAverageSalesPerWeekPage.goto();

      await expect(adminAverageSalesPerWeekPage.pageTitle).toHaveText(
        'Average sales per week',
      );
      await expect(adminAverageSalesPerWeekPage.yearSelect).toBeVisible();
      await expect(adminAverageSalesPerWeekPage.salesChart).toBeVisible();
    },
  );
});
