import { expect, test } from '@src/merge.fixture';
import { prepareRandomUser } from '@src/ui/factories/user.factory';

test.describe('Verify register @register', () => {
  test('register with correct data and login', async ({
    registerPage,
    accountPage,
    loginPage,
  }) => {
    const user = prepareRandomUser();

    await registerPage.goto();
    await registerPage.register(user);
    await expect(loginPage.heading).toHaveText('Login');

    await loginPage.login(user.email, user.password);
    await expect(accountPage.title).toHaveText('My account');
  });
});
