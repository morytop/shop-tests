/** The nested billing address the register endpoint accepts (snake_case wire form). */
export interface ApiAddress {
  street: string;
  house_number: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

export interface UserRegisterPayload {
  first_name: string;
  last_name: string;
  dob: string;
  phone: string;
  address: ApiAddress;
  email: string;
  password: string;
}

export type InvalidUserRegisterPayload = Partial<
  Record<keyof UserRegisterPayload, unknown>
>;

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}
