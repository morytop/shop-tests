import { APIResponse } from '@playwright/test';
import { UserRegisterPayload } from '@src/api/models/user.api.model';
import { UsersRequest } from '@src/api/requests/users.request';
import { expect } from '@src/merge.fixture';
import { prepareRandomUser } from '@src/ui/factories/user.factory';

// Remap the UI RegisterUser (the single source of random user data) to the API's
// snake_case wire payload, so both layers register the same shape of user.
export function prepareRandomUserPayload(): UserRegisterPayload {
  const user = prepareRandomUser();

  return {
    first_name: user.firstName,
    last_name: user.lastName,
    dob: user.dateOfBirth,
    phone: user.phone,
    address: {
      street: user.street,
      house_number: user.houseNumber,
      city: user.city,
      state: user.state,
      country: user.country,
      postal_code: user.postcode,
    },
    email: user.email,
    password: user.password,
  };
}

// Register a fresh user via the API and return the payload used (its email/password
// double as login credentials). Assertion here is the sanctioned api-layer exception
// to the "no expect outside specs" rule, so setup/callers fail fast on a bad register.
//
// The shared prod backend rejects a register non-deterministically under parallel
// load (§33): intermittent 500s, and occasional 422s when the faker email collides
// with one of the many accounts other runs have accumulated on the shared DB. Both
// heal with a fresh payload, so any non-201 is retried a couple of times before
// failing (a systematically broken payload still fails, just after 3 attempts).
export async function registerUserWithApi(
  usersRequest: UsersRequest,
): Promise<UserRegisterPayload> {
  const maxAttempts = 3;

  // A fresh payload per attempt: a 500 can land after the user row was already
  // written, in which case re-posting the same email would 422 instead of 201.
  let payload = prepareRandomUserPayload();
  let response: APIResponse = await usersRequest.post(payload);
  for (
    let attempt = 1;
    response.status() !== 201 && attempt < maxAttempts;
    attempt++
  ) {
    await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    payload = prepareRandomUserPayload();
    response = await usersRequest.post(payload);
  }
  expect(
    response.status(),
    `register expected 201, got ${response.status()}`,
  ).toBe(201);

  return payload;
}
