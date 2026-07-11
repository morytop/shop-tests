// The six subjects offered by the contact form's `<select>`. The app submits — and the
// messages list renders — the option *value* (`warranty`), never the visible label
// ("Warranty"), so tests assert against these strings directly (TEST_PLAN.md §30).
export const CONTACT_SUBJECTS = [
  'customer-service',
  'webmaster',
  'return',
  'payments',
  'warranty',
  'status-of-order',
] as const;

export type ContactSubject = (typeof CONTACT_SUBJECTS)[number];
