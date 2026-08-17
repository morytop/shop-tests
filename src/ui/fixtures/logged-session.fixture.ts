import { BASE_URL } from '@config/env.config';
import { SESSION_USER, STORAGE_STATE } from '@config/storage.config';
import { request as apiRequest, test as baseTest } from '@playwright/test';
import { getAccessTokenWithApi } from '@src/api/factories/login.api.factory';
import { LoginData } from '@src/api/models/login.api.model';
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
    let accessToken: string;
    try {
      accessToken = await getAccessTokenWithApi(context, credentials);
    } finally {
      await context.dispose();
    }

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
