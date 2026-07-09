import { API_URL } from '@config/env.config';

// Absolute URLs: the Toolshop API is a different host from the UI baseURL, so
// request objects can't rely on Playwright's baseURL and address it in full.
export const apiUrls = {
  registerUrl: `${API_URL}/users/register`,
  loginUrl: `${API_URL}/users/login`,
  totpSetupUrl: `${API_URL}/totp/setup`,
  totpVerifyUrl: `${API_URL}/totp/verify`,
} as const;
