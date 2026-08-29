import { APIRequestContext, APIResponse } from '@playwright/test';
import { Headers } from '@src/api/models/headers.api.model';
import { BaseRequest } from '@src/api/requests/base.request';
import { apiUrls } from '@src/api/utils/api.util';

export class TotpRequest extends BaseRequest {
  constructor(
    protected request: APIRequestContext,
    headers?: Headers,
  ) {
    super(request, apiUrls.TOTP_SETUP, headers);
  }

  /** Mints and persists a NEW secret for the caller on every invocation. */
  async setup(): Promise<APIResponse> {
    return await this.request.post(apiUrls.TOTP_SETUP, {
      headers: this.headers,
      data: {},
    });
  }

  /** Confirms a code and flips `totp_enabled` on the account. */
  async verify(totp: string): Promise<APIResponse> {
    return await this.request.post(apiUrls.TOTP_VERIFY, {
      headers: this.headers,
      data: { totp },
    });
  }
}
