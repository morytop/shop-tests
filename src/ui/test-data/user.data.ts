import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  USER_EMAIL,
  USER_PASSWORD,
} from '@config/env.config';
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
 * The seeded admin (`admin@practicesoftwaretesting.com`). Shared with everyone using the
 * public demo site, so it is **read-only fixture data** (TEST_PLAN.md §3): sign in, look,
 * assert — never create/edit/delete, never submit a form as this user, and never send it a
 * wrong password (3 failed attempts lock an account permanently, §20).
 */
export const adminUser: LoginUser = {
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
};

/**
 * The required profile fields (blanking any one blocks the save). Phone, postal code
 * and state are optional — blanking them saves fine (TEST_PLAN.md §24).
 */
export const PROFILE_REQUIRED_FIELDS: RequiredProfileField[] = [
  'firstName',
  'lastName',
  'street',
  'city',
  'country',
];

/**
 * The single banner the profile form now shows for any blanked required field. The
 * form validates client-side and raises one generic message rather than surfacing the
 * API's per-field 422 copy ("The first name field is required." etc.) it used to
 * (PRODUCT_EXPLORATION.md §24) — the offending field is identified only by its
 * `ng-invalid` highlighting, not by the banner text.
 */
export const PROFILE_VALIDATION_ERROR =
  'Please correct the highlighted fields before saving.';

/**
 * The three ways the change-password form can be rejected. All are enforced
 * server-side — the submit button never disables and `POST /users/change-password`
 * always fires (TEST_PLAN.md §25). `confirmationMismatch` is the API's 422 copy, not
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
 * production (TEST_PLAN.md §19) — this one tracks the typed value correctly (§25).
 */
export const PASSWORD_STRENGTH_LEVELS: PasswordStrengthLevel[] = [
  { password: 'a', label: 'Weak', width: '20%' },
  { password: 'abcdefgh', label: 'Moderate', width: '40%' },
  { password: 'Abcdefgh', label: 'Strong', width: '60%' },
  { password: 'Abcdefg1', label: 'Very Strong', width: '80%' },
  { password: 'Abcdefg1!', label: 'Excellent', width: '100%' },
];
