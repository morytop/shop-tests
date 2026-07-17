import { APIRequestContext, APIResponse } from '@playwright/test';
import { Headers } from '@src/api/models/headers.api.model';
import { PaymentPayload } from '@src/api/models/payment.api.model';
import { BaseRequest } from '@src/api/requests/base.request';
import { apiUrls } from '@src/api/utils/api.util';

/** `POST /payment/check` — a single stateless endpoint, so `post()` is all there is. */
export class PaymentRequest extends BaseRequest {
  constructor(
    protected request: APIRequestContext,
    headers?: Headers,
  ) {
    super(request, apiUrls.PAYMENT_CHECK, headers);
  }

  async post(data: PaymentPayload): Promise<APIResponse> {
    return await super.post(data);
  }
}
