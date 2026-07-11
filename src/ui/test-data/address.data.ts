import { AddressTextField } from '@src/ui/models/address.model';

/**
 * Max accepted length per text field, enforced by Angular validators (there are
 * no native `maxlength` attributes). Verified live (TEST_PLAN.md §16): the field
 * turns `ng-invalid` and the proceed button stays disabled one character over.
 */
export const ADDRESS_MAX_LENGTHS: Record<AddressTextField, number> = {
  postalCode: 10,
  houseNumber: 10,
  street: 70,
  city: 40,
  state: 40,
};
