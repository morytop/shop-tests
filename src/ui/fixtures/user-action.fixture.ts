import { BASE_URL } from '@config/env.config';
import { request as apiRequest, test as baseTest } from '@playwright/test';
import { getAccessTokenWithApi } from '@src/api/factories/login.api.factory';
import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import { LoginData } from '@src/api/models/login.api.model';
import { UserRegisterPayload } from '@src/api/models/user.api.model';
import { UsersRequest } from '@src/api/requests/users.request';

export interface UserActions {
  loginAsFreshUser: () => Promise<UserRegisterPayload>;
  loginAs: (credentials: LoginData) => Promise<void>;
}

export interface UserWorkerFixtures {
  workerUser: UserRegisterPayload;
}

/**
 * The arrange step the account-area specs share: start the test as a signed-in
 * throwaway user. Sign-in is API token injection (the proven
 * `logged-session.fixture.ts` mechanics), not the login form — the form keeps
 * its dedicated coverage in `login.spec.ts`. `loginAs` mints a fresh token per
 * call (the API's JWTs expire after 5 minutes) and stores it once in the
 * origin's localStorage, exactly as a real login leaves it; the caller then
 * navigates to its target page itself.
 *
 * Which fixture to use (§3 — every user the API registers is permanent, so both
 * stay opt-in per test, exactly like the inline block they replace):
 *
 * - `loginAsFreshUser()` — registers a new user and signs it in. Required for
 *   any test that mutates the account (password/profile/TOTP changes) or files
 *   per-user data (favorites, messages, invoices, orders).
 * - `workerUser` + `loginAs(workerUser)` — one registration per worker, shared
 *   across that worker's tests. ONLY for tests that provably persist nothing
 *   and never submit a wrong password (3 failed logins lock an account
 *   permanently): a later test in the same worker must find the account exactly
 *   as registered.
 */
export const userActionTest = baseTest.extend<UserActions, UserWorkerFixtures>({
  // Worker scope cannot depend on the per-test `request` fixture, so the
  // registration runs through its own short-lived request context.
  workerUser: [
    async ({}, use): Promise<void> => {
      const context = await apiRequest.newContext();
      let user: UserRegisterPayload;
      try {
        user = await registerUserWithApi(new UsersRequest(context));
      } finally {
        await context.dispose();
      }
      await use(user);
    },
    { scope: 'worker' },
  ],
  loginAs: async ({ page, request }, use) => {
    await use(async (credentials: LoginData): Promise<void> => {
      const accessToken = await getAccessTokenWithApi(request, {
        email: credentials.email,
        password: credentials.password,
      });
      // The token is stored ONCE, via a page on the app's origin — localStorage
      // then persists across the test's later navigations while the app stays
      // free to clear it. An addInitScript would re-inject on every document
      // load and silently resurrect sessions the app itself just ended (the
      // post-password-change auto-logout navigates a full document and came
      // back logged in).
      await page.goto(BASE_URL);
      await page.evaluate((token) => {
        window.localStorage.setItem('auth-token', token);
      }, accessToken);
    });
  },
  loginAsFreshUser: async ({ loginAs, request }, use) => {
    await use(async (): Promise<UserRegisterPayload> => {
      const user = await registerUserWithApi(new UsersRequest(request));
      await loginAs(user);

      return user;
    });
  },
});
