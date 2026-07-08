import { Address } from '@src/ui/models/address.model';

/**
 * A fixed, known-valid billing address. Kept as a literal rather than faker: the
 * checkout postcode lookup needs a real country/postcode pair (Germany / 12345),
 * so these values can't be randomized.
 */
export function makeValidAddress(): Address {
  return {
    country: 'Germany',
    postalCode: '12345',
    houseNumber: '42',
    street: 'Main Street',
    city: 'Berlin',
    state: 'Bavaria',
  };
}
