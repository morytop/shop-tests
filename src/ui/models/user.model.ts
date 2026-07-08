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
