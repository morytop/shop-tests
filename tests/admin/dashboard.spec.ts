import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import { expect, test } from '@src/merge.fixture';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

// User Stories v5 — Admin dashboard (test_plan.md §5.20), smoke level only. Covers the
// first bullet ("admin login lands on /admin/dashboard with sales chart + recent invoices
// list"), the menu that reaches every other section, and the non-admin negative path.
//
// Data safety (§3): the seeded admin is shared, READ-ONLY fixture data — these tests sign
// in, look and assert; they never create, edit, delete or submit. They also never send a
// wrong password: 3 failed attempts lock an account permanently (§20), and this one is
// shared with every user of the public demo site. The non-admin path uses a throwaway
// API-registered user rather than the seeded `customer@`, so no shared account is touched
// at all. See test_plan.md §31 and .ai-docs/admin-dashboard-smoke-plan.md.

test.describe('Verify admin dashboard', () => {
  // AC1 — admin credentials redirect straight to the dashboard, which renders the sales
  // chart (a bare <canvas>) under its "Sales over the years" title, plus the "Latest
  // orders" section.
  test(
    'admin login lands on the dashboard with the sales chart',
    { tag: ['@smoke', '@admin', '@auth'] },
    async ({ adminDashboardPage, loginAsAdmin, page }) => {
      await loginAsAdmin();

      await expect(page).toHaveURL(new RegExp(`${PAGE_URLS.ADMIN_DASHBOARD}$`));
      await expect(adminDashboardPage.pageTitle).toHaveText(
        'Sales over the years',
      );
      await expect(adminDashboardPage.salesChart).toBeVisible();
      await expect(adminDashboardPage.latestOrdersHeading).toBeVisible();
    },
  );

  // AC1 (second half) — the recent-invoices list loads. The dashboard renders "No recent
  // invoices." while `GET /invoices` is still in flight (§31), so the page object awaits
  // that response; the list then resolves to either the orders table or that same
  // message, depending on whether anyone's order is currently AWAITING_FULFILLMENT.
  // Which one is shared production data, so the assertion pins that it resolved, not how
  // many rows other people left behind (§3).
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

  // The admin sections are reachable only from the account-name dropdown — there is no
  // sidebar (§9, §31). This is the wiring the section specs bypass by navigating
  // directly, so it is asserted once here.
  test(
    'admin menu links to every admin section',
    { tag: ['@admin', '@regression'] },
    async ({ adminDashboardPage, loginAsAdmin }) => {
      await loginAsAdmin();

      await adminDashboardPage.bookmarks.openUserMenu();

      const navbar = adminDashboardPage.bookmarks;
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

  // The back office is admin-only: a logged-in customer asking for the dashboard by URL
  // is bounced to the login page (§9 said "redirected away"; the target is /auth/login —
  // §31). A throwaway user proves it for any non-admin without touching a shared account.
  test(
    'non-admin user is redirected away from the admin dashboard',
    { tag: ['@admin', '@auth', '@regression'] },
    async ({
      accountPage,
      adminDashboardPage,
      loginPage,
      page,
      usersRequest,
    }) => {
      const user = await registerUserWithApi(usersRequest);

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.title.waitFor();

      await adminDashboardPage.goto();

      await expect(page).toHaveURL(new RegExp(`${PAGE_URLS.LOGIN}$`));
      await expect(adminDashboardPage.salesChart).toHaveCount(0);
    },
  );
});
