import { APIRequestContext, APIResponse } from '@playwright/test';
import { Headers } from '@src/api/models/headers.api.model';
import { BaseRequest } from '@src/api/requests/base.request';
import { apiUrls } from '@src/api/utils/api.util';

/**
 * `/products` plus its nested spec sub-resource. Spec payloads stay untyped
 * (`object`): the catalog is shared production data, so spec writes are only
 * ever exercised as negative cases with deliberately invalid bodies.
 */
export class ProductsRequest extends BaseRequest {
  constructor(
    protected request: APIRequestContext,
    protected headers?: Headers,
  ) {
    super(request, apiUrls.PRODUCTS, headers);
  }

  async search(query: string): Promise<APIResponse> {
    return await this.request.get(apiUrls.PRODUCT_SEARCH, {
      headers: this.headers,
      params: { q: query },
    });
  }

  async getRelated(productId: string): Promise<APIResponse> {
    return await this.request.get(`${this.url}/${productId}/related`, {
      headers: this.headers,
    });
  }

  async getSpecs(productId: string): Promise<APIResponse> {
    return await this.request.get(`${this.url}/${productId}/specs`, {
      headers: this.headers,
    });
  }

  async getSpec(productId: string, specId: string): Promise<APIResponse> {
    return await this.request.get(`${this.url}/${productId}/specs/${specId}`, {
      headers: this.headers,
    });
  }

  async getSpecNames(): Promise<APIResponse> {
    return await this.request.get(apiUrls.PRODUCT_SPECS_NAMES, {
      headers: this.headers,
    });
  }

  async postSpec(productId: string, data: object): Promise<APIResponse> {
    return await this.request.post(`${this.url}/${productId}/specs`, {
      headers: this.headers,
      data,
    });
  }

  async putSpec(
    productId: string,
    specId: string,
    data: object,
  ): Promise<APIResponse> {
    return await this.request.put(`${this.url}/${productId}/specs/${specId}`, {
      headers: this.headers,
      data,
    });
  }

  async deleteSpec(productId: string, specId: string): Promise<APIResponse> {
    return await this.request.delete(
      `${this.url}/${productId}/specs/${specId}`,
      { headers: this.headers },
    );
  }
}
