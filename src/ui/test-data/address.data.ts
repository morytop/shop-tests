import { AddressTextField } from '@src/ui/models/address.model';

export const ADDRESS_MAX_LENGTHS: Record<AddressTextField, number> = {
  postalCode: 10,
  houseNumber: 10,
  street: 70,
  city: 40,
  state: 40,
};
