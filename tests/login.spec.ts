import { AccountPage } from '../src/pages/account-page';
import { LoginPage } from '../src/pages/login-page';
import { testUser1 } from '../src/test-data/user-data';
import { expect, test } from '@playwright/test';

test.describe('Verify login @login', () => {
  test('login with correct credentials', async ({ page }) => {
    const email = testUser1.email;
    const password = testUser1.password;
    const loginPage = new LoginPage(page);
    const accountPage = new AccountPage(page);

    await loginPage.goto();
    await loginPage.login(email, password);

    await expect(accountPage.title).toHaveText('My account');
  });

  test('reject login with incorrect credentials', async ({ page }) => {
    const email = 'wrong@email.com';
    const password = 'wrong-password';
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.login(email, password);

    await expect
      .soft(loginPage.loginError)
      .toHaveText('Invalid email or password');
  });
});
