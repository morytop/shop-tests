import { APIRequestContext } from '@playwright/test';
import { LoginData } from '@src/api/models/login.api.model';
import { LoginRequest } from '@src/api/requests/login.request';
import { expect } from '@src/fixtures/merge.fixture';

// Log in over the API and return the raw JWT access token, for callers that
// inject it into the browser's localStorage rather than into request headers
// (`getAuthorizationHeader()` covers the header case). Assertion here is the
// sanctioned api-layer exception to the "no expect outside specs" rule, so a
// bad login fails fast with the status instead of an undefined-token symptom.
//
// The shared prod backend intermittently 500s under parallel load (§33), so a
// transient 5xx is retried before giving up. Tokens expire after 5 minutes and
// must never be shared or persisted across tests.
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
