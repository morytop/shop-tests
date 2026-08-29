export interface CartItemPayload {
  product_id: string;
  quantity: number;
}

export type InvalidCartItemPayload = Partial<
  Record<keyof CartItemPayload, unknown>
>;
