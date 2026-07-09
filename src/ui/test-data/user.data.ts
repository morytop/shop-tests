import { USER_EMAIL, USER_PASSWORD } from '@config/env.config';
import { LoginUser, RequiredProfileField } from '@src/ui/models/user.model';

export const testUser1: LoginUser = {
  email: USER_EMAIL,
  password: USER_PASSWORD,
};

/**
 * The error the profile form shows for each blanked required field. The copy comes
 * from the API's 422 response, hence the dotted `address.*` payload paths rather
 * than the form's own field labels (test_plan.md §24).
 */
export const REQUIRED_PROFILE_FIELD_ERRORS: Record<
  RequiredProfileField,
  string
> = {
  firstName: 'The first name field is required.',
  lastName: 'The last name field is required.',
  street: 'The address.street field is required.',
  city: 'The address.city field is required.',
  country: 'The address.country field is required.',
};
