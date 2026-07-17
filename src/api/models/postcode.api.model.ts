/**
 * GET /postcode-lookup query string. A type alias rather than an interface so it
 * stays assignable to `BaseRequest`'s `QueryParams` index signature.
 *
 * `housenumber` is one word — the sibling fields elsewhere in the API are
 * `house_number`, and the underscored spelling is silently ignored here.
 */
export type PostcodeLookupParams = {
  country: string;
  postcode: string;
  housenumber: string;
};

/** The geocoded address the lookup answers with. */
export interface PostcodeLookupResult {
  street: string;
  house_number: string;
  city: string;
  state: string;
  country: string;
  postcode: string;
}
