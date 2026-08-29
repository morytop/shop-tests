export const CONTACT_SUBJECTS = [
  'customer-service',
  'webmaster',
  'return',
  'payments',
  'warranty',
  'status-of-order',
] as const;

export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];
