/**
 * A length-limited text field on the Billing Address form. Country is excluded:
 * it's a `<select>`, not a text input (test_plan.md §9).
 */
export type AddressTextField =
  | 'postalCode'
  | 'houseNumber'
  | 'street'
  | 'city'
  | 'state';

export type Address = {
  country: string;
  postalCode: string;
  houseNumber: string;
  street: string;
  city: string;
  state: string;
};
