import { registerUserWithTotpEnabled } from '@src/api/factories/totp-user.api.factory';
import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import { expect, test } from '@src/merge.fixture';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { testUser1 } from '@src/ui/test-data/user.data';
import { generateTotpCode } from '@src/ui/utils/totp.util';

// Login AC1-AC3 (docs/user-stories/v5.md)
test.describe('Verify login @login', () => {
  test('login with correct credentials', async ({ accountPage, loginPage }) => {
    const email = testUser1.email;
    const password = testUser1.password;

    await loginPage.goto();
    await loginPage.login(email, password);

    await expect(accountPage.title).toHaveText('My account');
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

  // Login AC3: lockout is permanent for the account and can only be undone by an
  // administrator, so it must be driven against a disposable freshly-registered user
  // — never testUser1 or the shared seeded accounts (TEST_PLAN.md §3). Verified live
  // that the lock is keyed on the account, not the caller's IP or browser session, so
  // this stays safe under fullyParallel (TEST_PLAN.md §20).
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
      // The locking attempt uses the *correct* password: it proves the account is
      // locked outright rather than the message merely tracking a wrong-password count.
      await loginPage.loginAndAwaitResponse(user.email, user.password);

      await expect(loginPage.loginError).toHaveText(
        'Account locked, too many failed attempts. Please contact the administrator.',
      );
      await expect(page).toHaveURL(new RegExp(`${PAGE_URLS.LOGIN}$`));
    },
  );

  // Login AC: a TOTP-enabled account is prompted for a 6-digit code after valid
  // credentials; a valid code authenticates, an invalid one shows "Invalid TOTP".
  //
  // Each test enrols its own disposable user over the API (register → login →
  // /totp/setup → /totp/verify). Enabling TOTP is a permanent mutation, and
  // testUser1 IS the shared seeded customer@ account, which the API refuses TOTP
  // setup for anyway (403) — see TEST_PLAN.md §22/§23. The second leg reuses
  // POST /users/login with {totp, access_token}, and its errors surface in the
  // same [data-test="login-error"] element as the credential errors.
  test.describe('with a TOTP-enabled account', () => {
    test(
      'prompt for a TOTP code after valid credentials',
      { tag: ['@auth', '@login', '@totp', '@regression'] },
      async ({ loginPage, page, request, usersRequest }) => {
        const user = await registerUserWithTotpEnabled(request, usersRequest);

        await loginPage.goto();
        await loginPage.login(user.email, user.password);

        await expect(loginPage.totpCodeInput).toBeVisible();
        await expect(loginPage.verifyTotpButton).toBeVisible();
        // The credentials form is swapped out in place — same route, no redirect.
        await expect(loginPage.loginButton).toHaveCount(0);
        await expect(page).toHaveURL(new RegExp(`${PAGE_URLS.LOGIN}$`));
      },
    );

    test(
      'authenticate with a valid TOTP code',
      { tag: ['@auth', '@login', '@totp', '@regression'] },
      async ({ accountPage, loginPage, usersRequest, request }) => {
        const user = await registerUserWithTotpEnabled(request, usersRequest);

        await loginPage.goto();
        await loginPage.login(user.email, user.password);
        await loginPage.totpCodeInput.waitFor();

        // Codes rotate every 30s, so derive it immediately before submitting.
        await loginPage.submitTotpCode(generateTotpCode(user.secret));

        await expect(accountPage.title).toHaveText('My account');
      },
    );

    test(
      'reject an invalid TOTP code',
      { tag: ['@auth', '@login', '@totp', '@regression'] },
      async ({ loginPage, page, request, usersRequest }) => {
        const user = await registerUserWithTotpEnabled(request, usersRequest);

        await loginPage.goto();
        await loginPage.login(user.email, user.password);
        await loginPage.totpCodeInput.waitFor();

        await loginPage.submitTotpCode('000000');

        await expect(loginPage.loginError).toHaveText('Invalid TOTP');
        await expect(page).toHaveURL(new RegExp(`${PAGE_URLS.LOGIN}$`));
        // Unlike the profile page's setup form (§22), the prompt survives the error.
        await expect(loginPage.totpCodeInput).toBeVisible();
      },
    );
  });
});
