import { expect, test } from '@src/fixtures/merge.fixture';
import { PAGE_URLS } from '@src/ui/utils/page-urls.util';

test.describe('Verify admin dashboard', () => {
  test(
    'admin login lands on the dashboard with the sales chart',
    { tag: ['@smoke', '@admin', '@auth'] },
    async ({ adminDashboardPage, loginAsAdmin, page }) => {
      await loginAsAdmin();

      await expect(page).toHaveURL(PAGE_URLS.ADMIN_DASHBOARD);
      await expect(adminDashboardPage.pageTitle).toHaveText(
        'Sales over the years',
      );
      await expect(adminDashboardPage.salesChart).toBeVisible();
      await expect(adminDashboardPage.latestOrdersHeading).toBeVisible();
    },
  );

  test(
    'dashboard loads the recent invoices list',
    { tag: ['@admin', '@regression'] },
    async ({ adminDashboardPage, loginAsAdmin }) => {
      await loginAsAdmin();

      await adminDashboardPage.gotoAndAwaitLoaded();

      await expect(adminDashboardPage.latestOrdersHeading).toBeVisible();
      await expect(adminDashboardPage.latestOrdersResult).toBeVisible();
    },
  );

  test(
    'admin menu links to every admin section',
    { tag: ['@admin', '@regression'] },
    async ({ loginAsAdmin, navbar }) => {
      await loginAsAdmin();

      await navbar.openUserMenu();

      await expect(navbar.adminDashboardNavLink).toHaveAttribute(
        'href',
        PAGE_URLS.ADMIN_DASHBOARD,
      );
      await expect(navbar.adminBrandsNavLink).toHaveAttribute(
        'href',
        PAGE_URLS.ADMIN_BRANDS,
      );
      await expect(navbar.adminCategoriesNavLink).toHaveAttribute(
        'href',
        PAGE_URLS.ADMIN_CATEGORIES,
      );
      await expect(navbar.adminProductsNavLink).toHaveAttribute(
        'href',
        PAGE_URLS.ADMIN_PRODUCTS,
      );
      await expect(navbar.adminOrdersNavLink).toHaveAttribute(
        'href',
        PAGE_URLS.ADMIN_ORDERS,
      );
      await expect(navbar.adminUsersNavLink).toHaveAttribute(
        'href',
        PAGE_URLS.ADMIN_USERS,
      );
      await expect(navbar.adminMessagesNavLink).toHaveAttribute(
        'href',
        PAGE_URLS.ADMIN_MESSAGES,
      );
      await expect(navbar.adminSettingsNavLink).toHaveAttribute(
        'href',
        PAGE_URLS.ADMIN_SETTINGS,
      );
      await expect(navbar.adminStatisticsNavLink).toHaveAttribute(
        'href',
        PAGE_URLS.ADMIN_STATISTICS,
      );
      await expect(navbar.averageMonthSalesNavLink).toHaveAttribute(
        'href',
        PAGE_URLS.ADMIN_AVERAGE_SALES_PER_MONTH,
      );
      await expect(navbar.averageWeekSalesNavLink).toHaveAttribute(
        'href',
        PAGE_URLS.ADMIN_AVERAGE_SALES_PER_WEEK,
      );
      await expect(navbar.signOutNavLink).toBeVisible();
    },
  );

  test(
    'non-admin user is redirected away from the admin dashboard',
    { tag: ['@admin', '@auth', '@regression'] },
    async ({ adminDashboardPage, loginAsFreshUser, page }) => {
      await loginAsFreshUser();

      await adminDashboardPage.goto();

      await expect(page).toHaveURL(PAGE_URLS.LOGIN);
      await expect(adminDashboardPage.salesChart).toHaveCount(0);
    },
  );
});
