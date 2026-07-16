import { APIRequestContext, APIResponse } from '@playwright/test';
import { Headers } from '@src/api/models/headers.api.model';
import {
  ChangePasswordPayload,
  InvalidUserRegisterPayload,
  UserRegisterPayload,
} from '@src/api/models/user.api.model';
import { BaseRequest } from '@src/api/requests/base.request';
import { apiUrls } from '@src/api/utils/api.util';

/**
 * The `/users` resource. The collection root is `/users`, so the inherited
 * generics cover the admin list (`get()`) and the per-id verbs
 * (`getOne`/`put`/`patch`/`delete` on `/users/{id}`); the auth-flow endpoints
 * that hang off `/users/*` get explicit methods. `post()` is the one deliberate
 * irregular: it registers (`/users/register`), the object's original role and
 * what every existing call site expects.
 */
export class UsersRequest extends BaseRequest {
  constructor(
    protected request: APIRequestContext,
    protected headers?: Headers,
  ) {
    super(request, apiUrls.USERS, headers);
  }

  async post(
    data: UserRegisterPayload | InvalidUserRegisterPayload,
  ): Promise<APIResponse> {
    return await this.request.post(apiUrls.REGISTER, {
      headers: this.headers,
      data,
    });
  }

  async me(): Promise<APIResponse> {
    return await this.request.get(apiUrls.USERS_ME, {
      headers: this.headers,
    });
  }

  async refresh(): Promise<APIResponse> {
    return await this.request.get(apiUrls.USERS_REFRESH, {
      headers: this.headers,
    });
  }

  async logout(): Promise<APIResponse> {
    return await this.request.get(apiUrls.USERS_LOGOUT, {
      headers: this.headers,
    });
  }

  async changePassword(data: ChangePasswordPayload): Promise<APIResponse> {
    return await this.request.post(apiUrls.CHANGE_PASSWORD, {
      headers: this.headers,
      data,
    });
  }

  async forgotPassword(email: string): Promise<APIResponse> {
    return await this.request.post(apiUrls.FORGOT_PASSWORD, {
      headers: this.headers,
      data: { email },
    });
  }

  async search(query: string): Promise<APIResponse> {
    return await this.request.get(apiUrls.USERS_SEARCH, {
      headers: this.headers,
      params: { q: query },
    });
  }
}
