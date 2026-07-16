import { APIRequestContext, APIResponse } from '@playwright/test';
import { Headers } from '@src/api/models/headers.api.model';
import { BaseRequest } from '@src/api/requests/base.request';
import { apiUrls } from '@src/api/utils/api.util';

/**
 * TOTP enrolment endpoints. Both require a per-user Bearer header, which is why
 * this request object is constructed with credentials by the factory rather than
 * injected header-less through `request-object.fixture.ts`.
 *
 * `BaseRequest.url` is unused here — the two endpoints are addressed explicitly.
 */
export class TotpRequest extends BaseRequest {
  constructor(
    protected request: APIRequestContext,
    protected headers?: Headers,
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
