import { APIRequestContext, APIResponse } from '@playwright/test';
import { FavoritePayload } from '@src/api/models/favorite.api.model';
import { Headers } from '@src/api/models/headers.api.model';
import { BaseRequest } from '@src/api/requests/base.request';
import { apiUrls } from '@src/api/utils/api.util';

/** `/favorites` — a regular resource; only the create payload needs typing. */
export class FavoritesRequest extends BaseRequest {
  constructor(
    protected request: APIRequestContext,
    protected headers?: Headers,
  ) {
    super(request, apiUrls.FAVORITES, headers);
  }

  async post(data: FavoritePayload): Promise<APIResponse> {
    return await super.post(data);
  }
}
