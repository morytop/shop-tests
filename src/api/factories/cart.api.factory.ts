import { CartsRequest } from '@src/api/requests/carts.request';
import { ProductsRequest } from '@src/api/requests/products.request';
import { expect } from '@src/fixtures/merge.fixture';

export interface CartWithProduct {
  cartId: string;
  /** The live product the cart holds — its id/name/price, as the catalog returned it. */
  product: { id: string; name: string; price: number };
}

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
