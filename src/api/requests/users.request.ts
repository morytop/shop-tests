import { APIRequestContext, APIResponse } from '@playwright/test';
import { Headers } from '@src/api/models/headers.api.model';
import { UserRegisterPayload } from '@src/api/models/user.api.model';
import { BaseRequest } from '@src/api/requests/base.request';
import { apiUrls } from '@src/api/utils/api.util';

export class UsersRequest extends BaseRequest {
  constructor(
    protected request: APIRequestContext,
    protected headers?: Headers,
  ) {
    super(request, apiUrls.registerUrl, headers);
  }

  async post(data: UserRegisterPayload): Promise<APIResponse> {
    return await this.request.post(this.url, {
      headers: this.headers,
      data,
    });
  }
}
