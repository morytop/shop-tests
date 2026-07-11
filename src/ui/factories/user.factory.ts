import { faker } from '@faker-js/faker';
import { Page } from '@playwright/test';
import { ProfileDetails, RegisterUser } from '@src/ui/models/user.model';
import { RegisterPage } from '@src/ui/pages/register.page';

/**
 * A random password that always satisfies the app's policy. Constrained to
 * letters/spaces/punctuation plus a "1!" prefix so it carries an uppercase letter, a
 * lowercase letter, a digit and a symbol.
 */
export function prepareRandomPassword(): string {
  return faker.internet.password({
    length: 20,
    pattern: /^[a-z ,.'-]+$/i,
    prefix: '1!',
  });
}

/**
 * Build a random-but-valid registration record. Country/postcode/houseNumber use a
 * known-good pair (Germany / 12345 / 42) rather than faker: the country <select>
 * and the billing postcode lookup both need real, matchable values, so a random
 * faker country/zip could pick an option that doesn't exist. Everything else is
 * faker-random so each run registers a distinct account.
 */
export function prepareRandomUser(): RegisterUser {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    // en-CA renders YYYY-MM-DD, the format the date-of-birth input expects.
    dateOfBirth: faker.date
      .birthdate({ min: 18, max: 65, mode: 'age' })
      .toLocaleDateString('en-CA'),
    country: 'Germany',
    street: faker.location.street(),
    postcode: '12345',
    houseNumber: '42',
    city: faker.location.city(),
    state: faker.location.state(),
    phone: faker.string.numeric(8),
    email: faker.internet.email(),
    password: prepareRandomPassword(),
  };
}

/**
 * Build a fresh set of values for the profile form. Unlike registration, the profile
 * country/postcode are plain text inputs with no `<select>` option list and no
 * postcode lookup behind them (TEST_PLAN.md §23), so both can be faker-random.
 */
export function prepareRandomProfileDetails(): ProfileDetails {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: faker.string.numeric(8),
    street: faker.location.street(),
    postalCode: faker.location.zipCode('#####'),
    city: faker.location.city(),
    state: faker.location.state(),
    country: faker.location.country(),
  };
}

/**
 * Generates a user, drives the register form, and returns the data used — so a
 * caller can register a fresh account in one call and keep its credentials.
 */
export class UserFactory {
  async randomUser(page: Page): Promise<RegisterUser> {
    const user = prepareRandomUser();
    const registerPage = new RegisterPage(page);

    await registerPage.goto();
    await registerPage.register(user);

    return user;
  }
}
