import { AccountPage } from '../src/pages/account-page';
import { LoginPage } from '../src/pages/login-page';
import { RegisterPage } from '../src/pages/register-page';
import { faker } from '@faker-js/faker';
import { expect, test } from '@playwright/test';

test.describe('Verify register @register', () => {
  test('register with correct data and login', async ({ page }) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const dateOfBirth = faker.date
      .birthdate({ min: 18, max: 65, mode: 'age' })
      .toLocaleDateString('en-CA');
    const address = faker.location.street();
    const postcode = faker.location.zipCode();
    const city = faker.location.city();
    const state = faker.location.state();
    const country = faker.location.countryCode();
    const phone = faker.string.numeric(8);
    const email = faker.internet.email();
    const password = faker.internet.password({
      length: 20,
      pattern: /^[a-z ,.'-]+$/i,
      prefix: '1!',
    });
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
