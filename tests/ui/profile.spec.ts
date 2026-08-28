import { expect, test } from '@src/fixtures/merge.fixture';
import { prepareRandomProfileDetails } from '@src/ui/factories/user.factory';
import {
  ProfileDetails,
  RequiredProfileField,
} from '@src/ui/models/user.model';
import {
  PROFILE_EDITABLE_FIELDS,
  PROFILE_REQUIRED_FIELDS,
  PROFILE_VALIDATION_ERROR,
} from '@src/ui/test-data/user.data';

test.describe('Verify customer profile', () => {
  test(
    'show the current account data for a freshly-registered user',
    { tag: ['@auth', '@profile', '@regression'] },
    async ({ loginAsFreshUser, profilePage }) => {
      const user = await loginAsFreshUser();
      const registeredValues: ProfileDetails = {
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        street: user.address.street,
        postalCode: user.address.postal_code,
        city: user.address.city,
        state: user.address.state,
        country: user.address.country,
      };

      await profilePage.goto();
      await profilePage.waitForProfileLoaded();

      await expect(profilePage.pageTitle).toHaveText('Profile');
      // Email is not in profileFields (readonly, not editable) — asserted apart.
      await expect(profilePage.emailInput).toHaveValue(user.email);
      for (const field of PROFILE_EDITABLE_FIELDS) {
        await expect(profilePage.profileFields[field]).toHaveValue(
          registeredValues[field],
        );
      }
    },
  );

  test(
    'update every editable field and persist the changes after save',
    { tag: ['@auth', '@profile', '@regression'] },
    async ({ loginAsFreshUser, profilePage }) => {
      await loginAsFreshUser();
      const updatedDetails = prepareRandomProfileDetails();

      await profilePage.goto();
      await profilePage.waitForProfileLoaded();

      await profilePage.updateProfile(updatedDetails);

      await expect(profilePage.profileSuccess).toHaveText(
        'Your profile is successfully updated!',
      );
      await expect(profilePage.profileError).toHaveCount(0);
      // The banner auto-dismisses after ~5s but offers no user dismiss affordance
      // (verified live: a plain div.alert, no close button), so its disappearance
      // is app-internal timer mechanics and deliberately not asserted.

      await profilePage.goto();
      await profilePage.waitForProfileLoaded();

      for (const field of PROFILE_EDITABLE_FIELDS) {
        await expect(profilePage.profileFields[field]).toHaveValue(
          updatedDetails[field],
        );
      }
    },
  );

  test(
    'show the email address as a non-editable field',
    { tag: ['@auth', '@profile', '@regression'] },
    async ({ loginAsFreshUser, profilePage }) => {
      const user = await loginAsFreshUser();

      await profilePage.goto();
      await profilePage.waitForProfileLoaded();

      await expect(profilePage.emailInput).toBeVisible();
      await expect(profilePage.emailInput).toHaveValue(user.email);
      await expect(profilePage.emailInput).not.toBeEditable();
      await expect(profilePage.emailInput).toBeEnabled();
    },
  );

  for (const field of PROFILE_REQUIRED_FIELDS) {
    test(
      `reject saving the profile with a blank ${field}`,
      { tag: ['@auth', '@profile', '@regression'] },
      async ({ loginAs, profilePage, workerUser }) => {
        await loginAs(workerUser);
        const originalValues: Record<RequiredProfileField, string> = {
          firstName: workerUser.first_name,
          lastName: workerUser.last_name,
          street: workerUser.address.street,
          city: workerUser.address.city,
          country: workerUser.address.country,
        };

        await profilePage.goto();
        await profilePage.waitForProfileLoaded();

        await profilePage.profileFields[field].clear();
        await profilePage.submitProfile();

        await expect(profilePage.profileError).toContainText(
          PROFILE_VALIDATION_ERROR,
        );
        await expect(profilePage.profileSuccess).toHaveCount(0);
        await expect(profilePage.profileFields[field]).toHaveClass(
          /ng-invalid/,
        );

        await profilePage.goto();
        await profilePage.waitForProfileLoaded();

        // Nothing was saved: the field still holds its registered value.
        await expect(profilePage.profileFields[field]).toHaveValue(
          originalValues[field],
        );
      },
    );
  }
});
