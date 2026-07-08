import { APIRequestContext } from '@playwright/test';
import { Headers } from '@src/api/models/headers.api.model';
import { LoginData } from '@src/api/models/login.api.model';
import { LoginRequest } from '@src/api/requests/login.request';
import { testUser1 } from '@src/ui/test-data/user.data';

// Log in (as the seeded testUser1 by default, or any given credentials) and return
// a Bearer header ready to attach to authenticated requests.
export async function getAuthorizationHeader(
  request: APIRequestContext,
  credentials: LoginData = testUser1,
): Promise<Headers> {
  const loginRequest = new LoginRequest(request);
  const response = await loginRequest.post(credentials);
  const body = await response.json();

  return {
    Authorization: `Bearer ${body.access_token}`,
  };
}
