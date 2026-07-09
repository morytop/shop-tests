/** A full customer-registration record — every field the register form requires. */
export interface RegisterUser {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  country: string;
  street: string;
  postcode: string;
  houseNumber: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  password: string;
}

/** The credentials subset used to authenticate an existing account. */
export interface LoginUser {
  email: string;
  password: string;
}

/**
 * The editable fields of the profile form (`/account/profile`). Email is excluded:
 * it renders readonly. Date of birth and house number are collected at registration
 * but are absent from this form (test_plan.md §24).
 */
export interface ProfileDetails {
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  postalCode: string;
  city: string;
  state: string;
  country: string;
}

/**
 * The profile fields the API rejects when blank. Phone, postal code and state are
 * optional — blanking them saves successfully (test_plan.md §24).
 */
export type RequiredProfileField =
  | 'firstName'
  | 'lastName'
  | 'street'
  | 'city'
  | 'country';
