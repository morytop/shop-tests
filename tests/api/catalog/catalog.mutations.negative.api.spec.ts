import { UNKNOWN_ID } from '@src/api/data/catalog.data';
import { expect, test } from '@src/fixtures/merge.fixture';

/**
 * Catalog writes are negative-only by scope decision: the catalog is shared
 * production data, so these specs pin how writes are *rejected* and never perform
 * one that could succeed.
 *
 * Two rules follow from what the API actually does, and both are load-bearing:
 *
 * 1. **Every write targets `UNKNOWN_ID`, never a live row.** `PUT`/`PATCH` resolve
 *    the row *before* checking auth, so an unknown id 404s where a real id would
 *    reach the handler. Aiming these probes at a real brand would risk mutating
 *    production to learn whether auth is enforced.
 * 2. **No `POST` here carries a valid payload.** `POST` on the collections
 *    validates *before* checking auth (empty body → 422, not 401), which means an
 *    anonymous POST with a *complete* body might well create a real catalog row —
 *    and with no admin-write path to delete it, that row would pollute the shared
 *    catalog permanently. Whether auth gates a valid anonymous POST is therefore
 *    deliberately left unproven; see PRODUCT_EXPLORATION.md §4.
 *
 * A 2xx from any test in this file is a genuine finding, not a flake.
 */
const CATALOG_RESOURCES = ['products', 'brands', 'categories'] as const;

test.describe('API catalog — write rejections', () => {
  for (const resource of CATALOG_RESOURCES) {
    test(
      `rejects an anonymous DELETE on ${resource} with 401`,
      { tag: ['@api', '@catalog'] },
      async ({ productsRequest, brandsRequest, categoriesRequest }) => {
        const requests = {
          products: productsRequest,
          brands: brandsRequest,
          categories: categoriesRequest,
        };

        const response = await requests[resource].delete(UNKNOWN_ID);

        expect(
          response.status(),
          `anonymous DELETE /${resource} must be rejected, got ${response.status()}`,
        ).toBe(401);
      },
    );

    test(
      `rejects a customer-token DELETE on ${resource} with 403`,
      { tag: ['@api', '@catalog'] },
      async ({
        productsRequestLogged,
        brandsRequestLogged,
        categoriesRequestLogged,
      }) => {
        const requests = {
          products: productsRequestLogged,
          brands: brandsRequestLogged,
          categories: categoriesRequestLogged,
        };

        const response = await requests[resource].delete(UNKNOWN_ID);

        expect(
          response.status(),
          `customer-token DELETE /${resource} must be forbidden, got ${response.status()}`,
        ).toBe(403);
      },
    );

    // Documents the validate-before-auth ordering: the rejection here is the
    // validator's, not the auth layer's. See the file header before "fixing" this
    // to expect 401.
    test(
      `rejects an anonymous POST of an empty ${resource} payload with 422`,
      { tag: ['@api', '@catalog'] },
      async ({ productsRequest, brandsRequest, categoriesRequest }) => {
        const requests = {
          products: productsRequest,
          brands: brandsRequest,
          categories: categoriesRequest,
        };

        const response = await requests[resource].post({});

        expect(
          response.status(),
          `anonymous POST /${resource} must not be accepted, got ${response.status()}`,
        ).toBe(422);

        const body = await response.json();
        expect.soft(body.name).toBeTruthy();
      },
    );

    // Existence is resolved ahead of auth, so an unknown id never reaches the
    // auth layer. This is exactly why rule 1 in the file header exists.
    test(
      `resolves an unknown ${resource} id to 404 before checking auth on PUT`,
      { tag: ['@api', '@catalog'] },
      async ({ productsRequest, brandsRequest, categoriesRequest }) => {
        const requests = {
          products: productsRequest,
          brands: brandsRequest,
          categories: categoriesRequest,
        };

        const response = await requests[resource].put({}, UNKNOWN_ID);

        expect(
          response.status(),
          `anonymous PUT /${resource} must not be accepted, got ${response.status()}`,
        ).toBe(404);
      },
    );
  }

  test(
    'rejects an anonymous PATCH on a product with 404 for an unknown id',
    { tag: ['@api', '@catalog'] },
    async ({ productsRequest }) => {
      const response = await productsRequest.patch({}, UNKNOWN_ID);

      expect(response.status()).toBe(404);
    },
  );

  // The spec sub-resource checks auth *first* — unlike its parent collection,
  // which validates first. The inconsistency is the point of this test.
  test(
    'rejects an anonymous product-spec POST with 401',
    { tag: ['@api', '@catalog'] },
    async ({ productsRequest }) => {
      const response = await productsRequest.postSpec(UNKNOWN_ID, {});

      expect(
        response.status(),
        `anonymous POST /products/{id}/specs must be rejected, got ${response.status()}`,
      ).toBe(401);
    },
  );

  test(
    'rejects an anonymous product-spec DELETE with 401',
    { tag: ['@api', '@catalog'] },
    async ({ productsRequest }) => {
      const response = await productsRequest.deleteSpec(UNKNOWN_ID, UNKNOWN_ID);

      expect(response.status()).toBe(401);
    },
  );
});
