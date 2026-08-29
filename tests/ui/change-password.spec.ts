import { expect, test } from '@src/fixtures/merge.fixture';
import { prepareRandomPassword } from '@src/ui/factories/user.factory';
import {
  CHANGE_PASSWORD_ERRORS,
  PASSWORD_STRENGTH_LEVELS,
} from '@src/ui/test-data/user.data';
import { strengthBarWidthRegex } from '@src/ui/utils/formats.util';
import { PAGE_URLS } from '@src/ui/utils/page-urls.util';

test.describe('Verify change password', () => {
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
          strengthBarWidthRegex(level.width),
        );
        await expect(profilePage.passwordStrength.activeLabel).toHaveText(
          level.label,
        );
      }
    },
  );

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
