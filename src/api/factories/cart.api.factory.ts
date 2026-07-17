import { CartsRequest } from '@src/api/requests/carts.request';
import { ProductsRequest } from '@src/api/requests/products.request';
import { expect } from '@src/merge.fixture';

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
 */
export async function createCartWithProduct(
  cartsRequest: CartsRequest,
  productsRequest: ProductsRequest,
  quantity = 1,
): Promise<CartWithProduct> {
  const products = await (await productsRequest.get()).json();
  const product = products.data[0];

  const created = await cartsRequest.post();
  expect(
    created.status(),
    `cart create expected 201, got ${created.status()}`,
  ).toBe(201);
  const cartId = (await created.json()).id;

  const added = await cartsRequest.addItem(cartId, {
    product_id: product.id,
    quantity,
  });
  expect(added.status(), `add item expected 200, got ${added.status()}`).toBe(
    200,
  );

  return { cartId, product };
}
