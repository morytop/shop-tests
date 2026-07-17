import { APIRequestContext, APIResponse } from '@playwright/test';
import { Headers } from '@src/api/models/headers.api.model';
import { PostcodeLookupParams } from '@src/api/models/postcode.api.model';
import { BaseRequest } from '@src/api/requests/base.request';
import { apiUrls } from '@src/api/utils/api.util';

/**
 * `GET /postcode-lookup` — the geocoder behind the checkout billing step. The
 * whole surface is one read, so `lookup()` is just a typed `get()`; the negative
 * specs call the inherited `get()` directly to send a deliberately partial query.
 */
export class PostcodeRequest extends BaseRequest {
  constructor(
    protected request: APIRequestContext,
    headers?: Headers,
  ) {
    super(request, apiUrls.POSTCODE_LOOKUP, headers);
  }

  async lookup(params: PostcodeLookupParams): Promise<APIResponse> {
    return await super.get(params);
  }
}
