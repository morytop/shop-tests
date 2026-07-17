import { UNKNOWN_ID } from '@src/api/data/catalog.data';
import { invalidCartItemCases } from '@src/api/data/invalid-cart-items';
import { CartItemPayload } from '@src/api/models/cart.api.model';
import { expect, test } from '@src/merge.fixture';

test.describe('API carts — rejections', () => {
  for (const invalidCase of invalidCartItemCases) {
    test(
      `rejects adding an item with ${invalidCase.label}`,
      { tag: ['@api', '@cart'] },
      async ({ cartsRequest, productsRequest }) => {
        const products = await (await productsRequest.get()).json();
        const validItem: CartItemPayload = {
          product_id: products.data[0].id,
          quantity: 1,
        };
        const cartId = (await (await cartsRequest.post()).json()).id;

        const response = await cartsRequest.addItem(
          cartId,
          invalidCase.build(validItem),
        );

        expect(
          response.status(),
          `${invalidCase.label} expected 422, got ${response.status()}`,
        ).toBe(422);

        const body = await response.json();
        expect
          .soft(body.errors[invalidCase.field].join(' '))
          .toContain(invalidCase.expectedMessage);

        // The rejected item must not have landed anyway.
        const cart = await (await cartsRequest.getOne(cartId)).json();
        expect.soft(cart.cart_items).toEqual([]);

        await cartsRequest.delete(cartId);
      },
    );
  }

  // The four cart-not-found paths below each answer 404 but phrase it differently
  // ("Requested item not found" / "Cart not found" / "Cart doesn't exist" /
  // "Cart doesnt exists"), so these assert the status only — the messages are
  // inconsistent enough that pinning them would be testing a typo. Noted in
  // PRODUCT_EXPLORATION.md.
  test(
    'returns 404 for a well-formed but unknown cart id',
    { tag: ['@api', '@cart'] },
    async ({ cartsRequest }) => {
      const response = await cartsRequest.getOne(UNKNOWN_ID);

      expect(response.status()).toBe(404);
    },
  );

  test(
    'rejects adding an item to an unknown cart with 404',
    { tag: ['@api', '@cart'] },
    async ({ cartsRequest, productsRequest }) => {
      const products = await (await productsRequest.get()).json();

      const response = await cartsRequest.addItem(UNKNOWN_ID, {
        product_id: products.data[0].id,
        quantity: 1,
      });

      expect(response.status()).toBe(404);
    },
  );

  test(
    'rejects a quantity update on an unknown cart with 404',
    { tag: ['@api', '@cart'] },
    async ({ cartsRequest, productsRequest }) => {
      const products = await (await productsRequest.get()).json();

      const response = await cartsRequest.updateItemQuantity(UNKNOWN_ID, {
        product_id: products.data[0].id,
        quantity: 1,
      });

      expect(response.status()).toBe(404);
    },
  );

  test(
    'rejects deleting an unknown cart with 404',
    { tag: ['@api', '@cart'] },
    async ({ cartsRequest }) => {
      const response = await cartsRequest.delete(UNKNOWN_ID);

      expect(response.status()).toBe(404);
    },
  );
});
