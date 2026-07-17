import {
  PaymentDetails,
  PaymentMethod,
} from '@src/api/models/payment.api.model';

/**
 * `POST /payment/check` validation tables.
 *
 * The endpoint validates `payment_details` against a per-method rule set — but
 * only once it recognises the method. It never checks that `payment_method` is
 * one of the five below (§API-E), so these tables cover the recognised methods
 * only; the unvalidated-method paths are pinned as their own tests in
 * `payment.check.api.spec.ts`.
 */
export interface PaymentMethodCase {
  label: string;
  method: PaymentMethod;
  details: PaymentDetails;
}

/**
 * A card expiry three years out. Computed rather than a literal because the rule
 * is "a date after today": any hard-coded year is a test that quietly starts
 * failing on a fixed date (the same class of trap as a hard-coded password,
 * §API-C).
 */
function futureExpiryDate(): string {
  const now = new Date();

  return `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear() + 3}`;
}

const validCreditCard = {
  credit_card_number: '4111-1111-1111-1111',
  expiration_date: futureExpiryDate(),
  cvv: '123',
  card_holder_name: 'Jane Doe',
};

export const validPaymentCases: PaymentMethodCase[] = [
  {
    label: 'a bank transfer',
    method: 'bank-transfer',
    details: {
      bank_name: 'ING',
      account_name: 'Jane Doe',
      account_number: '123456789',
    },
  },
  {
    // The one method whose details are genuinely empty — and, unlike the others,
    // whose payload is not checked at all.
    label: 'cash on delivery',
    method: 'cash-on-delivery',
    details: {},
  },
  { label: 'a credit card', method: 'credit-card', details: validCreditCard },
  {
    label: 'buy now pay later',
    method: 'buy-now-pay-later',
    details: { monthly_installments: '3' },
  },
  {
    label: 'a gift card',
    method: 'gift-card',
    details: { gift_card_number: 'ABCD123456789012', validation_code: '1234' },
  },
];

/**
 * One rejected payload. `field` is the dotted key the 422 body reports errors
 * under — the API flattens the nested details object into
 * `payment_details.<field>` rather than nesting the error to match the request.
 */
export interface InvalidPaymentCase extends PaymentMethodCase {
  field: string;
  expectedMessage: string;
}

export const invalidPaymentCases: InvalidPaymentCase[] = [
  {
    label: 'a credit card with no details',
    method: 'credit-card',
    details: {} as PaymentDetails,
    field: 'payment_details.credit_card_number',
    expectedMessage: 'required',
  },
  {
    // Only the dashed grouping is accepted — a bare 16-digit number is refused.
    label: 'an undashed credit card number',
    method: 'credit-card',
    details: { ...validCreditCard, credit_card_number: '4111111111111111' },
    field: 'payment_details.credit_card_number',
    expectedMessage: 'format is invalid',
  },
  {
    label: 'an expired credit card',
    method: 'credit-card',
    details: { ...validCreditCard, expiration_date: '01/2020' },
    field: 'payment_details.expiration_date',
    expectedMessage: 'must be a date after today',
  },
  {
    label: 'a two-digit cvv',
    method: 'credit-card',
    details: { ...validCreditCard, cvv: '12' },
    field: 'payment_details.cvv',
    expectedMessage: 'format is invalid',
  },
  {
    label: 'a bank transfer with no bank name',
    method: 'bank-transfer',
    details: {
      account_name: 'Jane Doe',
      account_number: '123456789',
    } as PaymentDetails,
    field: 'payment_details.bank_name',
    expectedMessage: 'required',
  },
  {
    // Digits only: an IBAN — the format a real European bank transfer uses — is
    // rejected by the account-number rule.
    label: 'a bank transfer with an IBAN account number',
    method: 'bank-transfer',
    details: {
      bank_name: 'ING',
      account_name: 'Jane Doe',
      account_number: 'NL91ABNA0417164300',
    },
    field: 'payment_details.account_number',
    expectedMessage: 'format is invalid',
  },
  {
    label: 'a 15-character gift card number',
    method: 'gift-card',
    details: { gift_card_number: 'ABCD12345678901', validation_code: '1234' },
    field: 'payment_details.gift_card_number',
    expectedMessage: 'format is invalid',
  },
  {
    label: 'a gift card with no details',
    method: 'gift-card',
    details: {} as PaymentDetails,
    field: 'payment_details.gift_card_number',
    expectedMessage: 'required',
  },
  {
    label: 'non-numeric monthly installments',
    method: 'buy-now-pay-later',
    details: { monthly_installments: 'abc' },
    field: 'payment_details.monthly_installments',
    expectedMessage: 'must be a number',
  },
  {
    label: 'buy now pay later with no installments',
    method: 'buy-now-pay-later',
    details: {} as PaymentDetails,
    field: 'payment_details.monthly_installments',
    expectedMessage: 'required',
  },
];
