/**
 * Body of `POST /carts/{cartId}` (add item) and `PUT /carts/{cartId}/product/quantity`
 * (update quantity) — the two share the same shape.
 */
export interface CartItemPayload {
  product_id: string;
  quantity: number;
}

/** The same body with any field missing or of the wrong type, for negative specs. */
export type InvalidCartItemPayload = Partial<
  Record<keyof CartItemPayload, unknown>
>;
