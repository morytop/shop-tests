import { test } from '../src/fixtures/main';
import {
  ADDRESS_MAX_LENGTHS,
  AddressTextField,
} from '../src/pages/checkout-address.page';
import { faker } from '@faker-js/faker';
import { expect } from '@playwright/test';

// User Stories v5 — Checkout Billing Address (test_plan.md §5.7). The billing step
// is reached by advancing past the sign-in step: as a guest via the "Continue as
// Guest" tab + details form, or (AC5) as an already-logged-in user via proceed-2.
// The form is an Angular reactive form with no native maxlength and no visible
// error text — an empty/over-long field only turns ng-invalid and keeps the
// "Proceed to checkout" button (proceed-3) disabled (§16). Country is a <select>
// with a "House number" sibling, not the free-text field the docs imply (§9), so
// the max-length boundary excludes Country. AC5's documented "address is pre-filled
// from account data" is FALSE in production — the fields render empty for a
// logged-in user (§9/§16); that test pins the actual behavior. Products are chosen
// dynamically by card index (§3, §9); see .ai-docs/checkout-address-plan.md.

const validAddress = {
  country: 'Germany',
  postalCode: '12345',
  houseNumber: '42',
  street: 'Main Street',
  city: 'Berlin',
  state: 'Bavaria',
};

test.describe('Verify checkout billing address step', () => {
  test(
    'billing step shows all required address fields',
    { tag: ['@checkout', '@regression'] },
    async ({
      homePage,
      productDetailPage,
      cartPage,
      checkoutSigninPage,
      checkoutAddressPage,
    }) => {
      await homePage.goto();
      await homePage.clickProductCard(0);
      await productDetailPage.addToCartAndAwaitBadge('1');
      await cartPage.goto();
      await cartPage.proceedToCheckout();

      await checkoutSigninPage.continueAsGuest(
        faker.internet.email(),
        faker.person.firstName(),
        faker.person.lastName(),
      );

      await expect(checkoutAddressPage.heading).toBeVisible();
      await expect(checkoutAddressPage.countrySelect).toBeVisible();
      await expect(checkoutAddressPage.postalCodeInput).toBeVisible();
      await expect(checkoutAddressPage.houseNumberInput).toBeVisible();
      await expect(checkoutAddressPage.streetInput).toBeVisible();
      await expect(checkoutAddressPage.cityInput).toBeVisible();
      await expect(checkoutAddressPage.stateInput).toBeVisible();
      // Country is a dropdown defaulting to the empty "Your country *" option (§9).
      await expect(checkoutAddressPage.countrySelect).toHaveValue('');
      // Every field is required, so proceed starts disabled on the empty form.
      await expect(checkoutAddressPage.proceedButton).toBeDisabled();
    },
  );

  test(
    'clearing a required field disables proceeding to payment',
    { tag: ['@checkout', '@regression'] },
    async ({
      homePage,
      productDetailPage,
      cartPage,
      checkoutSigninPage,
      checkoutAddressPage,
    }) => {
      await homePage.goto();
      await homePage.clickProductCard(0);
      await productDetailPage.addToCartAndAwaitBadge('1');
      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await checkoutSigninPage.continueAsGuest(
        faker.internet.email(),
        faker.person.firstName(),
        faker.person.lastName(),
      );
      await checkoutAddressPage.fillAddress(validAddress);
      await expect(checkoutAddressPage.proceedButton).toBeEnabled();

      await checkoutAddressPage.streetInput.clear();

      await expect(checkoutAddressPage.streetInput).toHaveClass(/ng-invalid/);
      await expect(checkoutAddressPage.proceedButton).toBeDisabled();
    },
  );

  // AC3 — one boundary test per length-limited text field (Country excluded, §9).
  // House number is undocumented (§9) but is a real required field, so its verified
  // max is covered here too.
  for (const field of Object.keys(ADDRESS_MAX_LENGTHS) as AddressTextField[]) {
    const max = ADDRESS_MAX_LENGTHS[field];

    test(
      `${field} rejects input longer than ${max} characters`,
      { tag: ['@checkout', '@regression'] },
      async ({
        homePage,
        productDetailPage,
        cartPage,
        checkoutSigninPage,
        checkoutAddressPage,
      }) => {
        await homePage.goto();
        await homePage.clickProductCard(0);
        await productDetailPage.addToCartAndAwaitBadge('1');
        await cartPage.goto();
        await cartPage.proceedToCheckout();
        await checkoutSigninPage.continueAsGuest(
          faker.internet.email(),
          faker.person.firstName(),
          faker.person.lastName(),
        );
        await checkoutAddressPage.fillAddress(validAddress);
        await expect(checkoutAddressPage.proceedButton).toBeEnabled();

        await checkoutAddressPage.textFields[field].fill('a'.repeat(max + 1));

        await expect(checkoutAddressPage.textFields[field]).toHaveClass(
          /ng-invalid/,
        );
        await expect(checkoutAddressPage.proceedButton).toBeDisabled();
      },
    );
  }

  test(
    'filling all fields validly enables proceeding to payment',
    { tag: ['@checkout', '@regression'] },
    async ({
      homePage,
      productDetailPage,
      cartPage,
      checkoutSigninPage,
      checkoutAddressPage,
    }) => {
      await homePage.goto();
      await homePage.clickProductCard(0);
      await productDetailPage.addToCartAndAwaitBadge('1');
      await cartPage.goto();
      await cartPage.proceedToCheckout();
      await checkoutSigninPage.continueAsGuest(
        faker.internet.email(),
        faker.person.firstName(),
        faker.person.lastName(),
      );
      await expect(checkoutAddressPage.proceedButton).toBeDisabled();

      await checkoutAddressPage.fillAddress(validAddress);

      await expect(checkoutAddressPage.proceedButton).toBeEnabled();
    },
  );

  // AC5 — the docs say a logged-in user's billing address is pre-filled from
  // account data; production does NOT do this (§9/§16). This pins the actual
  // behavior: login is recognized (the sign-in step shows the "already logged in"
  // panel, proceed-2 skips the login form) yet the billing fields render empty.
  test(
    'logged-in user reaches billing with empty (not pre-filled) fields',
    { tag: ['@checkout', '@regression'] },
    async ({
      registerPage,
      loginPage,
      accountPage,
      homePage,
      productDetailPage,
      cartPage,
      checkoutSigninPage,
      checkoutAddressPage,
    }) => {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const email = faker.internet.email();
      const password = faker.internet.password({
        length: 20,
        pattern: /^[a-z ,.'-]+$/i,
        prefix: '1!',
      });
      const dateOfBirth = faker.date
        .birthdate({ min: 18, max: 65, mode: 'age' })
        .toLocaleDateString('en-CA');

      await registerPage.goto();
      await registerPage.register(
        firstName,
        lastName,
        dateOfBirth,
        'Germany',
        faker.location.street(),
        '12345',
        '42',
        faker.location.city(),
        faker.location.state(),
        faker.string.numeric(8),
        email,
        password,
      );
      await expect(loginPage.heading).toHaveText('Login');
      await loginPage.login(email, password);
      // Wait for the session to be established before navigating on — otherwise the
      // checkout can reach the sign-in step before auth lands and not recognize login.
      await expect(accountPage.title).toHaveText('My account');

      await homePage.goto();
      await homePage.clickProductCard(0);
      await productDetailPage.addToCartAndAwaitBadge('1');
      await cartPage.goto();
      await cartPage.proceedToCheckout();

      await expect(checkoutSigninPage.alreadyLoggedInMessage).toBeVisible();
      await checkoutSigninPage.proceedAsLoggedInUser();

      await expect(checkoutAddressPage.heading).toBeVisible();
      await expect(checkoutAddressPage.countrySelect).toHaveValue('');
      await expect(checkoutAddressPage.postalCodeInput).toBeEmpty();
      await expect(checkoutAddressPage.houseNumberInput).toBeEmpty();
      await expect(checkoutAddressPage.streetInput).toBeEmpty();
      await expect(checkoutAddressPage.cityInput).toBeEmpty();
      await expect(checkoutAddressPage.stateInput).toBeEmpty();
    },
  );
});
