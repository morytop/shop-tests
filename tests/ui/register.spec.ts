import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import { expect, test } from '@src/fixtures/merge.fixture';
import { prepareRandomUser } from '@src/ui/factories/user.factory';
import { INVALID_EMAILS, VALID_EMAILS } from '@src/ui/test-data/email.data';
import { REQUIRED_FIELD_ERRORS } from '@src/ui/test-data/register.data';
import { strengthBarWidthRegex } from '@src/ui/utils/formats.util';

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

  test(
    'password strength meter stays empty (known production bug)',
    { tag: ['@auth', '@register', '@regression'] },
    async ({ registerPage }) => {
      await registerPage.goto();

      await registerPage.enterPassword('Aaaaaaa1!');

      await expect(registerPage.passwordStrength.fillBar).toHaveAttribute(
        'style',
        strengthBarWidthRegex('0%'),
      );
      await expect(registerPage.passwordStrength.activeLabel).toHaveCount(0);
    },
  );
});
