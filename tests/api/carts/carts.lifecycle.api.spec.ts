import { expect, test } from '@src/fixtures/merge.fixture';

/**
 * Carts are the one resource this suite may freely create: a cart is a throwaway
 * server object owned by nobody, not shared catalog or account data. Each test
 * still creates its own and deletes it in teardown, so a run leaves nothing
 * behind and parallel workers can't collide.
 *
 * Product ids are resolved live from `GET /products` (§3) — the catalog is shared
 * production data with no fixed rows to hard-code.
 */
test.describe('API carts — lifecycle', () => {
  test(
    'creates an empty cart',
    { tag: ['@api', '@smoke', '@cart'] },
    async ({ cartsRequest }) => {
      const response = await cartsRequest.post();

      expect(response.status()).toBe(201);

      const body = await response.json();
      expect.soft(body.id).toBeTruthy();

      await cartsRequest.delete(body.id);
    },
  );

  test(
    'adds a product, reads it back, changes its quantity, then empties the cart',
    { tag: ['@api', '@smoke', '@cart'] },
    async ({ cartsRequest, productsRequest }) => {
      const products = await (await productsRequest.get()).json();
      const product = products.data[0];
      const cartId = (await (await cartsRequest.post()).json()).id;

      const added = await cartsRequest.addItem(cartId, {
        product_id: product.id,
        quantity: 2,
      });

      expect(added.status()).toBe(200);
      expect.soft((await added.json()).result).toBe('item added or updated');

      // Read back through GET rather than trusting the add response: the endpoint
      // reports "added or updated" either way and never echoes the line.
      const afterAdd = await cartsRequest.getOne(cartId);
      expect(afterAdd.status()).toBe(200);
      const cart = await afterAdd.json();
      expect.soft(cart.cart_items).toHaveLength(1);
      expect.soft(cart.cart_items[0].product_id).toBe(product.id);
      expect.soft(cart.cart_items[0].quantity).toBe(2);
      expect.soft(cart.cart_items[0].product.name).toBe(product.name);

      const updated = await cartsRequest.updateItemQuantity(cartId, {
        product_id: product.id,
        quantity: 5,
      });

      expect(updated.status()).toBe(200);

      const afterUpdate = await (await cartsRequest.getOne(cartId)).json();
      // The quantity is replaced, not accumulated onto the existing 2.
      expect.soft(afterUpdate.cart_items[0].quantity).toBe(5);

      const removed = await cartsRequest.deleteItem(cartId, product.id);

      expect(removed.status()).toBe(204);

      const afterRemove = await (await cartsRequest.getOne(cartId)).json();
      // The cart itself outlives its last line item — removing the line empties
      // the cart, it does not delete it.
      expect.soft(afterRemove.cart_items).toEqual([]);

      await cartsRequest.delete(cartId);
    },
  );

  test(
    'adding the same product twice updates the line rather than duplicating it',
    { tag: ['@api', '@cart'] },
    async ({ cartsRequest, productsRequest }) => {
      const products = await (await productsRequest.get()).json();
      const product = products.data[0];
      const cartId = (await (await cartsRequest.post()).json()).id;

      await cartsRequest.addItem(cartId, {
        product_id: product.id,
        quantity: 1,
      });
      const response = await cartsRequest.addItem(cartId, {
        product_id: product.id,
        quantity: 3,
      });

      expect(response.status()).toBe(200);

      const cart = await (await cartsRequest.getOne(cartId)).json();
      expect.soft(cart.cart_items).toHaveLength(1);
      // Repeat adds accumulate onto the existing line (1 + 3), where the quantity
      // endpoint above overwrites it. The two verbs are not interchangeable.
      expect.soft(cart.cart_items[0].quantity).toBe(4);

      await cartsRequest.delete(cartId);
    },
  );

  test(
    'deletes a cart, after which it can no longer be fetched',
    { tag: ['@api', '@cart'] },
    async ({ cartsRequest }) => {
      const cartId = (await (await cartsRequest.post()).json()).id;

      const response = await cartsRequest.delete(cartId);

      expect(response.status()).toBe(204);

      const afterDelete = await cartsRequest.getOne(cartId);
      expect(afterDelete.status()).toBe(404);
    },
  );
});
