import { APIRequestContext } from '@playwright/test';
import { LoginData } from '@src/api/models/login.api.model';
import { LoginRequest } from '@src/api/requests/login.request';
import { expect } from '@src/fixtures/merge.fixture';

export async function getAccessTokenWithApi(
  request: APIRequestContext,
  credentials: LoginData,
): Promise<string> {
  const loginRequest = new LoginRequest(request);
  let response = await loginRequest.post(credentials);
  for (let attempt = 1; response.status() >= 500 && attempt < 3; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    response = await loginRequest.post(credentials);
  }
  expect(
    response.status(),
    `login expected 200, got ${response.status()}`,
  ).toBe(200);
  const { access_token: accessToken } = await response.json();

  return accessToken;
}
