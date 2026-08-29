import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  USER_EMAIL,
  USER_PASSWORD,
} from '@config/env.config';
import {
  LoginUser,
  PasswordStrengthLevel,
  ProfileDetails,
  RequiredProfileField,
} from '@src/ui/models/user.model';

export const testUser1: LoginUser = {
  email: USER_EMAIL,
  password: USER_PASSWORD,
};

export const adminUser: LoginUser = {
  email: ADMIN_EMAIL,
  password: ADMIN_PASSWORD,
};

export const PROFILE_EDITABLE_FIELDS: readonly (keyof ProfileDetails)[] = [
  'firstName',
  'lastName',
  'phone',
  'street',
  'postalCode',
  'city',
  'state',
  'country',
];

export const PROFILE_REQUIRED_FIELDS: RequiredProfileField[] = [
  'firstName',
  'lastName',
  'street',
  'city',
  'country',
];

export const PROFILE_VALIDATION_ERROR =
  'Please correct the highlighted fields before saving.';

export const CHANGE_PASSWORD_ERRORS = {
  confirmationMismatch: 'The new password field confirmation does not match.',
  wrongCurrentPassword:
    'Your current password does not matches with the password.',
  sameAsCurrentPassword:
    'New Password cannot be same as your current password.',
} as const;

export const PASSWORD_STRENGTH_LEVELS: PasswordStrengthLevel[] = [
  { password: 'a', label: 'Weak', width: '20%' },
  { password: 'abcdefgh', label: 'Moderate', width: '40%' },
  { password: 'Abcdefgh', label: 'Strong', width: '60%' },
  { password: 'Abcdefg1', label: 'Very Strong', width: '80%' },
  { password: 'Abcdefg1!', label: 'Excellent', width: '100%' },
];
