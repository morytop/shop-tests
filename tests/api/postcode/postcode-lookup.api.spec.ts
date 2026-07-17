import {
  INVALID_POSTCODE_FOR_COUNTRY,
  LOOKUP_ADDRESS,
} from '@src/api/data/billing.data';
import { expect, test } from '@src/merge.fixture';

/**
 * `GET /postcode-lookup` is anonymous and read-only — the checkout billing
 * step behind it, and the endpoint the invoice factory geocodes addresses
 * through (§18).
 */
test.describe('API postcode lookup', () => {
  test(
    'geocodes a known postcode into a full address',
    { tag: ['@api', '@smoke', '@postcode'] },
    async ({ postcodeRequest }) => {
      const response = await postcodeRequest.lookup(LOOKUP_ADDRESS);

      expect(response.status()).toBe(200);
      const address = await response.json();
      expect.soft(address.country).toBe(LOOKUP_ADDRESS.country);
      expect.soft(address.postcode).toBe(LOOKUP_ADDRESS.postcode);
      expect.soft(address.street).toBeTruthy();
      expect.soft(address.city).toBeTruthy();
      expect.soft(address.state).toBeTruthy();
    },
  );

  /**
   * Pins an observed quirk, not a documented contract: the lookup is keyed on
   * `country`+`postcode` only. The same pair always geocodes to the same
   * street/house number no matter what `housenumber` is sent — the field name
   * mismatch (`housenumber` here, `house_number` everywhere else in this API)
   * is a hint it's silently ignored. Recorded in PRODUCT_EXPLORATION.md.
   */
  test(
    'ignores the housenumber param — the result never reflects it',
    { tag: ['@api', '@postcode'] },
    async ({ postcodeRequest }) => {
      const first = await (await postcodeRequest.lookup(LOOKUP_ADDRESS)).json();
      const second = await (
        await postcodeRequest.lookup({ ...LOOKUP_ADDRESS, housenumber: '999' })
      ).json();

      expect(second.house_number).toBe(first.house_number);
    },
  );

  test(
    'rejects a postcode that is malformed for its country',
    { tag: ['@api', '@postcode'] },
    async ({ postcodeRequest }) => {
      const response = await postcodeRequest.lookup({
        ...LOOKUP_ADDRESS,
        postcode: INVALID_POSTCODE_FOR_COUNTRY,
      });

      expect(response.status()).toBe(422);
      expect
        .soft((await response.json()).message)
        .toContain('postal code format is not valid');
    },
  );

  test(
    'rejects a lookup missing both required params, naming each',
    { tag: ['@api', '@postcode'] },
    async ({ postcodeRequest }) => {
      const response = await postcodeRequest.lookup({
        housenumber: LOOKUP_ADDRESS.housenumber,
      } as never);

      expect(response.status()).toBe(422);
      const body = await response.json();
      expect.soft(Object.keys(body.errors)).toEqual(['country', 'postcode']);
    },
  );

  /**
   * Pins a real gap, not a requirement: an unrecognised country code still
   * geocodes to a fabricated-looking address (200) instead of being rejected
   * — the validator only checks the postcode's format, never that the country
   * itself is real. Recorded in PRODUCT_EXPLORATION.md.
   */
  test(
    'accepts an unknown country code with a fabricated address',
    { tag: ['@api', '@postcode'] },
    async ({ postcodeRequest }) => {
      const response = await postcodeRequest.lookup({
        ...LOOKUP_ADDRESS,
        country: 'ZZ',
      });

      expect(response.status()).toBe(200);
      const address = await response.json();
      expect.soft(address.country).toBe('ZZ');
      expect.soft(address.street).toBeTruthy();
    },
  );
});
