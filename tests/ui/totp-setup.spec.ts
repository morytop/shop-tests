import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import { expect, test } from '@src/merge.fixture';
import { testUser1 } from '@src/ui/test-data/user.data';
import { generateTotpCode } from '@src/ui/utils/totp.util';

// User Stories v5 — 2FA Setup (TEST_PLAN.md §5.13). The section lives on
// `/account/profile`, which POSTs `/totp/setup` on every load: for an eligible
// account that mints and persists a NEW secret each visit, so the secret is read
// from the DOM immediately before a code is derived from it (codes also rotate
// every 30s). The API's `verifyKey()` allows ±1 time step, which absorbs modest
// clock skew between the runner and the server.
//
// Data safety (§3): AC1–AC3 enable TOTP, which is a mutation, so each registers
// its own throwaway user via the API and logs in inline. They deliberately do NOT
// ride the `@logged` storageState session — `tests/setup/login.setup.ts` shares one
// user across every `@logged` spec in a run, and enabling TOTP on it would leak
// into specs like `checkout-e2e`. AC4 is a read-only denial check, the one use the
// shared seeded `customer@` account is explicitly reserved for.
//
// See TEST_PLAN.md §22 and .ai-docs/totp-setup-plan.md.

test.describe('Verify TOTP setup @totp', () => {
  // AC1 — a freshly-registered, logged-in user is offered the setup section with a
  // QR code and the manual secret key.
  test(
    'show the TOTP setup section with a QR code and manual secret',
    { tag: ['@auth', '@totp', '@regression'] },
    async ({ accountPage, loginPage, profilePage, usersRequest }) => {
      const user = await registerUserWithApi(usersRequest);

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.title.waitFor();
      await profilePage.goto();

      await expect(profilePage.totpHeading).toBeVisible();
      await expect(profilePage.totpQrCode).toBeVisible();
      // google2fa mints 16 base32 characters; assert the shape, not a fixed value.
      await expect(profilePage.totpSecret).toHaveText(/^[A-Z2-7]{16}$/);
      await expect(profilePage.totpForm.codeInput).toBeVisible();
      await expect(profilePage.totpForm.verifyButton).toBeVisible();
    },
  );

  // AC2 — a valid code derived from the displayed secret enables TOTP. The banner
  // text carries the template's "Success:" prefix.
  test(
    'enable TOTP with a valid generated code',
    { tag: ['@auth', '@totp', '@regression'] },
    async ({ accountPage, loginPage, profilePage, usersRequest }) => {
      const user = await registerUserWithApi(usersRequest);

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.title.waitFor();
      await profilePage.goto();
      const secret = await profilePage.readTotpSecret();

      await profilePage.totpForm.submitCode(generateTotpCode(secret));

      await expect(profilePage.totpSuccess).toHaveText(
        'Success: TOTP verified and enabled successfully.',
      );
      await expect(profilePage.totpError).toHaveCount(0);
    },
  );

  // AC3 — an invalid code is rejected and TOTP stays disabled. NB: the error also
  // tears down the QR/secret/form (the template gates them behind `!errorMessage`),
  // so a retry needs a reload — pinned below (§22). "Not enabled" is proven by
  // reloading: the setup section returns instead of "already enabled".
  test(
    'reject an invalid TOTP code and leave TOTP disabled',
    { tag: ['@auth', '@totp', '@regression'] },
    async ({ accountPage, loginPage, profilePage, usersRequest }) => {
      const user = await registerUserWithApi(usersRequest);

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.title.waitFor();
      await profilePage.goto();

      await profilePage.totpForm.submitCode('000000');

      await expect(profilePage.totpError).toHaveText(
        'Error: Invalid TOTP code. Please try again.',
      );
      await expect(profilePage.totpSuccess).toHaveCount(0);
      // The setup form is torn down by the error, not by TOTP being enabled.
      await expect(profilePage.totpForm.verifyButton).toHaveCount(0);

      await profilePage.goto();

      // Still offered setup rather than "already enabled" ⇒ TOTP was not enabled.
      await expect(profilePage.totpSecret).toBeVisible();
      await expect(profilePage.totpForm.verifyButton).toBeVisible();
    },
  );

  // AC4 — the seeded accounts are denied setup. `testUser1` IS the shared seeded
  // `customer@practicesoftwaretesting.com` (env `USER_EMAIL`), and this is a pure
  // read/negative check: no code is ever submitted, so nothing is mutated (§3).
  // The API's 403 comes from one hardcoded allowlist holding both `customer@` and
  // `admin@`, so this exercises the whole rule; `admin@` cannot be automated
  // separately because no admin password exists in config (§22).
  test(
    'deny TOTP setup for the shared seeded account',
    { tag: ['@auth', '@totp', '@regression'] },
    async ({ accountPage, loginPage, profilePage }) => {
      await loginPage.goto();
      await loginPage.login(testUser1.email, testUser1.password);
      await accountPage.title.waitFor();

      await profilePage.goto();

      await expect(profilePage.totpError).toHaveText(
        'Error: Access denied: If you want to configure TOTP, please create your own account.',
      );
      await expect(profilePage.totpSecret).toHaveCount(0);
      await expect(profilePage.totpQrCode).toHaveCount(0);
      await expect(profilePage.totpForm.verifyButton).toHaveCount(0);
    },
  );
});
