import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import { expect, test } from '@src/merge.fixture';
import { prepareRandomPassword } from '@src/ui/factories/user.factory';
import {
  CHANGE_PASSWORD_ERRORS,
  PASSWORD_STRENGTH_LEVELS,
} from '@src/ui/test-data/user.data';

// User Stories v5 — Change password (test_plan.md §5.15). The form is the middle of the
// three on `/account/profile`, so every test gates on `waitForProfileLoaded()` after
// navigating (§24) and reads its banners from the password form, not page-wide.
//
// Data safety (§3): every AC here submits a form that changes the account password, so
// each test registers its own throwaway user via the API and logs in inline. None may
// use `testUser1` (it IS the shared seeded `customer@` account) or ride the `@logged`
// storageState session — `tests/setup/login.setup.ts` shares one user across every
// `@logged` spec.
//
// Two of §5.15's ACs describe production inaccurately; both are pinned below and
// recorded in test_plan.md §25.
//
// See test_plan.md §25 and .ai-docs/change-password-plan.md.

test.describe('Verify change password', () => {
  // AC1 — the form offers exactly the three password fields, all empty and masked.
  test(
    'show empty current, new and confirm password fields',
    { tag: ['@auth', '@profile', '@regression'] },
    async ({ accountPage, loginPage, profilePage, usersRequest }) => {
      const user = await registerUserWithApi(usersRequest);

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.title.waitFor();
      await profilePage.goto();
      await profilePage.waitForProfileLoaded();

      await expect(profilePage.currentPasswordInput).toBeVisible();
      await expect(profilePage.newPasswordInput).toBeVisible();
      await expect(profilePage.confirmPasswordInput).toBeVisible();

      await expect(profilePage.currentPasswordInput).toHaveValue('');
      await expect(profilePage.newPasswordInput).toHaveValue('');
      await expect(profilePage.confirmPasswordInput).toHaveValue('');

      await expect(profilePage.currentPasswordInput).toHaveAttribute(
        'type',
        'password',
      );
      await expect(profilePage.newPasswordInput).toHaveAttribute(
        'type',
        'password',
      );
      await expect(profilePage.confirmPasswordInput).toHaveAttribute(
        'type',
        'password',
      );
    },
  );

  // AC2 — §5.15 says the meter "mirrors registration behavior", but registration's is
  // broken (§19) while this one works: each added criterion advances the bar one fifth
  // and lights the next label. One test walks the whole scale rather than five tests
  // registering five users to type into one field.
  test(
    'advance the strength meter one step per password criterion met',
    { tag: ['@auth', '@profile', '@regression'] },
    async ({ accountPage, loginPage, profilePage, usersRequest }) => {
      const user = await registerUserWithApi(usersRequest);

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.title.waitFor();
      await profilePage.goto();
      await profilePage.waitForProfileLoaded();

      for (const level of PASSWORD_STRENGTH_LEVELS) {
        await profilePage.enterNewPassword(level.password);

        await expect(profilePage.strengthFill).toHaveAttribute(
          'style',
          new RegExp(`width:\\s*${level.width};`),
        );
        await expect(profilePage.activeStrengthLabel).toHaveText(level.label);
      }
    },
  );

  // AC3 — the documented copy is "Passwords do not match."; production actually returns
  // the API's 422 message below. The submit button never disables, so the request fires.
  test(
    'reject a new password that does not match its confirmation',
    { tag: ['@auth', '@profile', '@regression'] },
    async ({ accountPage, loginPage, profilePage, usersRequest }) => {
      const user = await registerUserWithApi(usersRequest);

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.title.waitFor();
      await profilePage.goto();
      await profilePage.waitForProfileLoaded();

      await profilePage.changePassword(
        user.password,
        prepareRandomPassword(),
        prepareRandomPassword(),
      );

      await expect(profilePage.passwordError).toHaveText(
        CHANGE_PASSWORD_ERRORS.confirmationMismatch,
      );
      await expect(profilePage.passwordSuccess).toHaveCount(0);
    },
  );

  // AC4 — a wrong current password is rejected server-side (400).
  test(
    'reject a change submitted with the wrong current password',
    { tag: ['@auth', '@profile', '@regression'] },
    async ({ accountPage, loginPage, profilePage, usersRequest }) => {
      const user = await registerUserWithApi(usersRequest);
      const newPassword = prepareRandomPassword();

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.title.waitFor();
      await profilePage.goto();
      await profilePage.waitForProfileLoaded();

      await profilePage.changePassword(
        prepareRandomPassword(),
        newPassword,
        newPassword,
      );

      await expect(profilePage.passwordError).toHaveText(
        CHANGE_PASSWORD_ERRORS.wrongCurrentPassword,
      );
      await expect(profilePage.passwordSuccess).toHaveCount(0);
    },
  );

  // AC5 — reusing the current password is rejected server-side (400).
  test(
    'reject a new password identical to the current one',
    { tag: ['@auth', '@profile', '@regression'] },
    async ({ accountPage, loginPage, profilePage, usersRequest }) => {
      const user = await registerUserWithApi(usersRequest);

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.title.waitFor();
      await profilePage.goto();
      await profilePage.waitForProfileLoaded();

      await profilePage.changePassword(
        user.password,
        user.password,
        user.password,
      );

      await expect(profilePage.passwordError).toHaveText(
        CHANGE_PASSWORD_ERRORS.sameAsCurrentPassword,
      );
      await expect(profilePage.passwordSuccess).toHaveCount(0);
    },
  );

  // AC6 — a valid change confirms, then logs the user out after ~5s (measured up to
  // ~9s live, hence the headroom). The logout is real, not cosmetic: the session is
  // cleared and only the new password authenticates afterwards.
  test(
    'change the password, then log the user out automatically',
    { tag: ['@auth', '@profile', '@regression'] },
    async ({ accountPage, loginPage, page, profilePage, usersRequest }) => {
      const user = await registerUserWithApi(usersRequest);
      const newPassword = prepareRandomPassword();

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.title.waitFor();
      await profilePage.goto();
      await profilePage.waitForProfileLoaded();

      await profilePage.changePassword(user.password, newPassword, newPassword);

      await expect(profilePage.passwordSuccess).toHaveText(
        'Your password is successfully updated!',
      );
      await expect(profilePage.passwordError).toHaveCount(0);

      await expect(page).toHaveURL(/\/auth\/login/, { timeout: 15000 });
      await expect(loginPage.loginButton).toBeVisible();

      // The change took effect: the freshly-set password authenticates.
      await loginPage.login(user.email, newPassword);

      await expect(accountPage.title).toBeVisible();
    },
  );
});
