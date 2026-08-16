/**
 * Named text-format regexes for assertions and wait gates, per the Assertions
 * section of CODING_STANDARDS.md: a format check must say which surface renders
 * the format it pins. Formats with a single owner stay where they are defined
 * (e.g. DATE_TIME_REGEX in date.util.ts).
 */

/** Listing cards, cart rows, and chat result cards render prices as `$19.99`. */
export const USD_PRICE_REGEX = /^\$\d+\.\d{2}$/;

/**
 * The product detail page renders a bare `14.15` — the `$`-less format is a
 * documented per-surface discrepancy (PRODUCT_EXPLORATION.md §12), not an oversight.
 */
export const BARE_PRICE_REGEX = /^\d+\.\d{2}$/;

/**
 * google2fa mints TOTP secrets as 16 base32 characters (80 bits); this pins the
 * shape, not a value. Shared by the totp-setup assertion and the profile page's
 * populated-secret wait gate.
 */
export const TOTP_SECRET_REGEX = /^[A-Z2-7]{16}$/;
