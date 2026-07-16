import { API_URL } from '@config/env.config';

// Endpoint paths, defined once: the absolute `apiUrls` below (request objects) and
// the UI-side response waits (`waitForApi` in `src/ui/utils/network.util.ts`) both
// derive from this map, so a path can't drift between the API layer and a page
// object's wait.
export const API_PATHS = {
  BRANDS: '/brands',
  BRANDS_SEARCH: '/brands/search',
  CARTS: '/carts',
  CATEGORIES: '/categories',
  CATEGORIES_SEARCH: '/categories/search',
  CATEGORIES_TREE: '/categories/tree',
  CHANGE_PASSWORD: '/users/change-password',
  FAVORITES: '/favorites',
  FORGOT_PASSWORD: '/users/forgot-password',
  IMAGES: '/images',
  INVOICES: '/invoices',
  INVOICES_GUEST: '/invoices/guest',
  INVOICES_SEARCH: '/invoices/search',
  LOGIN: '/users/login',
  MESSAGES: '/messages',
  PAYMENT_CHECK: '/payment/check',
  POSTCODE_LOOKUP: '/postcode-lookup',
  PRODUCTS: '/products',
  PRODUCT_SEARCH: '/products/search',
  PRODUCT_SPECS_NAMES: '/product-specs/names',
  REGISTER: '/users/register',
  REPORT_AVERAGE_SALES_PER_MONTH: '/reports/average-sales-per-month',
  REPORT_AVERAGE_SALES_PER_WEEK: '/reports/average-sales-per-week',
  REPORT_CUSTOMERS_BY_COUNTRY: '/reports/customers-by-country',
  REPORT_TOP10_BEST_SELLING_CATEGORIES:
    '/reports/top10-best-selling-categories',
  REPORT_TOP10_PURCHASED_PRODUCTS: '/reports/top10-purchased-products',
  REPORT_TOTAL_SALES_OF_YEARS: '/reports/total-sales-of-years',
  REPORT_TOTAL_SALES_PER_COUNTRY: '/reports/total-sales-per-country',
  TOTP_SETUP: '/totp/setup',
  TOTP_VERIFY: '/totp/verify',
  USERS: '/users',
  USERS_LOGOUT: '/users/logout',
  USERS_ME: '/users/me',
  USERS_REFRESH: '/users/refresh',
  USERS_SEARCH: '/users/search',
} as const;

// Absolute URLs, one per path above: the Toolshop API is a different host from the
// UI baseURL, so request objects can't rely on Playwright's baseURL and address it
// in full. Derived mechanically so every new path gets its URL for free.
export const apiUrls = Object.fromEntries(
  Object.entries(API_PATHS).map(([name, path]) => [name, `${API_URL}${path}`]),
) as Readonly<Record<keyof typeof API_PATHS, string>>;
