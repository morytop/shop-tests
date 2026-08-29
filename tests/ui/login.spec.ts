import { registerUserWithTotpEnabled } from '@src/api/factories/totp-user.api.factory';
import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import { expect, test } from '@src/fixtures/merge.fixture';
import { testUser1 } from '@src/ui/test-data/user.data';
import { PAGE_URLS } from '@src/ui/utils/page-urls.util';
import { generateTotpCode } from '@src/ui/utils/totp.util';

test.describe('Verify login @login', () => {
  test('login with correct credentials', async ({ accountPage, loginPage }) => {
    const email = testUser1.email;
    const password = testUser1.password;

    await loginPage.goto();
    await loginPage.login(email, password);

    await expect(accountPage.pageTitle).toHaveText('My account');
  });

  test('reject login with incorrect credentials', async ({ loginPage }) => {
    const email = 'wrong@email.com';
    const password = 'wrong-password';

    await loginPage.goto();
    await loginPage.login(email, password);

    await expect
      .soft(loginPage.loginError)
      .toHaveText('Invalid email or password');
  });

  test(
    'lock the account after three consecutive failed login attempts',
    { tag: ['@auth', '@login', '@regression'] },
    async ({ loginPage, page, usersRequest }) => {
      const failedAttemptsBeforeLock = 3;
      const user = await registerUserWithApi(usersRequest);

      await loginPage.goto();
      await loginPage.failLoginAttempts(
        user.email,
        'Wr0ng-password!1',
        failedAttemptsBeforeLock,
      );

      await loginPage.loginAndAwaitResponse(user.email, user.password);

      await expect(loginPage.loginError).toHaveText(
        'Account locked, too many failed attempts. Please contact the administrator.',
      );
      await expect(page).toHaveURL(PAGE_URLS.LOGIN);
    },
  );

  test.describe('with a TOTP-enabled account', () => {
    test(
      'prompt for a TOTP code after valid credentials',
      { tag: ['@auth', '@login', '@totp', '@regression'] },
      async ({ loginPage, page, request, usersRequest }) => {
        const user = await registerUserWithTotpEnabled(request, usersRequest);

        await loginPage.goto();
        await loginPage.login(user.email, user.password);

        await expect(loginPage.totpForm.codeInput).toBeVisible();
        await expect(loginPage.totpForm.verifyButton).toBeVisible();
        await expect(loginPage.loginButton).toHaveCount(0);
        await expect(page).toHaveURL(PAGE_URLS.LOGIN);
      },
    );

    test(
      'authenticate with a valid TOTP code',
      { tag: ['@auth', '@login', '@totp', '@regression'] },
      async ({ accountPage, loginPage, usersRequest, request }) => {
        const user = await registerUserWithTotpEnabled(request, usersRequest);

        await loginPage.goto();
        await loginPage.login(user.email, user.password);
        await loginPage.totpForm.codeInput.waitFor();

        await loginPage.totpForm.submitCode(generateTotpCode(user.secret));

        await expect(accountPage.pageTitle).toHaveText('My account');
      },
    );

    test(
      'reject an invalid TOTP code',
      { tag: ['@auth', '@login', '@totp', '@regression'] },
      async ({ loginPage, page, request, usersRequest }) => {
        const user = await registerUserWithTotpEnabled(request, usersRequest);

        await loginPage.goto();
        await loginPage.login(user.email, user.password);
        await loginPage.totpForm.codeInput.waitFor();

        await loginPage.totpForm.submitCode('000000');

        await expect(loginPage.loginError).toHaveText('Invalid TOTP');
        await expect(page).toHaveURL(PAGE_URLS.LOGIN);
        await expect(loginPage.totpForm.codeInput).toBeVisible();
      },
    );
  });
});
