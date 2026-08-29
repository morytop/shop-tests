import { APIRequestContext, APIResponse } from '@playwright/test';
import {
  CartItemPayload,
  InvalidCartItemPayload,
} from '@src/api/models/cart.api.model';
import { Headers } from '@src/api/models/headers.api.model';
import { BaseRequest } from '@src/api/requests/base.request';
import { apiUrls } from '@src/api/utils/api.util';

export class CartsRequest extends BaseRequest {
  constructor(
    protected request: APIRequestContext,
    headers?: Headers,
  ) {
    super(request, apiUrls.CARTS, headers);
  }

  async addItem(
    cartId: string,
    data: CartItemPayload | InvalidCartItemPayload,
  ): Promise<APIResponse> {
    return await this.request.post(`${this.url}/${cartId}`, {
      headers: this.headers,
      data,
    });
  }

  async updateItemQuantity(
    cartId: string,
    data: CartItemPayload,
  ): Promise<APIResponse> {
    return await this.request.put(`${this.url}/${cartId}/product/quantity`, {
      headers: this.headers,
      data,
    });
  }

  async deleteItem(cartId: string, productId: string): Promise<APIResponse> {
    return await this.request.delete(
      `${this.url}/${cartId}/product/${productId}`,
      { headers: this.headers },
    );
  }
}
