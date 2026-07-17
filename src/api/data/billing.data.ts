import { PostcodeLookupParams } from '@src/api/models/postcode.api.model';

/**
 * The lookup query every invoice test bills from — the API-side twin of the UI's
 * `makeValidAddress()` (which carries the country's *label*, "Germany", for the
 * checkout `<select>`; the API wants the ISO code).
 *
 * Fixed rather than faker for the same reason as the UI factory: the postcode
 * must be a real, known-good pair for its country or the lookup 422s. The house
 * number is sent for realism only — the endpoint ignores it (§API-E).
 */
export const LOOKUP_ADDRESS: PostcodeLookupParams = {
  country: 'DE',
  postcode: '12345',
  housenumber: '42',
};

/**
 * A postcode that is well-formed in general but invalid for `LOOKUP_ADDRESS`'s
 * country — the lookup validates the format per country, so this is the input
 * that exercises that rule.
 */
export const INVALID_POSTCODE_FOR_COUNTRY = 'ZZZZZ';
