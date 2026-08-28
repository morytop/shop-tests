import { faker } from '@faker-js/faker';
import { expect, test } from '@src/fixtures/merge.fixture';
import { makeValidAddress } from '@src/ui/factories/address.factory';
import { AddressTextField } from '@src/ui/models/address.model';
import { ADDRESS_MAX_LENGTHS } from '@src/ui/test-data/address.data';

const validAddress = makeValidAddress();

test.describe('Verify checkout billing address step', () => {
  test(
    'billing step shows all required address fields',
    { tag: ['@checkout', '@regression'] },
    async ({
      addProductToCart,
      cartPage,
      checkoutSigninPage,
      checkoutAddressPage,
    }) => {
      await addProductToCart();
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
      addProductToCart,
      cartPage,
      checkoutSigninPage,
      checkoutAddressPage,
    }) => {
      await addProductToCart();
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

  // postalCode/houseNumber feed the async postcode-lookup call (fillAddress's
  // waitForApi), so an over-long value there surfaces the backend's 422 message
  // in postcode-lookup-error. street/city/state aren't part of that call and have
  // no error-text template at all — ng-invalid is the only observable signal.
  const LOOKUP_ERROR_LABELS: Record<'postalCode' | 'houseNumber', string> = {
    postalCode: 'postcode',
    houseNumber: 'house number',
  };
  const lookupErrorFields = Object.keys(LOOKUP_ERROR_LABELS) as Array<
    keyof typeof LOOKUP_ERROR_LABELS
  >;
  const ngInvalidOnlyFields = (
    Object.keys(ADDRESS_MAX_LENGTHS) as AddressTextField[]
  ).filter((field) => !(field in LOOKUP_ERROR_LABELS));

  for (const field of lookupErrorFields) {
    const max = ADDRESS_MAX_LENGTHS[field];

    test(
      `${field} rejects input longer than ${max} characters`,
      { tag: ['@checkout', '@regression'] },
      async ({
        addProductToCart,
        cartPage,
        checkoutSigninPage,
        checkoutAddressPage,
      }) => {
        await addProductToCart();
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

        await expect(checkoutAddressPage.postcodeLookupError).toHaveText(
          `The ${LOOKUP_ERROR_LABELS[field]} field must not be greater than ${max} characters.`,
        );
        await expect(checkoutAddressPage.proceedButton).toBeDisabled();
      },
    );
  }

  for (const field of ngInvalidOnlyFields) {
    const max = ADDRESS_MAX_LENGTHS[field];

    test(
      `${field} rejects input longer than ${max} characters`,
      { tag: ['@checkout', '@regression'] },
      async ({
        addProductToCart,
        cartPage,
        checkoutSigninPage,
        checkoutAddressPage,
      }) => {
        await addProductToCart();
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
      addProductToCart,
      cartPage,
      checkoutSigninPage,
      checkoutAddressPage,
    }) => {
      await addProductToCart();
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

  test(
    'logged-in user reaches billing with address pre-filled from account',
    { tag: ['@checkout', '@regression', '@logged'] },
    async ({
      addProductToCart,
      cartPage,
      checkoutSigninPage,
      checkoutAddressPage,
    }) => {
      await addProductToCart();
      await cartPage.goto();
      await cartPage.proceedToCheckout();

      await expect(checkoutSigninPage.alreadyLoggedInMessage).toBeVisible();
      await checkoutSigninPage.proceedAsLoggedInUser();

      await expect(checkoutAddressPage.heading).toBeVisible();
      await expect(checkoutAddressPage.postalCodeInput).not.toHaveValue('');
      await expect(checkoutAddressPage.houseNumberInput).not.toHaveValue('');
      await expect(checkoutAddressPage.streetInput).not.toHaveValue('');
      await expect(checkoutAddressPage.cityInput).not.toHaveValue('');
      await expect(checkoutAddressPage.stateInput).not.toHaveValue('');
      await expect(checkoutAddressPage.countrySelect).toHaveValue('');
    },
  );
});
