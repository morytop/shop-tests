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
 * but are absent from this form (TEST_PLAN.md §24).
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
 * optional — blanking them saves successfully (TEST_PLAN.md §24).
 */
export type RequiredProfileField =
  | 'firstName'
  | 'lastName'
  | 'street'
  | 'city'
  | 'country';

/**
 * One step of the change-password strength meter: a sample password, and the bar
 * width + label the meter is expected to show for it (TEST_PLAN.md §25).
 */
export interface PasswordStrengthLevel {
  password: string;
  label: string;
  width: string;
}
