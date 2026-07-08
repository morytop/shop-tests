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
