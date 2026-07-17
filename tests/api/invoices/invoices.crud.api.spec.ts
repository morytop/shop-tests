import { UNKNOWN_ID } from '@src/api/data/catalog.data';
import { createCartWithProduct } from '@src/api/factories/cart.api.factory';
import {
  buildGuestInvoicePayload,
  buildInvoicePayload,
  getGeocodedBillingAddress,
} from '@src/api/factories/invoice.api.factory';
import { expect, test } from '@src/merge.fixture';

/**
 * Invoices are the one write this suite makes that a human might later look at:
 * an order is permanent and visible to the admin. Every order here belongs to
 * the test's own throwaway customer (or to a faker guest), never to a seeded
 * account, and the amounts are whatever the live catalog charges.
 *
 * Billing addresses come from the postcode lookup via the factory, never a
 * literal — the API cross-validates city against country (§18).
 */
test.describe('API invoices — own orders', () => {
  test(
    'turns a cart into an invoice that then appears in the list, detail and search',
    { tag: ['@api', '@smoke', '@invoices'] },
    async ({
      invoicesRequestLogged,
      cartsRequest,
      productsRequest,
      postcodeRequest,
    }) => {
      const { cartId, product } = await createCartWithProduct(
        cartsRequest,
        productsRequest,
        2,
      );
      const billing = await getGeocodedBillingAddress(postcodeRequest);

      const created = await invoicesRequestLogged.post(
        buildInvoicePayload(billing, cartId),
      );

      expect(created.status()).toBe(201);
      const invoice = await created.json();
      expect.soft(invoice.invoice_number).toMatch(/^INV-\d+$/);
      expect.soft(invoice.billing_city).toBe(billing.billing_city);
      expect.soft(invoice.total).toBeGreaterThan(0);
      // The create response carries no `status` — only the reads below do.
      expect.soft(invoice.status).toBeUndefined();

      const list = await invoicesRequestLogged.get();
      expect(list.status()).toBe(200);
      const listed = await list.json();
      // A fresh user owns exactly this one order, so the list is a precise
      // assertion rather than a "contains" search.
      expect.soft(listed.data).toHaveLength(1);
      expect.soft(listed.data[0].invoice_number).toBe(invoice.invoice_number);
      expect.soft(listed.data[0].status).toBe('AWAITING_FULFILLMENT');

      const detail = await invoicesRequestLogged.getOne(invoice.id);
      expect(detail.status()).toBe(200);
      const detailed = await detail.json();
      expect.soft(detailed.invoice_number).toBe(invoice.invoice_number);
      expect.soft(detailed.user_id).toBe(invoice.user_id);
      expect.soft(detailed.invoicelines).toHaveLength(1);
      expect.soft(detailed.invoicelines[0].product_id).toBe(product.id);
      expect.soft(detailed.invoicelines[0].quantity).toBe(2);

      const found = await invoicesRequestLogged.search(invoice.invoice_number);
      expect(found.status()).toBe(200);
      const results = await found.json();
      expect.soft(results.data[0].invoice_number).toBe(invoice.invoice_number);
    },
  );

  test(
    'places a guest order with no token, filed against no user',
    { tag: ['@api', '@invoices'] },
    async ({
      invoicesRequest,
      cartsRequest,
      productsRequest,
      postcodeRequest,
    }) => {
      const { cartId } = await createCartWithProduct(
        cartsRequest,
        productsRequest,
      );
      const billing = await getGeocodedBillingAddress(postcodeRequest);
      const payload = buildGuestInvoicePayload(billing, cartId);

      const created = await invoicesRequest.postGuest(payload);

      expect(created.status()).toBe(201);
      const invoice = await created.json();
      expect.soft(invoice.invoice_number).toMatch(/^INV-\d+$/);
      // A guest order is genuinely ownerless — there is no account to attach it
      // to and none is created for the guest_email.
      expect.soft(invoice.user_id).toBeNull();
    },
  );

  test(
    'rejects a guest order that omits the guest identity fields',
    { tag: ['@api', '@invoices'] },
    async ({
      invoicesRequest,
      cartsRequest,
      productsRequest,
      postcodeRequest,
    }) => {
      const { cartId } = await createCartWithProduct(
        cartsRequest,
        productsRequest,
      );
      const billing = await getGeocodedBillingAddress(postcodeRequest);

      const response = await invoicesRequest.postGuest(
        buildInvoicePayload(billing, cartId) as never,
      );

      expect(response.status()).toBe(422);
      const body = await response.json();
      expect
        .soft(Object.keys(body.errors))
        .toEqual(['guest_email', 'guest_first_name', 'guest_last_name']);
    },
  );

  test(
    'rejects a billing city that does not belong to the billing country',
    { tag: ['@api', '@invoices'] },
    async ({
      invoicesRequestLogged,
      cartsRequest,
      productsRequest,
      postcodeRequest,
    }) => {
      const { cartId } = await createCartWithProduct(
        cartsRequest,
        productsRequest,
      );
      const billing = await getGeocodedBillingAddress(postcodeRequest);

      const response = await invoicesRequestLogged.post({
        ...buildInvoicePayload(billing, cartId),
        // A real German city — but not the one the lookup geocoded, which is all
        // the cross-check cares about (§18). This is why orderable addresses can
        // only come from the lookup.
        billing_city: 'Berlin',
      });

      expect(response.status()).toBe(422);
      expect
        .soft((await response.json()).billing_country.join(' '))
        .toContain('does not match the entered address');
    },
  );

  test(
    'rejects invoice reads and writes without a token',
    { tag: ['@api', '@invoices', '@auth'] },
    async ({
      invoicesRequest,
      cartsRequest,
      productsRequest,
      postcodeRequest,
    }) => {
      const { cartId } = await createCartWithProduct(
        cartsRequest,
        productsRequest,
      );
      const billing = await getGeocodedBillingAddress(postcodeRequest);

      const list = await invoicesRequest.get();
      const created = await invoicesRequest.post(
        buildInvoicePayload(billing, cartId),
      );

      expect(list.status()).toBe(401);
      // Only the `/guest` variant accepts an anonymous order — the plain
      // endpoint requires a token even with an otherwise valid payload.
      expect(created.status()).toBe(401);
    },
  );

  test(
    'rejects an invoice with an empty payload, naming every required field',
    { tag: ['@api', '@invoices'] },
    async ({ invoicesRequestLogged }) => {
      const response = await invoicesRequestLogged.post(
        {} as ReturnType<typeof buildInvoicePayload>,
      );

      expect(response.status()).toBe(422);
      const body = await response.json();
      // A bare field map here, unlike the billing-city cross-check above, which
      // wraps its single error under a named field the same way — the wrapper
      // only ever appears when there's a `{message, errors}` envelope to hold,
      // and this response has none (§API-E).
      expect
        .soft(Object.keys(body))
        .toEqual(
          expect.arrayContaining([
            'payment_method',
            'payment_details',
            'billing_street',
            'billing_city',
            'billing_country',
            'cart_id',
          ]),
        );
    },
  );

  test(
    'rejects an invoice for an unknown cart with 404',
    { tag: ['@api', '@invoices'] },
    async ({ invoicesRequestLogged, postcodeRequest }) => {
      const billing = await getGeocodedBillingAddress(postcodeRequest);

      const response = await invoicesRequestLogged.post(
        buildInvoicePayload(billing, UNKNOWN_ID),
      );

      // Unlike the cart's own product-id check, which reads an unknown id as a
      // validation failure (422, §API-D), the invoice endpoint 404s on an
      // unknown cart.
      expect(response.status()).toBe(404);
    },
  );

  test(
    'accepts an order for an empty cart',
    { tag: ['@api', '@invoices'] },
    async ({ invoicesRequestLogged, cartsRequest, postcodeRequest }) => {
      const cartId = (await (await cartsRequest.post()).json()).id;
      const billing = await getGeocodedBillingAddress(postcodeRequest);

      const response = await invoicesRequestLogged.post(
        buildInvoicePayload(billing, cartId),
      );

      // Pins a defect, not a requirement: an empty cart yields a real $0 invoice
      // with no lines rather than a 422 (§API-E). The UI can't reach this — its
      // checkout is unreachable with an empty cart — but the API has no such
      // guard.
      expect(response.status()).toBe(201);
      const invoice = await response.json();
      expect.soft(invoice.total).toBe(0);

      const detail = await (
        await invoicesRequestLogged.getOne(invoice.id)
      ).json();
      expect.soft(detail.invoicelines).toEqual([]);
    },
  );

  test(
    'generates a downloadable PDF once the invoice has been created',
    { tag: ['@api', '@invoices'] },
    async ({
      invoicesRequestLogged,
      invoicesRequest,
      cartsRequest,
      productsRequest,
      postcodeRequest,
    }) => {
      // PDF generation is a queued job that only starts ~15-40s after the
      // invoice lands, and the default 90s timeout leaves too little room for
      // the whole chain under parallel load (§33).
      test.slow();
      const { cartId } = await createCartWithProduct(
        cartsRequest,
        productsRequest,
      );
      const billing = await getGeocodedBillingAddress(postcodeRequest);
      const invoice = await (
        await invoicesRequestLogged.post(buildInvoicePayload(billing, cartId))
      ).json();

      const before = await invoicesRequestLogged.downloadPdfStatus(
        invoice.invoice_number,
      );

      // The pre-generation state is reported as an *error* (400) carrying a
      // status body — so a client polling for 200 sees a failure, not a
      // "not ready yet" (§API-E).
      expect(before.status()).toBe(400);
      expect.soft((await before.json()).status).toBe('NOT_INITIATED');

      // Nothing has to be asked for: creating the invoice enqueues the job, and
      // the status walks NOT_INITIATED → INITIATED → COMPLETED on its own.
      await expect
        .poll(
          async () =>
            (
              await (
                await invoicesRequestLogged.downloadPdfStatus(
                  invoice.invoice_number,
                )
              ).json()
            ).status,
          { timeout: 120_000, intervals: [3_000] },
        )
        .toBe('COMPLETED');

      const pdf = await invoicesRequestLogged.downloadPdf(
        invoice.invoice_number,
      );

      expect(pdf.status()).toBe(200);
      expect.soft(pdf.headers()['content-type']).toContain('application/pdf');
      expect.soft((await pdf.body()).subarray(0, 5).toString()).toBe('%PDF-');

      const anonymous = await invoicesRequest.downloadPdf(
        invoice.invoice_number,
      );
      expect(anonymous.status()).toBe(401);
    },
  );
});
