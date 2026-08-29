import { APIRequestContext } from '@playwright/test';
import { getAuthorizationHeader } from '@src/api/factories/authorization-header.api.factory';
import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import {
  TotpEnabledUser,
  TotpSetupResponse,
} from '@src/api/models/totp.api.model';
import { TotpRequest } from '@src/api/requests/totp.request';
import { UsersRequest } from '@src/api/requests/users.request';
import { expect } from '@src/fixtures/merge.fixture';
import { generateTotpCode } from '@src/ui/utils/totp.util';

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
