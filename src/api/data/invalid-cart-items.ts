import { UNKNOWN_ID } from '@src/api/data/catalog.data';
import {
  CartItemPayload,
  InvalidCartItemPayload,
} from '@src/api/models/cart.api.model';

export interface InvalidCartItemCase {
  label: string;
  /** Key the 422 body must carry an error array under. */
  field: keyof CartItemPayload;
  /** Substring the reported message must contain. */
  expectedMessage: string;
  build: (valid: CartItemPayload) => InvalidCartItemPayload;
}

export const invalidCartItemCases: InvalidCartItemCase[] = [
  {
    label: 'a missing product id',
    field: 'product_id',
    expectedMessage: 'required',
    build: (valid) => ({ ...valid, product_id: undefined }),
  },
  {
    label: 'a missing quantity',
    field: 'quantity',
    expectedMessage: 'required',
    build: (valid) => ({ ...valid, quantity: undefined }),
  },
  {
    // Referential integrity is enforced by the validator, so an unknown product
    // reads as an invalid field rather than a 404 on the product.
    label: 'a well-formed but unknown product id',
    field: 'product_id',
    expectedMessage: 'The selected product id is invalid',
    build: (valid) => ({ ...valid, product_id: UNKNOWN_ID }),
  },
  {
    label: 'a zero quantity',
    field: 'quantity',
    expectedMessage: 'must be at least 1',
    build: (valid) => ({ ...valid, quantity: 0 }),
  },
  {
    label: 'a negative quantity',
    field: 'quantity',
    expectedMessage: 'must be at least 1',
    build: (valid) => ({ ...valid, quantity: -3 }),
  },
  {
    label: 'a non-numeric quantity',
    field: 'quantity',
    expectedMessage: 'must be an integer',
    build: (valid) => ({ ...valid, quantity: 'two' }),
  },
];
