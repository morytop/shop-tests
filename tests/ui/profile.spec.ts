import { expect, test } from '@src/fixtures/merge.fixture';
import { prepareRandomProfileDetails } from '@src/ui/factories/user.factory';
import { RequiredProfileField } from '@src/ui/models/user.model';
import {
  PROFILE_REQUIRED_FIELDS,
  PROFILE_VALIDATION_ERROR,
} from '@src/ui/test-data/user.data';

// User Stories v5 — Customer profile (TEST_PLAN.md §5.14). The form on
// `/account/profile` is populated by an async `GET /users/me`, so every test gates on
// `waitForProfileLoaded()` before reading or filling a field — a `fill()` issued
// earlier is silently overwritten when the response lands (§24).
//
// Data safety (§3): every test signs in via the user-action fixture, never as
// `testUser1` (it IS the shared seeded `customer@` account) and never on the `@logged`
// storageState session — `tests/setup/login.setup.ts` shares one user across every
// `@logged` spec, and `checkout-address.spec.ts` asserts on that user's stored
// address. AC2 mutates the account and AC1/AC3 assert on a *freshly-registered*
// account's own data, so those mint their own fresh user; the AC4 blank-field loop is
// blocked client-side and saves nothing, so its five tests share the per-worker
// `workerUser`.
//
// See TEST_PLAN.md §24 and .ai-docs/profile-plan.md.

test.describe('Verify customer profile', () => {
  // AC1 — the form reflects the account's own data, straight from registration.
  test(
    'show the current account data for a freshly-registered user',
    { tag: ['@auth', '@profile', '@regression'] },
    async ({ loginAsFreshUser, profilePage }) => {
      const user = await loginAsFreshUser();

      await profilePage.goto();
      await profilePage.waitForProfileLoaded();

      await expect(profilePage.pageTitle).toHaveText('Profile');
      await expect(profilePage.firstNameInput).toHaveValue(user.first_name);
      await expect(profilePage.lastNameInput).toHaveValue(user.last_name);
      await expect(profilePage.emailInput).toHaveValue(user.email);
      await expect(profilePage.phoneInput).toHaveValue(user.phone);
      await expect(profilePage.streetInput).toHaveValue(user.address.street);
      await expect(profilePage.postalCodeInput).toHaveValue(
        user.address.postal_code,
      );
      await expect(profilePage.cityInput).toHaveValue(user.address.city);
      await expect(profilePage.stateInput).toHaveValue(user.address.state);
      await expect(profilePage.countryInput).toHaveValue(user.address.country);
    },
  );

  // AC2 — every editable field round-trips through `PUT /users/{id}` and survives a
  // reload. The success banner is an inline alert inside the form (not a toast) and is
  // removed from the DOM after ~5s (measured 5.4s live, §24).
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
      // The banner is detached rather than hidden, so count — not visibility — is the
      // observable end state of the fade.
      await expect(profilePage.profileSuccess).toHaveCount(0, {
        timeout: 8000,
      });

      await profilePage.goto();
      await profilePage.waitForProfileLoaded();

      await expect(profilePage.firstNameInput).toHaveValue(
        updatedDetails.firstName,
      );
      await expect(profilePage.lastNameInput).toHaveValue(
        updatedDetails.lastName,
      );
      await expect(profilePage.phoneInput).toHaveValue(updatedDetails.phone);
      await expect(profilePage.streetInput).toHaveValue(updatedDetails.street);
      await expect(profilePage.postalCodeInput).toHaveValue(
        updatedDetails.postalCode,
      );
      await expect(profilePage.cityInput).toHaveValue(updatedDetails.city);
      await expect(profilePage.stateInput).toHaveValue(updatedDetails.state);
      await expect(profilePage.countryInput).toHaveValue(
        updatedDetails.country,
      );
    },
  );

  // AC3 — the email is shown but locked. It carries `readonly` (it stays focusable and
  // its value posts), not `disabled` — assert the behavior, not just the attribute.
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

  // AC4 — one test per required field. The submit button stays enabled, but the save is
  // now blocked with a single generic banner ("Please correct the highlighted fields
  // before saving.") rather than the per-field API 422 copy it used to show (§24) — so
  // the blanked field is identified by its `ng-invalid` highlighting, not the banner
  // text. Only these five fields are required — phone, postal code and state save fine
  // when blank (§24). Nothing is ever saved, so all five tests share the worker user;
  // the final assertion depends on exactly that: the account still holds its
  // registered values.
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
