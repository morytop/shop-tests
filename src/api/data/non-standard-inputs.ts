import { UserRegisterPayload } from '@src/api/models/user.api.model';

/**
 * Names that are unusual for a naive validator but perfectly legal for a real
 * person — the counterpart to `invalidUserCases`. Every row must register (201):
 * a rejection here is a real defect, not a passing negative test.
 */
export interface NonStandardUserCase {
  label: string;
  build: (valid: UserRegisterPayload) => UserRegisterPayload;
}

export const nonStandardUserCases: NonStandardUserCase[] = [
  {
    label: 'diacritics in the name',
    build: (valid) => ({ ...valid, first_name: 'Zoë', last_name: 'Müller' }),
  },
  {
    label: 'an apostrophe in the name',
    build: (valid) => ({
      ...valid,
      first_name: 'Sinéad',
      last_name: "O'Brien",
    }),
  },
  {
    label: 'hyphenated names',
    build: (valid) => ({
      ...valid,
      first_name: 'Anne-Marie',
      last_name: 'Smith-Jones',
    }),
  },
  {
    // The upper boundary of the 40-character limit its 41-character sibling in
    // `invalidUserCases` trips.
    label: 'a first name of exactly 40 characters',
    build: (valid) => ({ ...valid, first_name: 'x'.repeat(40) }),
  },
];
