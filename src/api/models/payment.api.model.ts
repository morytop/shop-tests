/** The payment method slugs `POST /payment/check` and `POST /invoices` accept. */
export type PaymentMethod =
  | 'bank-transfer'
  | 'cash-on-delivery'
  | 'credit-card'
  | 'buy-now-pay-later'
  | 'gift-card';

export interface BankTransferDetails {
  bank_name: string;
  account_name: string;
  account_number: string;
}

export interface CreditCardDetails {
  credit_card_number: string;
  expiration_date: string;
  cvv: string;
  card_holder_name: string;
}

export interface GiftCardDetails {
  gift_card_number: string;
  validation_code: string;
}

export interface BuyNowPayLaterDetails {
  monthly_installments: string;
}

/** Cash on delivery carries no details — the API documents an empty object. */
export type CashOnDeliveryDetails = Record<string, never>;

export type PaymentDetails =
  | BankTransferDetails
  | CreditCardDetails
  | GiftCardDetails
  | BuyNowPayLaterDetails
  | CashOnDeliveryDetails;

/** POST /payment/check request body. */
export interface PaymentPayload {
  payment_method: PaymentMethod;
  payment_details: PaymentDetails;
}
