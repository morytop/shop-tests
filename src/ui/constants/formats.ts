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

/**
 * The order-confirmation banner (`checkout-payment.page.ts`) has no `data-test` and no
 * ARIA role, so its text is the only stable handle — this is also the locator's own
 * match condition, not just an assertion format.
 */
export const ORDER_CONFIRMATION_REGEX =
  /Thanks for your order! Your invoice number is INV-\d+\./;

/**
 * The password strength meter's fill bar carries its width as an inline
 * `style="width: 20%;"` (trailing semicolon included — verified live on both the
 * register and change-password meters). Shared by both specs so the two
 * assertions can't drift apart in shape again.
 */
export const strengthBarWidthRegex = (width: string): RegExp =>
  new RegExp(`width:\\s*${width};`);
