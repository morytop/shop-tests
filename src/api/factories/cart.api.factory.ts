import { CartsRequest } from '@src/api/requests/carts.request';
import { ProductsRequest } from '@src/api/requests/products.request';
import { expect } from '@src/fixtures/merge.fixture';

export interface CartWithProduct {
  cartId: string;
  /** The live product the cart holds — its id/name/price, as the catalog returned it. */
  product: { id: string; name: string; price: number };
}

/**
 * Create a cart holding one live product, for specs that need a cart as a
 * precondition rather than as the thing under test (invoices, chiefly).
 *
 * The product id is resolved from the live catalog (§3) — no id is ever
 * hard-coded. Carts are throwaway server objects owned by nobody, so creating
 * one is safe; the caller should still `DELETE` it when the cart outlives the
 * test's purpose for it.
 *
 * The whole arrange retries with everything re-resolved (§33): the shared
 * catalog mutates and periodically reseeds under live runs, so the product id
 * read from the list can be gone by the time the add-item lands (a 422, which
 * provably wrote nothing — safe to retry). The cart is re-created per attempt
 * for the same reason; an abandoned throwaway cart is harmless.
 */
export async function createCartWithProduct(
  cartsRequest: CartsRequest,
  productsRequest: ProductsRequest,
  quantity = 1,
): Promise<CartWithProduct> {
  const maxAttempts = 3;
  let addedStatus = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const created = await cartsRequest.post();
    expect(
      created.status(),
      `cart create expected 201, got ${created.status()}`,
    ).toBe(201);
    const cartId = (await created.json()).id;

    const products = await (await productsRequest.get()).json();
    const product = products.data[0];

    const added = await cartsRequest.addItem(cartId, {
      product_id: product.id,
      quantity,
    });
    if (added.status() === 200) {
      return { cartId, product };
    }
    addedStatus = added.status();
  }

  expect(
    addedStatus,
    `add item expected 200, got ${addedStatus} after ${maxAttempts} attempts`,
  ).toBe(200);
  throw new Error('unreachable — the expect above always fails');
}
