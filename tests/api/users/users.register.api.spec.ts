import {
  invalidUserCases,
  optionalUserFields,
} from '@src/api/data/invalid-user-payloads';
import { nonStandardUserCases } from '@src/api/data/non-standard-inputs';
import { prepareRandomUserPayload } from '@src/api/factories/user-register.api.factory';
import { expect, test } from '@src/fixtures/merge.fixture';

/**
 * The register-validation table. Every case starts from a valid
 * `prepareRandomUserPayload()` and changes exactly one thing, so a failure names
 * the rule that broke.
 *
 * The random password matters: the API runs new passwords against a breached-password
 * list ("The given password has appeared in a data leak"), so a hard-coded literal
 * would eventually start failing every case for the wrong reason.
 */
test.describe('API users — register validation', () => {
  for (const invalidCase of invalidUserCases) {
    test(
      `rejects register with ${invalidCase.label}`,
      { tag: ['@api', '@auth', '@register'] },
      async ({ usersRequest }) => {
        const payload = invalidCase.build(prepareRandomUserPayload());

        const response = await usersRequest.post(payload);

        expect(
          response.status(),
          `register with ${invalidCase.label} expected 422, got ${response.status()}`,
        ).toBe(422);

        const body = await response.json();
        expect.soft(body[invalidCase.field]).toBeDefined();
        expect
          .soft(String(body[invalidCase.field]))
          .toContain(invalidCase.expectedMessage);
      },
    );
  }

  for (const nonStandardCase of nonStandardUserCases) {
    test(
      `registers a user with ${nonStandardCase.label}`,
      { tag: ['@api', '@auth', '@register'] },
      async ({ usersRequest }) => {
        const payload = nonStandardCase.build(prepareRandomUserPayload());

        const response = await usersRequest.post(payload);

        expect(
          response.status(),
          `register with ${nonStandardCase.label} expected 201, got ${response.status()}`,
        ).toBe(201);

        const body = await response.json();
        expect.soft(body.first_name).toBe(payload.first_name);
        expect.soft(body.last_name).toBe(payload.last_name);
      },
    );
  }

  // The UI marks these required; the API does not. Registering without them is
  // accepted and the address is stored as null. See PRODUCT_EXPLORATION.md.
  for (const field of optionalUserFields) {
    test(
      `registers a user without the optional ${field} field`,
      { tag: ['@api', '@auth', '@register'] },
      async ({ usersRequest }) => {
        const payload = { ...prepareRandomUserPayload(), [field]: undefined };

        const response = await usersRequest.post(payload);

        expect(
          response.status(),
          `register without ${field} expected 201, got ${response.status()}`,
        ).toBe(201);
      },
    );
  }

  test(
    'rejects a duplicate email with 409',
    { tag: ['@api', '@auth', '@register'] },
    async ({ usersRequest }) => {
      const payload = prepareRandomUserPayload();
      const firstResponse = await usersRequest.post(payload);
      expect(firstResponse.status()).toBe(201);

      const duplicateResponse = await usersRequest.post(payload);

      expect(
        duplicateResponse.status(),
        `duplicate register expected 409, got ${duplicateResponse.status()}`,
      ).toBe(409);

      const body = await duplicateResponse.json();
      expect.soft(String(body.email)).toContain('already exists');
    },
  );

  /**
   * Pins a real defect, not intended behaviour: `email` is checked for presence but
   * never for format, so "not-an-email" registers happily and the account is
   * unreachable by any password-reset mail. This test asserts the *observed* 201 so
   * the suite stays green while the bug stands — if it starts failing with a 422,
   * the bug has been fixed and this test should flip to expecting the rejection.
   * Recorded in PRODUCT_EXPLORATION.md.
   */
  test(
    'accepts a malformed email — no format validation (known defect)',
    { tag: ['@api', '@auth', '@register'] },
    async ({ usersRequest }) => {
      const valid = prepareRandomUserPayload();
      // Strip the "@" to malform it while keeping the random local part, so the
      // address stays unique — a fixed literal would 409 as a duplicate on the
      // second run rather than proving anything about format validation.
      const payload = { ...valid, email: valid.email.replace('@', '.at.') };

      const response = await usersRequest.post(payload);

      expect(
        response.status(),
        `malformed email expected the known-defect 201, got ${response.status()} — if this is now 422 the defect is fixed, see PRODUCT_EXPLORATION.md`,
      ).toBe(201);
    },
  );
});
