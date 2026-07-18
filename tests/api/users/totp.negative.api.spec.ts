import { getAuthorizationHeader } from '@src/api/factories/authorization-header.api.factory';
import { registerUserWithTotpEnabled } from '@src/api/factories/totp-user.api.factory';
import { TotpRequest } from '@src/api/requests/totp.request';
import { expect, test } from '@src/fixtures/merge.fixture';
import { generateTotpCode } from '@src/ui/utils/totp.util';

/**
 * TOTP rejection paths, on throwaway users enrolled over the API.
 *
 * Safe to run: a failed TOTP attempt does not feed the 3-strike account lockout
 * (TEST_PLAN §23), unlike a failed password login. `TotpRequest` is built here
 * rather than injected, because it needs a specific user's Bearer token.
 *
 * `/totp/verify` only ever confirms *enrolment*. It is not the endpoint that
 * completes a TOTP login — that is `POST /users/login` with a `totp` field, which
 * `login.spec.ts` covers. Which token you hold decides the rejection you get, and
 * the two tests below pin both halves.
 */
test.describe('API totp — rejections', () => {
  test(
    'rejects a wrong code during enrolment with 400',
    { tag: ['@api', '@auth'] },
    async ({ request, loggedHeaders }) => {
      // loggedHeaders belongs to a fresh user with no TOTP yet, so this token has
      // full access and the request reaches the code check.
      const totpRequest = new TotpRequest(request, loggedHeaders);
      const setupResponse = await totpRequest.setup();
      expect(setupResponse.status()).toBe(200);

      const response = await totpRequest.verify('000000');

      expect(
        response.status(),
        `a wrong TOTP code expected 400, got ${response.status()}`,
      ).toBe(400);
      expect.soft((await response.json()).error).toBe('Invalid TOTP');
    },
  );

  /**
   * Once a user is enrolled, `POST /users/login` answers **200** with
   * `requires_totp: true` and a provisional token that is good for one thing only:
   * the `access_token` argument of the second login leg (§23). Every authenticated
   * endpoint refuses it — correct scoping, not a defect.
   *
   * A *correct* code is used here deliberately: it still 401s, proving the token is
   * rejected before the code is examined, so no code could rescue it.
   *
   * The trap is on our side. `getAuthorizationHeader()` reads `access_token` off any
   * 200 without checking `requires_totp`, so calling it for a TOTP-enabled user
   * silently returns a provisional token that fails on whatever it is later used
   * for, far from the cause. This test is what pins that.
   */
  test(
    'refuses the post-enrolment challenge token even with a correct code',
    { tag: ['@api', '@auth'] },
    async ({ request, usersRequest }) => {
      const { email, password, secret } = await registerUserWithTotpEnabled(
        request,
        usersRequest,
      );
      const challengeHeaders = await getAuthorizationHeader(request, {
        email,
        password,
      });
      const totpRequest = new TotpRequest(request, challengeHeaders);

      const response = await totpRequest.verify(generateTotpCode(secret));

      expect(
        response.status(),
        `the challenge token must be refused, got ${response.status()}`,
      ).toBe(401);
      expect
        .soft((await response.json()).message)
        .toBe('Unauthorized token usage');
    },
  );

  test(
    'rejects verification without a token',
    { tag: ['@api', '@auth'] },
    async ({ request }) => {
      const totpRequest = new TotpRequest(request);

      const response = await totpRequest.verify('000000');

      expect(response.status()).toBe(401);
    },
  );
});
