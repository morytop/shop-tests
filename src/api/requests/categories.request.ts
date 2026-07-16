import { APIRequestContext, APIResponse } from '@playwright/test';
import { Headers } from '@src/api/models/headers.api.model';
import { BaseRequest } from '@src/api/requests/base.request';
import { apiUrls } from '@src/api/utils/api.util';

/** `/categories` — generics for list/by-id, plus the tree and search reads. */
export class CategoriesRequest extends BaseRequest {
  constructor(
    protected request: APIRequestContext,
    protected headers?: Headers,
  ) {
    super(request, apiUrls.CATEGORIES, headers);
  }

  async search(query: string): Promise<APIResponse> {
    return await this.request.get(apiUrls.CATEGORIES_SEARCH, {
      headers: this.headers,
      params: { q: query },
    });
  }

  async getTree(): Promise<APIResponse> {
    return await this.request.get(apiUrls.CATEGORIES_TREE, {
      headers: this.headers,
    });
  }

  async getTreeOne(categoryId: string): Promise<APIResponse> {
    return await this.request.get(`${apiUrls.CATEGORIES_TREE}/${categoryId}`, {
      headers: this.headers,
    });
  }
}
