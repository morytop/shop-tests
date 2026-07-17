import { faker } from '@faker-js/faker';
import { getAuthorizationHeader } from '@src/api/factories/authorization-header.api.factory';
import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import { UsersRequest } from '@src/api/requests/users.request';
import { expect, test } from '@src/merge.fixture';
import { prepareRandomPassword } from '@src/ui/factories/user.factory';

/**
 * Account mutations: password change, profile update, deletion, password reset.
 *
 * Every test mutates its own `loggedApiUser` — a throwaway registered for that test
 * alone. None of this may run against `testUser1`/`customer@` or the `@logged`
 * session user (CLAUDE.md): changing a shared account's password would break every
 * other spec in the run.
 */
test.describe('API users — account', () => {
  test(
    'changes the password and makes the new one authoritative',
    { tag: ['@api', '@smoke', '@auth'] },
    async ({ usersRequestLogged, loginRequest, loggedApiUser }) => {
      const newPassword = prepareRandomPassword();

      const response = await usersRequestLogged.changePassword({
        current_password: loggedApiUser.password,
        new_password: newPassword,
        new_password_confirmation: newPassword,
      });

      expect(response.status()).toBe(200);
      expect.soft((await response.json()).success).toBe(true);

      const oldPasswordLogin = await loginRequest.post({
        email: loggedApiUser.email,
        password: loggedApiUser.password,
      });
      expect(
        oldPasswordLogin.status(),
        `the old password must stop working, got ${oldPasswordLogin.status()}`,
      ).toBe(401);

      const newPasswordLogin = await loginRequest.post({
        email: loggedApiUser.email,
        password: newPassword,
      });
      expect(newPasswordLogin.status()).toBe(200);
    },
  );

  // 400 with a `success: false` body, not the 401/422 the shape of the endpoint
  // might suggest.
  test(
    'rejects a password change with the wrong current password',
    { tag: ['@api', '@auth'] },
    async ({ usersRequestLogged, loggedApiUser }) => {
      const newPassword = prepareRandomPassword();

      const response = await usersRequestLogged.changePassword({
        current_password: `${loggedApiUser.password}-wrong`,
        new_password: newPassword,
        new_password_confirmation: newPassword,
      });

      expect(
        response.status(),
        `wrong current password expected 400, got ${response.status()}`,
      ).toBe(400);

      const body = await response.json();
      expect.soft(body.success).toBe(false);
      expect.soft(body.message).toContain('current password does not matches');
    },
  );

  test(
    'rejects a password change whose confirmation does not match',
    { tag: ['@api', '@auth'] },
    async ({ usersRequestLogged, loggedApiUser }) => {
      const response = await usersRequestLogged.changePassword({
        current_password: loggedApiUser.password,
        new_password: prepareRandomPassword(),
        new_password_confirmation: prepareRandomPassword(),
      });

      expect(
        response.status(),
        `mismatched confirmation expected 422, got ${response.status()}`,
      ).toBe(422);

      const body = await response.json();
      expect
        .soft(body.errors.new_password.join(' '))
        .toContain('confirmation does not match');
    },
  );

  test(
    'rejects a password change without a token',
    { tag: ['@api', '@auth'] },
    async ({ usersRequest, loggedApiUser }) => {
      const newPassword = prepareRandomPassword();

      const response = await usersRequest.changePassword({
        current_password: loggedApiUser.password,
        new_password: newPassword,
        new_password_confirmation: newPassword,
      });

      expect(response.status()).toBe(401);
    },
  );

  test(
    'updates the own profile via PUT and PATCH',
    { tag: ['@api', '@auth'] },
    async ({ usersRequestLogged, loggedApiUser }) => {
      const { id } = await (await usersRequestLogged.me()).json();
      const replacedName = faker.person.firstName();

      const putResponse = await usersRequestLogged.put(
        { ...loggedApiUser, first_name: replacedName },
        id,
      );
      expect(putResponse.status()).toBe(200);
      expect.soft((await putResponse.json()).success).toBe(true);

      const patchedName = faker.person.firstName();
      const patchResponse = await usersRequestLogged.patch(
        { first_name: patchedName },
        id,
      );
      expect(patchResponse.status()).toBe(200);

      const profile = await (await usersRequestLogged.me()).json();
      expect(profile.first_name).toBe(patchedName);
      expect.soft(profile.last_name).toBe(loggedApiUser.last_name);
    },
  );

  test(
    'rejects a profile update without a token',
    { tag: ['@api', '@auth'] },
    async ({ usersRequest, usersRequestLogged }) => {
      const { id } = await (await usersRequestLogged.me()).json();

      const response = await usersRequest.put(
        { first_name: faker.person.firstName() },
        id,
      );

      expect(response.status()).toBe(401);
    },
  );

  test(
    "rejects updating another user's profile with 403",
    { tag: ['@api', '@auth'] },
    async ({ request, usersRequest, usersRequestLogged }) => {
      const otherUser = await registerUserWithApi(usersRequest);
      const otherHeaders = await getAuthorizationHeader(request, {
        email: otherUser.email,
        password: otherUser.password,
      });
      const otherUsersRequest = new UsersRequest(request, otherHeaders);
      const { id: otherId } = await (await otherUsersRequest.me()).json();

      const response = await usersRequestLogged.patch(
        { first_name: 'Intruder' },
        otherId,
      );

      expect(
        response.status(),
        `patching another user must be forbidden, got ${response.status()}`,
      ).toBe(403);
      expect
        .soft((await response.json()).error)
        .toContain('only update your own data');
    },
  );

  /**
   * A customer cannot delete their own account: `DELETE /users/{ownId}` is 403 and
   * the account still logs in afterwards. Deletion is admin-only, and admin writes
   * are out of scope — so an API-registered throwaway user is **permanent**, and
   * every spec that registers one adds a row to the shared database for good. That
   * is the cost of the register-per-test fixture, not something a cleanup step can
   * undo.
   */
  test(
    'refuses to delete the own account (deletion is admin-only)',
    { tag: ['@api', '@auth'] },
    async ({ usersRequestLogged, loginRequest, loggedApiUser }) => {
      const { id } = await (await usersRequestLogged.me()).json();

      const response = await usersRequestLogged.delete(id);

      expect(
        response.status(),
        `self-delete expected 403, got ${response.status()}`,
      ).toBe(403);

      const loginAfterDelete = await loginRequest.post({
        email: loggedApiUser.email,
        password: loggedApiUser.password,
      });
      expect(
        loginAfterDelete.status(),
        'the account must still exist after a refused delete',
      ).toBe(200);
    },
  );

  test(
    'accepts a password reset request for an existing account',
    { tag: ['@api', '@auth'] },
    async ({ usersRequest, loggedApiUser }) => {
      const response = await usersRequest.forgotPassword(loggedApiUser.email);

      // The 200 is all that is observable from here — no mail is reachable from the
      // suite. Note this call is destructive despite its name: it does not send a
      // link, it overwrites the account's password with "welcome02" on the spot
      // (§2). Safe only because loggedApiUser is a throwaway registered for this
      // test alone — never point it at an account another test still needs.
      expect(response.status()).toBe(200);
      expect.soft((await response.json()).success).toBe(true);
    },
  );

  /**
   * An unknown address is rejected outright where a registered one answers
   * `200 {success: true}`, which makes the endpoint an unauthenticated oracle for
   * "is this email registered?" — the exact user-enumeration leak a reset endpoint
   * is normally written to avoid. Recorded as a security smell in
   * PRODUCT_EXPLORATION.md; asserted here so a fix has to come past this test.
   */
  test(
    'reveals that an email is unregistered via 422 (enumeration leak)',
    { tag: ['@api', '@auth'] },
    async ({ usersRequest }) => {
      const response = await usersRequest.forgotPassword(
        faker.internet.email(),
      );

      expect(
        response.status(),
        `unknown email expected the observed 422, got ${response.status()}`,
      ).toBe(422);

      const body = await response.json();
      expect
        .soft(body.errors.email.join(' '))
        .toContain('The selected email is invalid');
    },
  );
});
