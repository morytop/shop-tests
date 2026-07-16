/** The nested billing address the register endpoint accepts (snake_case wire form). */
export interface ApiAddress {
  street: string;
  house_number: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
}

/** POST /users/register request body — field names match the API verbatim. */
export interface UserRegisterPayload {
  first_name: string;
  last_name: string;
  dob: string;
  phone: string;
  address: ApiAddress;
  email: string;
  password: string;
}

/**
 * A deliberately malformed register body. Keys are constrained to the real ones
 * (a typo'd field still fails to compile) but each is optional and untyped, so the
 * validation DDT can omit a required field or send a wrong-typed value — the two
 * things a well-formed `UserRegisterPayload` cannot express.
 */
export type InvalidUserRegisterPayload = Partial<
  Record<keyof UserRegisterPayload, unknown>
>;

/** POST /users/change-password request body. */
export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}
