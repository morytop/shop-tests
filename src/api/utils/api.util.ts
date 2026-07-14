import { API_URL } from '@config/env.config';

// Endpoint paths, defined once: the absolute `apiUrls` below (request objects) and
// the UI-side response waits (`waitForApi` in `src/ui/utils/network.util.ts`) both
// derive from this map, so a path can't drift between the API layer and a page
// object's wait.
export const API_PATHS = {
  FAVORITES: '/favorites',
  FORGOT_PASSWORD: '/users/forgot-password',
  INVOICES: '/invoices',
  LOGIN: '/users/login',
  MESSAGES: '/messages',
  POSTCODE_LOOKUP: '/postcode-lookup',
  PRODUCTS: '/products',
  PRODUCT_SEARCH: '/products/search',
  REGISTER: '/users/register',
  TOTP_SETUP: '/totp/setup',
  TOTP_VERIFY: '/totp/verify',
} as const;

// Absolute URLs: the Toolshop API is a different host from the UI baseURL, so
// request objects can't rely on Playwright's baseURL and address it in full.
export const apiUrls = {
  registerUrl: `${API_URL}${API_PATHS.REGISTER}`,
  loginUrl: `${API_URL}${API_PATHS.LOGIN}`,
  totpSetupUrl: `${API_URL}${API_PATHS.TOTP_SETUP}`,
  totpVerifyUrl: `${API_URL}${API_PATHS.TOTP_VERIFY}`,
} as const;
