import { UsersRequest } from '@src/api/requests/users.request';
import { expect, test } from '@src/merge.fixture';

/**
 * The authenticated session lifecycle: who am I, refresh, log out.
 *
 * Both `refresh` and `logout` invalidate the token that authorised them, so each
 * test here mints its own via `usersRequestLogged` and never shares one — the same
 * constraint `logged-session.fixture.ts` works around for the UI suite.
 */
test.describe('API users — session', () => {
  test(
    'returns the authenticated user from /users/me',
    { tag: ['@api', '@smoke', '@auth'] },
    async ({ usersRequestLogged, loggedApiUser }) => {
      const response = await usersRequestLogged.me();

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect.soft(body.email).toBe(loggedApiUser.email);
      expect.soft(body.first_name).toBe(loggedApiUser.first_name);
      expect.soft(body.totp_enabled).toBe(false);
      expect.soft(body.id).toBeTruthy();
    },
  );

  test(
    'rejects /users/me without a token',
    { tag: ['@api', '@auth'] },
    async ({ usersRequest }) => {
      const response = await usersRequest.me();

      expect(response.status()).toBe(401);
    },
  );

  test(
    'rejects /users/me with a malformed token',
    { tag: ['@api', '@auth'] },
    async ({ request }) => {
      const usersRequest = new UsersRequest(request, {
        Authorization: 'Bearer not-a-real-token',
      });

      const response = await usersRequest.me();

      expect(response.status()).toBe(401);
    },
  );

  /**
   * Refresh rotates the token: the returned one works and the one that bought it
   * stops working. Worth pinning — code that refreshes and keeps using the old
   * token would fail intermittently rather than obviously.
   */
  test(
    'refresh issues a working token and invalidates the previous one',
    { tag: ['@api', '@auth'] },
    async ({ request, usersRequestLogged, loggedApiUser }) => {
      const refreshResponse = await usersRequestLogged.refresh();
      expect(refreshResponse.status()).toBe(200);

      const { access_token: refreshedToken } = await refreshResponse.json();
      expect(refreshedToken).toBeTruthy();

      const refreshedUsersRequest = new UsersRequest(request, {
        Authorization: `Bearer ${refreshedToken}`,
      });
      const meWithRefreshed = await refreshedUsersRequest.me();
      expect(meWithRefreshed.status()).toBe(200);
      expect((await meWithRefreshed.json()).email).toBe(loggedApiUser.email);

      const meWithPrevious = await usersRequestLogged.me();
      expect(
        meWithPrevious.status(),
        `the pre-refresh token must stop working, got ${meWithPrevious.status()}`,
      ).toBe(401);
    },
  );

  test(
    'logout invalidates the token it was called with',
    { tag: ['@api', '@auth'] },
    async ({ usersRequestLogged }) => {
      const meBeforeLogout = await usersRequestLogged.me();
      expect(meBeforeLogout.status()).toBe(200);

      const logoutResponse = await usersRequestLogged.logout();

      expect(logoutResponse.status()).toBe(200);
      expect
        .soft((await logoutResponse.json()).message)
        .toContain('Successfully logged out');

      const meAfterLogout = await usersRequestLogged.me();
      expect(
        meAfterLogout.status(),
        `the token must not survive logout, got ${meAfterLogout.status()}`,
      ).toBe(401);
    },
  );

  test(
    'rejects logout without a token',
    { tag: ['@api', '@auth'] },
    async ({ usersRequest }) => {
      const response = await usersRequest.logout();

      expect(response.status()).toBe(401);
    },
  );
});
