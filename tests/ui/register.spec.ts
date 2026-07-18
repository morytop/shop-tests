import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import { expect, test } from '@src/fixtures/merge.fixture';
import { prepareRandomUser } from '@src/ui/factories/user.factory';

// User Stories v5 — Registration (TEST_PLAN.md §5.10). The register form is one
// Angular reactive form built with `updateOn: 'blur'`, so validators, the inline
// error blocks and the password requirements-list highlighting only recompute once
// focus leaves a field — and every error block is additionally gated behind a
// submit (`@if (f['x'].invalid && submitted)`), so there is no live per-field
// validation before the first submit. Behaviour and exact copy were verified against
// the live site and the sprint5 source; see TEST_PLAN.md §19 for the confirmed
// production discrepancies (broken strength meter, duplicate-email copy). Users are
// generated per-test with faker (§3); see .ai-docs/register-validation-plan.md.

// Required fields keyed by their `data-test` id → the message shown on empty submit.
const REQUIRED_FIELD_ERRORS: Record<string, string> = {
  'first-name': 'First name is required',
  'last-name': 'Last name is required',
  dob: 'Date of Birth is required',
  country: 'Country is required',
  postal_code: 'Postcode is required',
  house_number: 'House number is required',
  street: 'Street is required',
  city: 'City is required',
  state: 'State is required',
  phone: 'Phone is required.',
  email: 'Email is required',
  password: 'Password is required',
};

// RFC-format boundary cases rejected by the email pattern validator.
const INVALID_EMAILS = ['plainaddress', 'foo@', '@example.com'];
// Valid edge cases the pattern accepts.
const VALID_EMAILS = ['a@b.co', 'first.last+tag@sub.example.com'];

test.describe('Verify register @register', () => {
  test('register with correct data and login', async ({
    registerPage,
    accountPage,
    loginPage,
  }) => {
    const user = prepareRandomUser();

    await registerPage.goto();
    await registerPage.register(user);
    await expect(loginPage.heading).toHaveText('Login');

    await loginPage.login(user.email, user.password);
    await expect(accountPage.pageTitle).toHaveText('My account');
  });

  // AC1 — every field is required; submitting the empty form reveals each field's
  // required message (errors are submit-gated, so nothing shows before this click).
  test(
    'submitting the empty form flags every required field',
    { tag: ['@auth', '@register', '@regression'] },
    async ({ registerPage }) => {
      await registerPage.goto();

      await registerPage.registerButton.click();

      for (const [field, message] of Object.entries(REQUIRED_FIELD_ERRORS)) {
        const error = registerPage.fieldError(field);
        await expect(error).toBeVisible();
        await expect(error).toContainText(message);
      }
    },
  );

  // AC6 — malformed emails are rejected client-side. Only the email is filled, so the
  // form stays invalid and never reaches the API (no account is created).
  for (const email of INVALID_EMAILS) {
    test(
      `rejects the malformed email "${email}"`,
      { tag: ['@auth', '@register', '@regression'] },
      async ({ registerPage }) => {
        await registerPage.goto();
        await registerPage.emailInput.fill(email);

        await registerPage.registerButton.click();

        await expect(registerPage.fieldError('email')).toContainText(
          'Email format is invalid',
        );
      },
    );
  }

  // AC6 — valid edge-case addresses pass the format check: with only the email set,
  // the email control is valid so its error block never renders.
  for (const email of VALID_EMAILS) {
    test(
      `accepts the valid email format "${email}"`,
      { tag: ['@auth', '@register', '@regression'] },
      async ({ registerPage }) => {
        await registerPage.goto();
        await registerPage.emailInput.fill(email);

        await registerPage.registerButton.click();

        await expect(registerPage.fieldError('email')).toBeHidden();
      },
    );
  }

  // AC4 — registering an already-used email is rejected. A throwaway user is created
  // via the API first, then the UI re-registers that email. NB: production shows
  // "A customer with this email address already exists." — the API no longer returns
  // the `Duplicate Entry` code the source maps to "Email is already in use." (§19).
  test(
    'rejects registration with an already-used email',
    { tag: ['@auth', '@register', '@regression'] },
    async ({ registerPage, usersRequest }) => {
      const existing = await registerUserWithApi(usersRequest);
      const duplicate = prepareRandomUser();
      duplicate.email = existing.email;

      await registerPage.goto();
      await registerPage.register(duplicate);

      await expect(registerPage.registerError).toBeVisible();
      await expect(registerPage.registerError).toContainText(
        'A customer with this email address already exists.',
      );
      // Registration failed, so the user stays on the register page.
      await expect(registerPage.heading).toBeVisible();
    },
  );

  // AC2 — the password requirements list highlights each rule (green `.text-success`)
  // as it is satisfied and un-highlights it when it is not, live as the user types.
  test(
    'password requirements list highlights each satisfied rule',
    { tag: ['@auth', '@register', '@regression'] },
    async ({ registerPage }) => {
      await registerPage.goto();
      await expect(registerPage.passwordRequirements).toHaveCount(4);

      // 8 lowercase letters: only the length rule is met.
      await registerPage.enterPassword('aaaaaaaa');
      await expect(registerPage.reqLength).toHaveClass(/text-success/);
      await expect(registerPage.reqMixedCase).not.toHaveClass(/text-success/);
      await expect(registerPage.reqNumber).not.toHaveClass(/text-success/);
      await expect(registerPage.reqSymbol).not.toHaveClass(/text-success/);

      // Short but mixed-case + number + symbol: only the length rule is unmet.
      await registerPage.enterPassword('aB1!');
      await expect(registerPage.reqLength).not.toHaveClass(/text-success/);
      await expect(registerPage.reqMixedCase).toHaveClass(/text-success/);
      await expect(registerPage.reqNumber).toHaveClass(/text-success/);
      await expect(registerPage.reqSymbol).toHaveClass(/text-success/);

      // Fully compliant password: every rule is met.
      await registerPage.enterPassword('Aaaaaaa1!');
      await expect(registerPage.reqLength).toHaveClass(/text-success/);
      await expect(registerPage.reqMixedCase).toHaveClass(/text-success/);
      await expect(registerPage.reqNumber).toHaveClass(/text-success/);
      await expect(registerPage.reqSymbol).toHaveClass(/text-success/);
    },
  );

  // AC3 — the strength indicator is BROKEN in production and this pins that behaviour
  // (TEST_PLAN.md §19). The template updates it on the input event but reads the
  // control's value, which — because the form is `updateOn:'blur'` — is still stale
  // at that moment, so `passwordStrength()` always sees the empty pre-blur value:
  // the bar never leaves 0% and no strength label ever activates, even for a fully
  // valid password that should read "Excellent" / 100%.
  test(
    'password strength meter stays empty (known production bug)',
    { tag: ['@auth', '@register', '@regression'] },
    async ({ registerPage }) => {
      await registerPage.goto();

      await registerPage.enterPassword('Aaaaaaa1!');

      await expect(registerPage.passwordStrength.fillBar).toHaveAttribute(
        'style',
        /width:\s*0%/,
      );
      await expect(registerPage.passwordStrength.activeLabel).toHaveCount(0);
    },
  );
});
