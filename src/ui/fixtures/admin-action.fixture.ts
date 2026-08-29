import { pageObjectTest } from './page-object.fixture';
import { adminUser } from '@src/ui/test-data/user.data';

export interface AdminActions {
  loginAsAdmin: () => Promise<void>;
}

export const adminActionTest = pageObjectTest.extend<AdminActions>({
  loginAsAdmin: async ({ adminDashboardPage, loginPage }, use) => {
    await use(async (): Promise<void> => {
      await loginPage.goto();
      await loginPage.login(adminUser.email, adminUser.password);
      await adminDashboardPage.pageTitle.waitFor();
    });
  },
});
