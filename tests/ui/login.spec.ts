import { expect, test } from '@src/merge.fixture';
import { testUser1 } from '@src/ui/test-data/user.data';

test.describe('Verify login @login', () => {
  test('login with correct credentials', async ({ accountPage, loginPage }) => {
    const email = testUser1.email;
    const password = testUser1.password;

    await loginPage.goto();
    await loginPage.login(email, password);

    await expect(accountPage.title).toHaveText('My account');
  });

  test('reject login with incorrect credentials', async ({ loginPage }) => {
    const email = 'wrong@email.com';
    const password = 'wrong-password';

    await loginPage.goto();
    await loginPage.login(email, password);

    await expect
      .soft(loginPage.loginError)
      .toHaveText('Invalid email or password');
  });
});
