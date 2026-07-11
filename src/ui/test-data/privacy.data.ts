/**
 * The privacy policy's section titles, in the order the page renders them (TEST_PLAN.md §5.24).
 *
 * They are `<strong>` elements, not headings — the page has no `<h1>`–`<h6>` at all (§35), so
 * the trailing colon is part of the rendered text and must be kept for an exact-text assertion.
 * Production ships two sections the plan's AC does not list ("Information Sharing", "Changes to
 * the Privacy Policy"); asserting the full ordered list catches drift in either direction.
 */
export const privacySectionTitles = [
  'Information We Collect:',
  'Use of Google Sign-In:',
  'Data Removal:',
  'Third-Party Services:',
  'Data Security:',
  'Information Sharing:',
  'Changes to the Privacy Policy:',
  'Contact Us:',
];
