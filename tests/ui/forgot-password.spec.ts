import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import { expect, test } from '@src/fixtures/merge.fixture';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { BANNER_DISMISS_TIMEOUT } from '@src/ui/constants/timeouts';
import { prepareRandomUser } from '@src/ui/factories/user.factory';
import { INVALID_EMAILS } from '@src/ui/test-data/email.data';
import { FORGOT_PASSWORD_CONFIRMATION_TEXT } from '@src/ui/test-data/forgot-password.data';

// User Stories v5 — Forgot password (TEST_PLAN.md §5.12). The form is one Angular
// reactive form whose error block is submit-gated (`@if (email.invalid && submitted)`),
// so nothing validates before the first submit. Both server banners are removed from
// the DOM ~3s after they render, so every server-path assertion first awaits the
// `POST /users/forgot-password` response rather than racing the slow public API.
//
// DESTRUCTIVE ENDPOINT: submitting a registered address does not mail a reset link —
// it overwrites that account's password on the spot. AC3 therefore runs against a
// throwaway API-registered user and never `testUser1` or the shared seeded accounts
// (§3). See TEST_PLAN.md §21 and .ai-docs/forgot-password-plan.md.

test.describe('Verify forgot password @forgot-password', () => {
  // AC1 — the form is reachable from the login page and exposes an email field.
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

  // AC2 — a malformed address is rejected client-side. NB: the error block renders
  // EMPTY (TEST_PLAN.md §21) — the control uses `Validators.pattern`, which sets
  // `errors.pattern`, but the template only prints copy for `errors.required` and
  // `errors['email']`. This pins the actual behaviour, as §19 does for the register
  // strength meter. The absence of a server banner proves nothing reached the API.
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

  // AC2 — the empty field is the one case whose message actually renders, so it is
  // asserted separately from the malformed-format cases above.
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

  // AC3 — a registered address is accepted and confirmed (with the raw i18n key the
  // form actually renders — see FORGOT_PASSWORD_CONFIRMATION_TEXT for the pinned
  // bug), and the banner disappears after ~3s. The user is disposable because this
  // call RESETS its password (§21).
  test(
    'confirm the reset for a registered email and fade the message',
    { tag: ['@auth', '@forgot-password', '@regression'] },
    async ({ forgotPasswordPage, usersRequest }) => {
      const user = await registerUserWithApi(usersRequest);

      await forgotPasswordPage.goto();
      await forgotPasswordPage.submitAndAwaitResponse(user.email);

      await expect(forgotPasswordPage.successAlert).toHaveText(
        FORGOT_PASSWORD_CONFIRMATION_TEXT,
      );
      await expect(forgotPasswordPage.errorAlert).toHaveCount(0);
      // The banner is detached (an `@if` toggle, no CSS fade), so count — not
      // visibility — is the observable end state of the fade.
      await expect(forgotPasswordPage.successAlert).toHaveCount(0, {
        timeout: BANNER_DISMISS_TIMEOUT,
      });
    },
  );

  // AC4 — an unregistered address is rejected by the API (422) and surfaced verbatim.
  // The address is faker-generated and never registered, so nothing is mutated.
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
