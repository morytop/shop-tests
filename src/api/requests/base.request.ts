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
  constructor(
    protected request: APIRequestContext,
    protected url: string,
    protected headers?: Headers,
  ) {}

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
