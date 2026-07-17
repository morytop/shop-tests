import {
  PaymentDetails,
  PaymentMethod,
} from '@src/api/models/payment.api.model';

/**
 * The billing half of an invoice payload. Split out because it is built as a
 * unit by the postcode lookup: the API cross-validates city against country, so
 * the five fields are only ever valid together as one geocoded set (§18).
 */
export interface BillingAddress {
  billing_street: string;
  billing_city: string;
  billing_state: string;
  billing_country: string;
  billing_postal_code: string;
}

/** POST /invoices request body — turns an existing cart into an order. */
export interface InvoicePayload extends BillingAddress {
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
