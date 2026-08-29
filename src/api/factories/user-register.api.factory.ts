import { APIResponse } from '@playwright/test';
import { UserRegisterPayload } from '@src/api/models/user.api.model';
import { UsersRequest } from '@src/api/requests/users.request';
import { expect } from '@src/fixtures/merge.fixture';
import { prepareRandomUser } from '@src/ui/factories/user.factory';

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
