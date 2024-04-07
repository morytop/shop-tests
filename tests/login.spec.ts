import { AccountPage } from '../src/pages/account-page';
import { LoginPage } from '../src/pages/login-page';
import { expect, test } from '@playwright/test';

test.describe('Verify login', () => {
  test('login with correct credentials @login', async ({ page }) => {
    const email = 'customer@practicesoftwaretesting.com';
    const password = 'welcome01';
    const loginPage = new LoginPage(page);
    const accountPage = new AccountPage(page);

    await loginPage.goto();
    await loginPage.login(email, password);

    await expect(accountPage.title).toHaveText('My account');
  });
});
