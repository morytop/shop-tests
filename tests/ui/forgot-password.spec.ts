import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import { expect, test } from '@src/fixtures/merge.fixture';
import { prepareRandomUser } from '@src/ui/factories/user.factory';
import { INVALID_EMAILS } from '@src/ui/test-data/email.data';
import { FORGOT_PASSWORD_CONFIRMATION_TEXT } from '@src/ui/test-data/forgot-password.data';
import { PAGE_URLS } from '@src/ui/utils/page-urls.util';

test.describe('Verify forgot password @forgot-password', () => {
  test(
    'open the forgot password form from the login page',
    { tag: ['@auth', '@forgot-password', '@regression'] },
    async ({ forgotPasswordPage, loginPage, page }) => {
      await loginPage.goto();

      await loginPage.openForgotPassword();

      await expect(page).toHaveURL(PAGE_URLS.FORGOT_PASSWORD);
      await expect(forgotPasswordPage.heading).toBeVisible();
      await expect(forgotPasswordPage.emailInput).toBeVisible();
      await expect(forgotPasswordPage.submitButton).toBeVisible();
    },
  );

  for (const email of INVALID_EMAILS) {
    test(
      `reject the malformed email "${email}" client-side`,
      { tag: ['@auth', '@forgot-password', '@regression'] },
      async ({ forgotPasswordPage }) => {
        await forgotPasswordPage.goto();

        await forgotPasswordPage.submit(email);

        await expect(forgotPasswordPage.emailError).toBeVisible();
        await expect(forgotPasswordPage.emailError).toBeEmpty();
        await expect(forgotPasswordPage.emailInput).toHaveClass(/ng-invalid/);
        await expect(forgotPasswordPage.successAlert).toHaveCount(0);
        await expect(forgotPasswordPage.errorAlert).toHaveCount(0);
      },
    );
  }

  test(
    'reject an empty email with the required message',
    { tag: ['@auth', '@forgot-password', '@regression'] },
    async ({ forgotPasswordPage }) => {
      await forgotPasswordPage.goto();

      await forgotPasswordPage.submitButton.click();

      await expect(forgotPasswordPage.emailError).toHaveText(
        'Email is required',
      );
    },
  );

  test(
    'confirm the reset for a registered email',
    { tag: ['@auth', '@forgot-password', '@regression'] },
    async ({ forgotPasswordPage, usersRequest }) => {
      const user = await registerUserWithApi(usersRequest);

      await forgotPasswordPage.goto();
      await forgotPasswordPage.submitAndAwaitResponse(user.email);

      await expect(forgotPasswordPage.successAlert).toHaveText(
        FORGOT_PASSWORD_CONFIRMATION_TEXT,
      );
      await expect(forgotPasswordPage.errorAlert).toHaveCount(0);
    },
  );

  test(
    'show an error for an unregistered email',
    { tag: ['@auth', '@forgot-password', '@regression'] },
    async ({ forgotPasswordPage }) => {
      const unregistered = prepareRandomUser();

      await forgotPasswordPage.goto();
      await forgotPasswordPage.submitAndAwaitResponse(unregistered.email);

      await expect(forgotPasswordPage.errorAlert).toHaveText(
        'The selected email is invalid.',
      );
      await expect(forgotPasswordPage.successAlert).toHaveCount(0);
    },
  );
});
