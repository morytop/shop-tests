import { APIRequestContext, APIResponse } from '@playwright/test';
import { Headers } from '@src/api/models/headers.api.model';
import { ContactPayload } from '@src/api/models/message.api.model';
import { BaseRequest } from '@src/api/requests/base.request';
import { apiUrls } from '@src/api/utils/api.util';

/**
 * `/messages` (the contact form) — anonymous create plus the multipart
 * attach-file follow-up; the admin-side reads come from the inherited generics.
 */
export class MessagesRequest extends BaseRequest {
  constructor(
    protected request: APIRequestContext,
    protected headers?: Headers,
  ) {
    super(request, apiUrls.MESSAGES, headers);
  }

  async post(data: ContactPayload): Promise<APIResponse> {
    return await super.post(data);
  }

  async attachFile(
    messageId: string,
    file: { name: string; mimeType: string; buffer: Buffer },
  ): Promise<APIResponse> {
    return await this.request.post(`${this.url}/${messageId}/attach-file`, {
      headers: this.headers,
      multipart: { file },
    });
  }
}
