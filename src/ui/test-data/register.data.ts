/**
 * Required register-form fields keyed by their `data-test` id → the message shown
 * on empty submit. Errors are submit-gated (`@if (f['x'].invalid && submitted)`),
 * so nothing shows before the first submit (see register.spec.ts).
 */
export const REQUIRED_FIELD_ERRORS: Record<string, string> = {
  'first-name': 'First name is required',
  'last-name': 'Last name is required',
  dob: 'Date of Birth is required',
  country: 'Country is required',
  postal_code: 'Postcode is required',
  house_number: 'House number is required',
  street: 'Street is required',
  city: 'City is required',
  state: 'State is required',
  phone: 'Phone is required.',
  email: 'Email is required',
  password: 'Password is required',
};
