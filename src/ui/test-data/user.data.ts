import { USER_EMAIL, USER_PASSWORD } from '@config/env.config';
import { LoginUser } from '@src/ui/models/user.model';

export const testUser1: LoginUser = {
  email: USER_EMAIL,
  password: USER_PASSWORD,
};
