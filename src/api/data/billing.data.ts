import { PostcodeLookupParams } from '@src/api/models/postcode.api.model';

export const LOOKUP_ADDRESS: PostcodeLookupParams = {
  country: 'DE',
  postcode: '12345',
  housenumber: '42',
};

export const INVALID_POSTCODE_FOR_COUNTRY = 'ZZZZZ';
