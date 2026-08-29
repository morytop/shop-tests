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
export interface LoginUser {
  email: string;
  password: string;
}

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

export type RequiredProfileField = keyof Pick<
  ProfileDetails,
  'firstName' | 'lastName' | 'street' | 'city' | 'country'
>;

export interface PasswordStrengthLevel {
  password: string;
  label: string;
  width: string;
}
