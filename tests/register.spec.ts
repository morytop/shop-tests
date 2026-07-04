import { test } from '../src/fixtures/main';
import { faker } from '@faker-js/faker';
import { expect } from '@playwright/test';

test.describe('Verify register @register', () => {
  test('register with correct data and login', async ({
    registerPage,
    accountPage,
    loginPage,
  }) => {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const dateOfBirth = faker.date
      .birthdate({ min: 18, max: 65, mode: 'age' })
      .toLocaleDateString('en-CA');
    const street = faker.location.street();
    const postcode = faker.location.zipCode();
    const houseNumber = faker.location.buildingNumber();
    const city = faker.location.city();
    const state = faker.location.state();
    const country = faker.location.country();
    const phone = faker.string.numeric(8);
    const email = faker.internet.email();
    const password = faker.internet.password({
      length: 20,
      pattern: /^[a-z ,.'-]+$/i,
      prefix: '1!',
    });

    await registerPage.goto();
    await registerPage.register(
      firstName,
      lastName,
      dateOfBirth,
      country,
      street,
      postcode,
      houseNumber,
      city,
      state,
      phone,
      email,
      password,
    );
    await expect(loginPage.heading).toHaveText('Login');

    await loginPage.login(email, password);
    await expect(accountPage.title).toHaveText('My account');
  });
});
