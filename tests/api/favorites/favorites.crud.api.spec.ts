import { UNKNOWN_ID } from '@src/api/data/catalog.data';
import { expect, test } from '@src/merge.fixture';

/**
 * Favorites are per-user data, so every test here runs as the throwaway customer
 * behind `favoritesRequestLogged` (a fresh registered user per test — the reason
 * this fixture is only pulled where auth is genuinely needed). Nothing here
 * touches another account's rows.
 *
 * Product ids come from the live catalog (§3).
 */
test.describe('API favorites — own data', () => {
  test(
    'adds a product to favorites, lists it, reads it by id, then removes it',
    { tag: ['@api', '@smoke', '@favorites'] },
    async ({ favoritesRequestLogged, productsRequest }) => {
      const products = await (await productsRequest.get()).json();
      const product = products.data[0];

      const added = await favoritesRequestLogged.post({
        product_id: product.id,
      });

      expect(added.status()).toBe(201);
      const favorite = await added.json();
      expect.soft(favorite.id).toBeTruthy();
      expect.soft(favorite.product_id).toBe(product.id);

      const list = await favoritesRequestLogged.get();
      expect(list.status()).toBe(200);
      const favorites = await list.json();
      // A bare array, not the `{data: []}` envelope `/products` uses (§API-B),
      // and each row embeds the whole product.
      expect.soft(favorites).toHaveLength(1);
      expect.soft(favorites[0].id).toBe(favorite.id);
      expect.soft(favorites[0].product.name).toBe(product.name);
      expect.soft(favorites[0].user_id).toBe(favorite.user_id);

      const byId = await favoritesRequestLogged.getOne(favorite.id);
      expect(byId.status()).toBe(200);
      const single = await byId.json();
      expect.soft(single.product_id).toBe(product.id);
      // The single read drops the embedded product the list carries.
      expect.soft(single.product).toBeUndefined();

      const removed = await favoritesRequestLogged.delete(favorite.id);

      expect(removed.status()).toBe(204);

      const afterRemove = await favoritesRequestLogged.getOne(favorite.id);
      expect(afterRemove.status()).toBe(404);
      expect
        .soft(await (await favoritesRequestLogged.get()).json())
        .toEqual([]);
    },
  );

  test(
    'rejects favoriting the same product twice with 409',
    { tag: ['@api', '@favorites'] },
    async ({ favoritesRequestLogged, productsRequest }) => {
      const products = await (await productsRequest.get()).json();
      const product = products.data[0];
      await favoritesRequestLogged.post({ product_id: product.id });

      const response = await favoritesRequestLogged.post({
        product_id: product.id,
      });

      expect(response.status()).toBe(409);
      expect.soft((await response.json()).message).toBe('Duplicate Entry');

      const favorites = await (await favoritesRequestLogged.get()).json();
      expect.soft(favorites).toHaveLength(1);
    },
  );

  test(
    'rejects favoriting an unknown product id with 422',
    { tag: ['@api', '@favorites'] },
    async ({ favoritesRequestLogged }) => {
      const response = await favoritesRequestLogged.post({
        product_id: UNKNOWN_ID,
      });

      expect(response.status()).toBe(422);
      // The validator enforces referential integrity here exactly as it does for
      // cart lines (§API-D) — an unknown id is an invalid field, not a 404.
      // Note the body is a bare field map, without the `{message, errors}`
      // wrapper the catalog and payment endpoints use (§API-E).
      expect
        .soft((await response.json()).product_id.join(' '))
        .toContain('The selected product id is invalid');
    },
  );

  test(
    'rejects a favorite with no product id with 422',
    { tag: ['@api', '@favorites'] },
    async ({ favoritesRequestLogged }) => {
      const response = await favoritesRequestLogged.post(
        {} as { product_id: string },
      );

      expect(response.status()).toBe(422);
      expect
        .soft((await response.json()).product_id.join(' '))
        .toContain('The product id field is required');
    },
  );

  test(
    'rejects anonymous access to favorites with 401',
    { tag: ['@api', '@favorites', '@auth'] },
    async ({ favoritesRequest, productsRequest }) => {
      const products = await (await productsRequest.get()).json();

      const list = await favoritesRequest.get();
      const added = await favoritesRequest.post({
        product_id: products.data[0].id,
      });

      expect(list.status()).toBe(401);
      // The UI has no client-side guard and fires this POST while logged out,
      // relying on the 401 to pick the toast (§27) — so the rejection is load
      // bearing, not just defence in depth.
      expect(added.status()).toBe(401);
    },
  );

  test(
    'answers 204 rather than 404 when deleting an unknown favorite',
    { tag: ['@api', '@favorites'] },
    async ({ favoritesRequestLogged }) => {
      const response = await favoritesRequestLogged.delete(UNKNOWN_ID);

      // Documents a real inconsistency, not a requirement: `DELETE` reports
      // success for a row that never existed, while `GET` on the same id 404s.
      // Every other unknown-id path in this API answers 404 (§API-E).
      expect(response.status()).toBe(204);
    },
  );
});
