import { faker } from '@faker-js/faker';
import { APIRequestContext } from '@playwright/test';
import { LOOKUP_ADDRESS } from '@src/api/data/billing.data';
import { getAuthorizationHeader } from '@src/api/factories/authorization-header.api.factory';
import {
  CartWithProduct,
  createCartWithProduct,
} from '@src/api/factories/cart.api.factory';
import {
  BillingAddress,
  GuestInvoicePayload,
  InvoicePayload,
} from '@src/api/models/invoice.api.model';
import { LoginData } from '@src/api/models/login.api.model';
import { PostcodeLookupResult } from '@src/api/models/postcode.api.model';
import { CartsRequest } from '@src/api/requests/carts.request';
import { InvoicesRequest } from '@src/api/requests/invoices.request';
import { PostcodeRequest } from '@src/api/requests/postcode.request';
import { ProductsRequest } from '@src/api/requests/products.request';
import { expect } from '@src/fixtures/merge.fixture';

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
export interface ApiPlacedOrder {
  invoiceNumber: string;
  /** The invoice total as the API reports it — a plain number, unformatted. */
  total: number;
  product: CartWithProduct['product'];
}

export async function createInvoiceWithApi(
  request: APIRequestContext,
  credentials: LoginData,
): Promise<ApiPlacedOrder> {
  const { cartId, product } = await createCartWithProduct(
    new CartsRequest(request),
    new ProductsRequest(request),
  );
  const billing = await getGeocodedBillingAddress(new PostcodeRequest(request));
  const headers = await getAuthorizationHeader(request, credentials);

  const response = await new InvoicesRequest(request, headers).post(
    buildInvoicePayload(billing, cartId),
  );
  expect(
    response.status(),
    `invoice create expected 201, got ${response.status()}`,
  ).toBe(201);
  const invoice = await response.json();

  return {
    invoiceNumber: invoice.invoice_number,
    total: invoice.total,
    product,
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
