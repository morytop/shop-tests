import {
  InvalidUserRegisterPayload,
  UserRegisterPayload,
} from '@src/api/models/user.api.model';

export interface InvalidUserCase {
  label: string;
  field: keyof UserRegisterPayload;
  expectedMessage: string;
  build: (valid: UserRegisterPayload) => InvalidUserRegisterPayload;
}

/**
 * Only four fields are actually required — `dob`, `phone` and the whole `address`
 * object are optional on this endpoint (proven by the "optional field" tests in
 * `users.register.api.spec.ts`), which is why they are absent from this table
 * despite the UI marking them required.
 *
 * `email` is checked for presence but NOT for format: a malformed address
 * registers successfully. That gap is pinned by its own test in the spec and
 * recorded in PRODUCT_EXPLORATION.md — it is deliberately not a row here, because
 * every row in this table asserts a 422.
 */
export const invalidUserCases: InvalidUserCase[] = [
  {
    label: 'a missing first name',
    field: 'first_name',
    expectedMessage: 'required',
    build: (valid) => ({ ...valid, first_name: undefined }),
  },
  {
    label: 'a missing last name',
    field: 'last_name',
    expectedMessage: 'required',
    build: (valid) => ({ ...valid, last_name: undefined }),
  },
  {
    label: 'a missing email',
    field: 'email',
    expectedMessage: 'required',
    build: (valid) => ({ ...valid, email: undefined }),
  },
  {
    label: 'an empty email',
    field: 'email',
    expectedMessage: 'required',
    build: (valid) => ({ ...valid, email: '' }),
  },
  {
    label: 'a missing password',
    field: 'password',
    expectedMessage: 'required',
    build: (valid) => ({ ...valid, password: undefined }),
  },
  {
    label: 'a password under 8 characters',
    field: 'password',
    expectedMessage: 'at least 8 characters',
    build: (valid) => ({ ...valid, password: '1!Aa' }),
  },
  {
    label: 'a password with no uppercase, symbol or digit',
    field: 'password',
    expectedMessage: 'at least one uppercase and one lowercase letter',
    build: (valid) => ({ ...valid, password: 'aaaaaaaaaaaa' }),
  },
  {
    label: 'a first name over 40 characters',
    field: 'first_name',
    expectedMessage: 'must not be greater than 40 characters',
    build: (valid) => ({ ...valid, first_name: 'x'.repeat(41) }),
  },
  {
    label: 'a date of birth in the wrong format',
    field: 'dob',
    expectedMessage: 'must match the format Y-m-d',
    build: (valid) => ({ ...valid, dob: '05-05-1990' }),
  },
  {
    label: 'a date of birth under 18 years ago',
    field: 'dob',
    expectedMessage: '18 years old',
    build: (valid) => ({
      ...valid,
      dob: new Date().toLocaleDateString('en-CA'),
    }),
  },
];

export const optionalUserFields: (keyof UserRegisterPayload)[] = [
  'dob',
  'phone',
  'address',
];
