import {
  PaymentDetails,
  PaymentMethod,
} from '@src/api/models/payment.api.model';

/** POST /invoices request body — turns an existing cart into an order. */
export interface InvoicePayload {
  billing_street: string;
  billing_city: string;
  billing_state: string;
  billing_country: string;
  billing_postal_code: string;
  payment_method: PaymentMethod;
  payment_details: PaymentDetails;
  cart_id: string;
}

/** POST /invoices/guest — the same invoice plus the guest's identity fields. */
export interface GuestInvoicePayload extends InvoicePayload {
  guest_email: string;
  guest_first_name: string;
  guest_last_name: string;
}
