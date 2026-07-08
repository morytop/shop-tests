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
export async function registerUserWithApi(
  usersRequest: UsersRequest,
): Promise<UserRegisterPayload> {
  const payload = prepareRandomUserPayload();

  const response: APIResponse = await usersRequest.post(payload);
  expect(
    response.status(),
    `register expected 201, got ${response.status()}`,
  ).toBe(201);

  return payload;
}
