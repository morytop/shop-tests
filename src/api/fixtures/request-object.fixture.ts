import { test as baseTest } from '@playwright/test';
import { LoginRequest } from '@src/api/requests/login.request';
import { UsersRequest } from '@src/api/requests/users.request';

export interface Requests {
  usersRequest: UsersRequest;
  loginRequest: LoginRequest;
}

export const requestObjectTest = baseTest.extend<Requests>({
  usersRequest: async ({ request }, use) => {
    await use(new UsersRequest(request));
  },
  loginRequest: async ({ request }, use) => {
    await use(new LoginRequest(request));
  },
});
