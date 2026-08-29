import { APIRequestContext, APIResponse } from '@playwright/test';
import { Headers } from '@src/api/models/headers.api.model';
import { BaseRequest } from '@src/api/requests/base.request';
import { apiUrls } from '@src/api/utils/api.util';

export class BrandsRequest extends BaseRequest {
  constructor(
    protected request: APIRequestContext,
    headers?: Headers,
  ) {
    super(request, apiUrls.BRANDS, headers);
  }

  async search(query: string): Promise<APIResponse> {
    return await this.request.get(apiUrls.BRANDS_SEARCH, {
      headers: this.headers,
      params: { q: query },
    });
  }
}
