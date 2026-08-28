import { expect, test } from '@src/fixtures/merge.fixture';
import { TOTP_SECRET_REGEX } from '@src/ui/constants/formats';
import { testUser1 } from '@src/ui/test-data/user.data';
import { generateTotpCode } from '@src/ui/utils/totp.util';

test.describe('Verify TOTP setup @totp', () => {
  test(
    'show the TOTP setup section with a QR code and manual secret',
    { tag: ['@auth', '@totp', '@regression'] },
    async ({ loginAs, profilePage, workerUser }) => {
      await loginAs(workerUser);
      await profilePage.goto();

      await expect(profilePage.totpHeading).toBeVisible();
      await expect(profilePage.totpQrCode).toBeVisible();
      // Assert the shape, not a fixed value — see TOTP_SECRET_REGEX.
      await expect(profilePage.totpSecret).toHaveText(TOTP_SECRET_REGEX);
      await expect(profilePage.totpForm.codeInput).toBeVisible();
      await expect(profilePage.totpForm.verifyButton).toBeVisible();
    },
  );

  test(
    'enable TOTP with a valid generated code',
    { tag: ['@auth', '@totp', '@regression'] },
    async ({ loginAsFreshUser, profilePage }) => {
      await loginAsFreshUser();
      await profilePage.goto();
      const secret = await profilePage.readTotpSecret();

      await profilePage.totpForm.submitCode(generateTotpCode(secret));

      await expect(profilePage.totpSuccess).toHaveText(
        'Success: TOTP verified and enabled successfully.',
      );
      await expect(profilePage.totpError).toHaveCount(0);
    },
  );

  test(
    'reject an invalid TOTP code and leave TOTP disabled',
    { tag: ['@auth', '@totp', '@regression'] },
    async ({ loginAsFreshUser, profilePage }) => {
      await loginAsFreshUser();
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

  test(
    'deny TOTP setup for the shared seeded account',
    { tag: ['@auth', '@totp', '@regression'] },
    async ({ loginAs, profilePage }) => {
      await loginAs(testUser1);

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
