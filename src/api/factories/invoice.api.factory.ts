import { faker } from '@faker-js/faker';
import { LOOKUP_ADDRESS } from '@src/api/data/billing.data';
import {
  BillingAddress,
  GuestInvoicePayload,
  InvoicePayload,
} from '@src/api/models/invoice.api.model';
import { PostcodeLookupResult } from '@src/api/models/postcode.api.model';
import { PostcodeRequest } from '@src/api/requests/postcode.request';
import { expect } from '@src/merge.fixture';

/**
 * Build a billing address the invoice endpoint will accept, by geocoding one
 * through the postcode lookup.
 *
 * This indirection is not incidental: `POST /invoices` cross-validates city
 * against country and rejects a hand-typed pair with 422 — even a real one
 * ("Berlin"/"DE" fails, §18). Only the lookup's own output is internally
 * consistent, so any orderable address has to come from here rather than from a
 * literal or from faker.
 */
export async function getGeocodedBillingAddress(
  postcodeRequest: PostcodeRequest,
): Promise<BillingAddress> {
  const response = await postcodeRequest.lookup(LOOKUP_ADDRESS);
  expect(
    response.status(),
    `postcode lookup expected 200, got ${response.status()}`,
  ).toBe(200);

  const address: PostcodeLookupResult = await response.json();

  return {
    // The lookup returns street and house number separately; the invoice has a
    // single street line, which is how the checkout UI submits it too.
    billing_street: `${address.street} ${address.house_number}`,
    billing_city: address.city,
    billing_state: address.state,
    billing_country: address.country,
    billing_postal_code: address.postcode,
  };
}

/**
 * Cash on delivery keeps the invoice arrange honest: it is the one method with
 * no details to validate, so an invoice test fails on invoice rules rather than
 * on a payment payload that has nothing to do with what it asserts.
 */
export function buildInvoicePayload(
  billing: BillingAddress,
  cartId: string,
): InvoicePayload {
  return {
    ...billing,
    payment_method: 'cash-on-delivery',
    payment_details: {},
    cart_id: cartId,
  };
}

export function buildGuestInvoicePayload(
  billing: BillingAddress,
  cartId: string,
): GuestInvoicePayload {
  return {
    ...buildInvoicePayload(billing, cartId),
    guest_email: faker.internet.email(),
    guest_first_name: faker.person.firstName(),
    guest_last_name: faker.person.lastName(),
  };
}
