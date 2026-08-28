import { expect, test } from '@src/fixtures/merge.fixture';

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
