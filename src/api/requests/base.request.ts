import { APIRequestContext, APIResponse } from '@playwright/test';
import { Headers } from '@src/api/models/headers.api.model';

/** Query-string params in the shape Playwright's request methods accept. */
export type QueryParams = Record<string, string | number | boolean>;

/**
 * Superclass for the request objects: holds the Playwright request context, the
 * collection root URL, and optional auth headers, and exposes the generic REST
 * verbs subclasses reuse. `data` stays loosely typed here on purpose — negative
 * specs send deliberately malformed payloads; subclasses narrow the type on
 * their happy-path overrides.
 */
export class BaseRequest {
  protected headers: Headers;

  constructor(
    protected request: APIRequestContext,
    protected url: string,
    headers?: Headers,
  ) {
    // `Accept: application/json` is not optional politeness — it decides what the
    // API does on a validation failure. The backend is Laravel: without it, a 422
    // becomes a 302 redirect to the API root, which Playwright silently follows,
    // so the test sees a bewildering `404 Resource not found` instead of the real
    // error. The Angular client sends this header on every call; so do we.
    //
    // Note for subclasses: take `headers` as a plain parameter, never a
    // `protected` parameter property. A parameter property is assigned *after*
    // `super()` returns and would overwrite this merge with the raw argument.
    this.headers = { Accept: 'application/json', ...headers };
  }

  async get(params?: QueryParams): Promise<APIResponse> {
    return await this.request.get(this.url, {
      headers: this.headers,
      params,
    });
  }

  async getOne(id: string): Promise<APIResponse> {
    return await this.request.get(`${this.url}/${id}`, {
      headers: this.headers,
    });
  }

  async post(data?: object): Promise<APIResponse> {
    return await this.request.post(this.url, {
      headers: this.headers,
      data,
    });
  }

  async put(data: object, id?: string): Promise<APIResponse> {
    return await this.request.put(id ? `${this.url}/${id}` : this.url, {
      headers: this.headers,
      data,
    });
  }

  async patch(data: object, id: string): Promise<APIResponse> {
    return await this.request.patch(`${this.url}/${id}`, {
      headers: this.headers,
      data,
    });
  }

  async delete(id: string): Promise<APIResponse> {
    return await this.request.delete(`${this.url}/${id}`, {
      headers: this.headers,
    });
  }
}
