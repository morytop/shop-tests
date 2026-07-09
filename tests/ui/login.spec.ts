import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import { expect, test } from '@src/merge.fixture';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { testUser1 } from '@src/ui/test-data/user.data';

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
  // — never testUser1 or the shared seeded accounts (test_plan.md §3). Verified live
  // that the lock is keyed on the account, not the caller's IP or browser session, so
  // this stays safe under fullyParallel (test_plan.md §20).
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
});
