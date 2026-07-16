import { APIRequestContext } from '@playwright/test';
import { Headers } from '@src/api/models/headers.api.model';
import { BaseRequest } from '@src/api/requests/base.request';
import { apiUrls } from '@src/api/utils/api.util';

/** `/images` — a read-only catalog lookup; the inherited `get()` is the whole surface. */
export class ImagesRequest extends BaseRequest {
  constructor(
    protected request: APIRequestContext,
    protected headers?: Headers,
  ) {
    super(request, apiUrls.IMAGES, headers);
  }
}
