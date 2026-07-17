import { APIRequestContext, APIResponse } from '@playwright/test';
import { Headers } from '@src/api/models/headers.api.model';
import {
  GuestInvoicePayload,
  InvoicePayload,
} from '@src/api/models/invoice.api.model';
import { BaseRequest } from '@src/api/requests/base.request';
import { apiUrls } from '@src/api/utils/api.util';

/**
 * `/invoices` — creation from a cart (authenticated or guest), the owner-scoped
 * reads via the generics, and the PDF download pair, which is keyed by invoice
 * *number* rather than id.
 */
export class InvoicesRequest extends BaseRequest {
  constructor(
    protected request: APIRequestContext,
    headers?: Headers,
  ) {
    super(request, apiUrls.INVOICES, headers);
  }

  async post(data: InvoicePayload): Promise<APIResponse> {
    return await super.post(data);
  }

  async postGuest(data: GuestInvoicePayload): Promise<APIResponse> {
    return await this.request.post(apiUrls.INVOICES_GUEST, {
      headers: this.headers,
      data,
    });
  }

  async search(query: string): Promise<APIResponse> {
    return await this.request.get(apiUrls.INVOICES_SEARCH, {
      headers: this.headers,
      params: { q: query },
    });
  }

  async downloadPdf(invoiceNumber: string): Promise<APIResponse> {
    return await this.request.get(`${this.url}/${invoiceNumber}/download-pdf`, {
      headers: this.headers,
    });
  }

  async downloadPdfStatus(invoiceNumber: string): Promise<APIResponse> {
    return await this.request.get(
      `${this.url}/${invoiceNumber}/download-pdf-status`,
      { headers: this.headers },
    );
  }
}
