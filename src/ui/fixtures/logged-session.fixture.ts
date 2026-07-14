import { BASE_URL } from '@config/env.config';
import { SESSION_USER, STORAGE_STATE } from '@config/storage.config';
import { request as apiRequest, test as baseTest } from '@playwright/test';
import { LoginData } from '@src/api/models/login.api.model';
import { LoginRequest } from '@src/api/requests/login.request';
import * as fs from 'fs';

/**
 * Keeps the @logged session valid for the whole run. The API mints JWTs with a
 * 5-minute TTL, so the session `tests/setup/login.setup.ts` saves goes stale
 * mid-run — any @logged spec scheduled later than that starts silently logged
 * out. Instead of trusting the saved token, re-log-in via the API as the
 * setup-registered user (credentials persisted alongside the session) right
 * before each @logged test and inject the fresh token as an in-memory
 * storageState. Projects that configure no storageState (chromium, setup) pass
 * through untouched.
 *
 * A dedicated request context is used because the built-in `request` fixture
 * itself depends on `storageState` — using it here would be circular.
 */
export const loggedSessionTest = baseTest.extend({
  storageState: async ({ storageState }, use) => {
    if (storageState !== STORAGE_STATE) {
      await use(storageState);
      return;
    }

    const credentials: LoginData = JSON.parse(
      fs.readFileSync(SESSION_USER, 'utf-8'),
    );
    const context = await apiRequest.newContext();
    // The shared prod backend intermittently 500s under parallel load (§33), so
    // a transient 5xx is retried before giving up.
    const loginRequest = new LoginRequest(context);
    let response = await loginRequest.post(credentials);
    for (let attempt = 1; response.status() >= 500 && attempt < 3; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
      response = await loginRequest.post(credentials);
    }
    const { access_token: accessToken } = await response.json();
    await context.dispose();

    await use({
      cookies: [],
      origins: [
        {
          origin: new URL(BASE_URL).origin,
          localStorage: [{ name: 'auth-token', value: accessToken }],
        },
      ],
    });
  },
});
