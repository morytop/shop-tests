import { pageObjectTest } from './page-object.fixture';
import { adminUser } from '@src/ui/test-data/user.data';

export interface AdminActions {
  loginAsAdmin: () => Promise<void>;
}

// The arrange step every admin spec shares: sign in with the seeded admin account and
// wait until the dashboard it redirects to has actually rendered, so the test's own
// navigation can't race the post-login redirect. It spans LoginPage + AdminDashboardPage,
// so it belongs in an action fixture rather than on a single page object
// (CODING_STANDARDS.md → Fixtures).
//
// ⚠ The admin account is shared, seeded, READ-ONLY fixture data (test_plan.md §3): admin
// specs may look and assert, never create/edit/delete or submit. The credentials come
// from `.env` (ADMIN_EMAIL/ADMIN_PASSWORD) — a wrong password would permanently lock the
// account for everyone at the 3rd attempt (§20), so no admin spec drives a failed login.
export const adminActionTest = pageObjectTest.extend<AdminActions>({
  loginAsAdmin: async ({ adminDashboardPage, loginPage }, use) => {
    await use(async (): Promise<void> => {
      await loginPage.goto();
      await loginPage.login(adminUser.email, adminUser.password);
      await adminDashboardPage.pageTitle.waitFor();
    });
  },
});
