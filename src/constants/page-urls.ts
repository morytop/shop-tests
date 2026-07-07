export const PAGE_URLS = {
  HOME: '/',
  ACCOUNT: '/account',
  CONTACT: '/contact',
  HAND_TOOLS: '/category/hand-tools',
  LOGIN: '/auth/login',
  OTHER: '/category/other',
  POWER_TOOLS: '/category/power-tools',
  PRODUCT: '/product',
  REGISTER: '/auth/register',
  RENTALS: '/rentals',
  SPECIAL_TOOLS: '/category/special-tools',
} as const;

export type PageUrl = (typeof PAGE_URLS)[keyof typeof PAGE_URLS];
