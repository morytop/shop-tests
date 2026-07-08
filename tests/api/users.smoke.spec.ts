import { getAuthorizationHeader } from '@src/api/factories/authorization-header.api.factory';
import { prepareRandomUserPayload } from '@src/api/factories/user-register.api.factory';
import { expect, test } from '@src/merge.fixture';

// Seed API spec: exercises the register + login endpoints the auth setup depends on,
// proving the request objects, factories and auth-header helper wire up end to end.
test.describe('API users — register and login', () => {
  test(
    'registers a new user and logs in for an access token',
    { tag: ['@api', '@smoke'] },
    async ({ usersRequest, loginRequest }) => {
      const payload = prepareRandomUserPayload();

      const registerResponse = await usersRequest.post(payload);
      expect(registerResponse.status()).toBe(201);

      const loginResponse = await loginRequest.post({
        email: payload.email,
        password: payload.password,
      });
      expect(loginResponse.status()).toBe(200);

      const body = await loginResponse.json();
      expect(body.access_token).toBeTruthy();
    },
  );

  test(
    'authorization-header factory returns a usable Bearer token',
    { tag: ['@api', '@smoke'] },
    async ({ request }) => {
      const headers = await getAuthorizationHeader(request);

      expect(headers.Authorization).toMatch(/^Bearer .+/);
    },
  );
});
