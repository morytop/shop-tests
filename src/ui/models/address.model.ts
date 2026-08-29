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
