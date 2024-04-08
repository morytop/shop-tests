import { AccountPage } from '../src/pages/account-page';
import { LoginPage } from '../src/pages/login-page';
import { RegisterPage } from '../src/pages/register-page';
import { expect, test } from '@playwright/test';

test.describe('Verify register @register', () => {
  test('register with correct data and login', async ({ page }) => {
    const firstName = 'Joana';
    const lastName = 'Smith';
    const dateOfBirth = '1993-01-08';
    const address = 'Test';
    const postcode = '00-000';
    const city = 'Test';
    const state = 'test';
    const country = 'AZ';
    const phone = '000000000';
    const email = `joana${new Date().getTime()}@test1.pl`;
    const password = 'Tojestjoana1!';
    const registerPage = new RegisterPage(page);
    const loginPage = new LoginPage(page);
    const accountPage = new AccountPage(page);

    await registerPage.goto();
    await registerPage.register(
      firstName,
      lastName,
      dateOfBirth,
      address,
      postcode,
      city,
      state,
      country,
      phone,
      email,
      password,
    );
    await expect(loginPage.heading).toHaveText('Login');

    await loginPage.login(email, password);
    await expect(accountPage.title).toHaveText('My account');
  });
});
