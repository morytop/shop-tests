import { APIRequestContext } from '@playwright/test';
import { getAuthorizationHeader } from '@src/api/factories/authorization-header.api.factory';
import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import {
  TotpEnabledUser,
  TotpSetupResponse,
} from '@src/api/models/totp.api.model';
import { TotpRequest } from '@src/api/requests/totp.request';
import { UsersRequest } from '@src/api/requests/users.request';
import { expect } from '@src/merge.fixture';
import { generateTotpCode } from '@src/ui/utils/totp.util';

/**
 * Register a throwaway user and enrol it in TOTP, entirely over the API: register →
 * log in → `/totp/setup` → `/totp/verify`. Returns the credentials plus the secret,
 * so a spec can derive a fresh code at submit time.
 *
 * Building the precondition here (rather than by driving the profile page) keeps the
 * login specs failing only on the behaviour they assert. Assertions in an API factory
 * are the sanctioned exception to the "no expect outside specs" rule, so callers fail
 * fast on a broken arrange.
 *
 * Never point this at a shared account: the seeded `customer@`/`admin@` users are
 * refused TOTP setup (403), and enabling TOTP is a permanent mutation.
 */
export async function registerUserWithTotpEnabled(
  request: APIRequestContext,
  usersRequest: UsersRequest,
): Promise<TotpEnabledUser> {
  const { email, password } = await registerUserWithApi(usersRequest);

  const headers = await getAuthorizationHeader(request, { email, password });
  const totpRequest = new TotpRequest(request, headers);

  const setupResponse = await totpRequest.setup();
  expect(
    setupResponse.status(),
    `totp setup expected 200, got ${setupResponse.status()}`,
  ).toBe(200);
  const { secret }: TotpSetupResponse = await setupResponse.json();

  const verifyResponse = await totpRequest.verify(generateTotpCode(secret));
  expect(
    verifyResponse.status(),
    `totp verify expected 200, got ${verifyResponse.status()}`,
  ).toBe(200);

  return { email, password, secret };
}
