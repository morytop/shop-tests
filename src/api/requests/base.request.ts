import { APIRequestContext, APIResponse } from '@playwright/test';
import { Headers } from '@src/api/models/headers.api.model';

// Superclass for the request objects: holds the Playwright request context, the
// target URL, and optional auth headers, and exposes the verbs subclasses reuse.
export class BaseRequest {
  constructor(
    protected request: APIRequestContext,
    protected url: string,
    protected headers?: Headers,
  ) {}

  async get(): Promise<APIResponse> {
    return await this.request.get(this.url, {
      headers: this.headers,
    });
  }
}
