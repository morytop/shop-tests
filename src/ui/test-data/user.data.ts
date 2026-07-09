import { USER_EMAIL, USER_PASSWORD } from '@config/env.config';
import {
  LoginUser,
  PasswordStrengthLevel,
  RequiredProfileField,
} from '@src/ui/models/user.model';

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

/**
 * The three ways the change-password form can be rejected. All are enforced
 * server-side — the submit button never disables and `POST /users/change-password`
 * always fires (test_plan.md §25). `confirmationMismatch` is the API's 422 copy, not
 * the "Passwords do not match." the plan originally documented.
 */
export const CHANGE_PASSWORD_ERRORS = {
  confirmationMismatch: 'The new password field confirmation does not match.',
  wrongCurrentPassword:
    'Your current password does not matches with the password.',
  sameAsCurrentPassword:
    'New Password cannot be same as your current password.',
} as const;

/**
 * The change-password strength meter, one criterion per step: non-empty, then ≥8
 * characters, an uppercase letter, a digit and a symbol. Each sample adds exactly one
 * criterion to the one above it. Unlike the register form's meter — which is broken in
 * production (test_plan.md §19) — this one tracks the typed value correctly (§25).
 */
export const PASSWORD_STRENGTH_LEVELS: PasswordStrengthLevel[] = [
  { password: 'a', label: 'Weak', width: '20%' },
  { password: 'abcdefgh', label: 'Moderate', width: '40%' },
  { password: 'Abcdefgh', label: 'Strong', width: '60%' },
  { password: 'Abcdefg1', label: 'Very Strong', width: '80%' },
  { password: 'Abcdefg1!', label: 'Excellent', width: '100%' },
];
