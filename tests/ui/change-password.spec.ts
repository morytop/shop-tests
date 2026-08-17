import { expect, test } from '@src/fixtures/merge.fixture';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { prepareRandomPassword } from '@src/ui/factories/user.factory';
import {
  CHANGE_PASSWORD_ERRORS,
  PASSWORD_STRENGTH_LEVELS,
} from '@src/ui/test-data/user.data';

// User Stories v5 — Change password (TEST_PLAN.md §5.15). The form is the middle of the
// three on `/account/profile`, so every test gates on `waitForProfileLoaded()` after
// navigating (§24) and reads its banners from the password form, not page-wide.
//
// Data safety (§3): every test signs in via the user-action fixture, never as
// `testUser1` (it IS the shared seeded `customer@` account) and never on the `@logged`
// storageState session — `tests/setup/login.setup.ts` shares one user across every
// `@logged` spec. AC4 submits a wrong current password (lockout risk on any shared
// account) and AC6 actually changes the password, so those two mint their own fresh
// user; the rest persist nothing and share the per-worker `workerUser`.
//
// Two of §5.15's ACs describe production inaccurately; both are pinned below and
// recorded in TEST_PLAN.md §25.
//
// See TEST_PLAN.md §25 and .ai-docs/change-password-plan.md.

test.describe('Verify change password', () => {
  // AC1 — the form offers exactly the three password fields, all empty and masked.
  test(
    'show empty current, new and confirm password fields',
    { tag: ['@auth', '@profile', '@regression'] },
    async ({ loginAs, profilePage, workerUser }) => {
      await loginAs(workerUser);
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
    async ({ loginAs, profilePage, workerUser }) => {
      await loginAs(workerUser);
      await profilePage.goto();
      await profilePage.waitForProfileLoaded();

      for (const level of PASSWORD_STRENGTH_LEVELS) {
        await profilePage.enterNewPassword(level.password);

        await expect(profilePage.passwordStrength.fillBar).toHaveAttribute(
          'style',
          new RegExp(`width:\\s*${level.width};`),
        );
        await expect(profilePage.passwordStrength.activeLabel).toHaveText(
          level.label,
        );
      }
    },
  );

  // AC3 — the documented copy is "Passwords do not match."; production actually returns
  // the API's 422 message below. The submit button never disables, so the request fires
  // — but the mismatch is rejected server-side and nothing is saved, so the shared
  // worker user is safe here.
  test(
    'reject a new password that does not match its confirmation',
    { tag: ['@auth', '@profile', '@regression'] },
    async ({ loginAs, profilePage, workerUser }) => {
      await loginAs(workerUser);
      await profilePage.goto();
      await profilePage.waitForProfileLoaded();

      await profilePage.changePassword(
        workerUser.password,
        prepareRandomPassword(),
        prepareRandomPassword(),
      );

      await expect(profilePage.passwordError).toHaveText(
        CHANGE_PASSWORD_ERRORS.confirmationMismatch,
      );
      await expect(profilePage.passwordSuccess).toHaveCount(0);
    },
  );

  // AC4 — a wrong current password is rejected server-side (400). A fresh user, not
  // the worker user: submitting wrong passwords against a shared account courts the
  // permanent 3-strike lockout (§20).
  test(
    'reject a change submitted with the wrong current password',
    { tag: ['@auth', '@profile', '@regression'] },
    async ({ loginAsFreshUser, profilePage }) => {
      await loginAsFreshUser();
      const newPassword = prepareRandomPassword();

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

  // AC5 — reusing the current password is rejected server-side (400); nothing is
  // saved, so the shared worker user is safe here.
  test(
    'reject a new password identical to the current one',
    { tag: ['@auth', '@profile', '@regression'] },
    async ({ loginAs, profilePage, workerUser }) => {
      await loginAs(workerUser);
      await profilePage.goto();
      await profilePage.waitForProfileLoaded();

      await profilePage.changePassword(
        workerUser.password,
        workerUser.password,
        workerUser.password,
      );

      await expect(profilePage.passwordError).toHaveText(
        CHANGE_PASSWORD_ERRORS.sameAsCurrentPassword,
      );
      await expect(profilePage.passwordSuccess).toHaveCount(0);
    },
  );

  // AC6 — a valid change confirms, then logs the user out after ~5s (measured up to
  // ~9s live, hence the headroom). The logout is real, not cosmetic: the session is
  // cleared and only the new password authenticates afterwards. Mutates the account's
  // password, so it mints its own fresh user.
  test(
    'change the password, then log the user out automatically',
    { tag: ['@auth', '@profile', '@regression'] },
    async ({ accountPage, loginAsFreshUser, loginPage, page, profilePage }) => {
      const user = await loginAsFreshUser();
      const newPassword = prepareRandomPassword();

      await profilePage.goto();
      await profilePage.waitForProfileLoaded();

      await profilePage.changePassword(user.password, newPassword, newPassword);

      await expect(profilePage.passwordSuccess).toHaveText(
        'Your password is successfully updated!',
      );
      await expect(profilePage.passwordError).toHaveCount(0);

      await expect(page).toHaveURL(PAGE_URLS.LOGIN);
      await expect(loginPage.loginButton).toBeVisible();

      // The change took effect: the freshly-set password authenticates.
      await loginPage.login(user.email, newPassword);

      await expect(accountPage.pageTitle).toBeVisible();
    },
  );
});
