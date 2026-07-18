import { faker } from '@faker-js/faker';
import { registerUserWithTotpEnabled } from '@src/api/factories/totp-user.api.factory';
import { expect, test } from '@src/fixtures/merge.fixture';

/**
 * Login, positive and negative.
 *
 * Every negative here runs against `loggedApiUser` — a throwaway user registered
 * fresh for that one test — and sends exactly **one** wrong password. Three failed
 * attempts lock an account permanently (TEST_PLAN §20), so a negative login must
 * never target a seeded account, and no test in this file may loop over wrong
 * passwords against the same user.
 */
test.describe('API users — login', () => {
  test(
    'issues an access token for valid credentials',
    { tag: ['@api', '@smoke', '@auth', '@login'] },
    async ({ loginRequest, loggedApiUser }) => {
      const response = await loginRequest.post({
        email: loggedApiUser.email,
        password: loggedApiUser.password,
      });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect.soft(body.access_token).toBeTruthy();
      expect.soft(body.token_type).toBe('bearer');
      expect.soft(body.expires_in).toBeGreaterThan(0);
    },
  );

  test(
    'rejects a wrong password with 401',
    { tag: ['@api', '@auth', '@login'] },
    async ({ loginRequest, loggedApiUser }) => {
      const response = await loginRequest.post({
        email: loggedApiUser.email,
        password: `${loggedApiUser.password}-wrong`,
      });

      expect(
        response.status(),
        `wrong password expected 401, got ${response.status()}`,
      ).toBe(401);

      const body = await response.json();
      expect.soft(body.error).toBe('Unauthorized');
    },
  );

  test(
    'rejects an unknown email with 401',
    { tag: ['@api', '@auth', '@login'] },
    async ({ loginRequest }) => {
      const response = await loginRequest.post({
        email: faker.internet.email(),
        password: faker.internet.password(),
      });

      expect(response.status()).toBe(401);
    },
  );

  /**
   * A TOTP account cannot be logged in with a password alone — but the refusal
   * arrives as a **200**, flagged only by `requires_totp`. The token in that body is
   * provisional: it authorises nothing except the second login leg
   * (`POST /users/login` with `{ totp, access_token }`, §23), and is refused
   * everywhere else (see `totp.negative.api.spec.ts`).
   *
   * So a 200 here does not mean "logged in", which is what makes
   * `getAuthorizationHeader()` unsafe for TOTP accounts.
   */
  test(
    'answers a TOTP-enabled login with 200 and requires_totp, not a session',
    { tag: ['@api', '@auth', '@login'] },
    async ({ request, loginRequest, usersRequest }) => {
      const { email, password } = await registerUserWithTotpEnabled(
        request,
        usersRequest,
      );

      const response = await loginRequest.post({ email, password });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.requires_totp).toBe(true);
      expect.soft(body.message).toBe('TOTP required');
    },
  );

  // A malformed request is turned away by the same 401 as a wrong password, only
  // with a different body — the endpoint never answers 422.
  test(
    'rejects a login with no password with 401',
    { tag: ['@api', '@auth', '@login'] },
    async ({ loginRequest, loggedApiUser }) => {
      const response = await loginRequest.post({ email: loggedApiUser.email });

      expect(response.status()).toBe(401);

      const body = await response.json();
      expect.soft(body.error).toBe('Invalid login request');
    },
  );
});
