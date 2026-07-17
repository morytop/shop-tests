import {
  invalidPaymentCases,
  validPaymentCases,
} from '@src/api/data/payment-methods';
import { expect, test } from '@src/merge.fixture';

/**
 * `POST /payment/check` is anonymous and stateless — nothing here needs a
 * token, and the endpoint has no side effect to clean up.
 */
test.describe('API payment — check', () => {
  for (const validCase of validPaymentCases) {
    test(
      `accepts ${validCase.label}`,
      { tag: ['@api', '@smoke', '@payment'] },
      async ({ paymentRequest }) => {
        const response = await paymentRequest.post({
          payment_method: validCase.method,
          payment_details: validCase.details,
        });

        expect(
          response.status(),
          `${validCase.label} expected 200, got ${response.status()}`,
        ).toBe(200);
        expect
          .soft((await response.json()).message)
          .toBe('Payment was successful');
      },
    );
  }

  for (const invalidCase of invalidPaymentCases) {
    test(
      `rejects ${invalidCase.label}`,
      { tag: ['@api', '@payment'] },
      async ({ paymentRequest }) => {
        const response = await paymentRequest.post({
          payment_method: invalidCase.method,
          payment_details: invalidCase.details,
        });

        expect(
          response.status(),
          `${invalidCase.label} expected 422, got ${response.status()}`,
        ).toBe(422);

        const body = await response.json();
        expect
          .soft(body.errors[invalidCase.field].join(' '))
          .toContain(invalidCase.expectedMessage);
      },
    );
  }

  /**
   * Pins a real gap, not a requirement: the endpoint never checks that
   * `payment_method` is one of the five known slugs, so an unrecognised method
   * skips validation entirely and reports success regardless of its details.
   * Recorded in PRODUCT_EXPLORATION.md.
   */
  test(
    'accepts an unrecognised payment method without validating its details',
    { tag: ['@api', '@payment'] },
    async ({ paymentRequest }) => {
      const response = await paymentRequest.post({
        // @ts-expect-error — deliberately outside the known PaymentMethod union.
        payment_method: 'bitcoin',
        payment_details: {},
      });

      expect(response.status()).toBe(200);
      expect
        .soft((await response.json()).message)
        .toBe('Payment was successful');
    },
  );

  test(
    'accepts an empty payload — payment_method is not required either',
    { tag: ['@api', '@payment'] },
    async ({ paymentRequest }) => {
      const response = await paymentRequest.post(
        {} as Parameters<typeof paymentRequest.post>[0],
      );

      expect(response.status()).toBe(200);
    },
  );
});
