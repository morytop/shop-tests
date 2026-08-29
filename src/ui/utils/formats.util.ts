export const USD_PRICE_REGEX = /^\$\d+\.\d{2}$/;

export const BARE_PRICE_REGEX = /^\d+\.\d{2}$/;

/**
 * The app's server-rendered timestamp format `YYYY-MM-DD HH:mm:ss`,
 * e.g. `2026-07-22 14:03:59` — shown in the messages/invoices lists and the
 * message-detail footer.
 */
export const DATE_TIME_REGEX = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;

export const TOTP_SECRET_REGEX = /^[A-Z2-7]{16}$/;

export const ORDER_CONFIRMATION_REGEX =
  /Thanks for your order! Your invoice number is INV-\d+\./;

export const strengthBarWidthRegex = (width: string): RegExp =>
  new RegExp(`width:\\s*${width};`);

// Parse a displayed price into a number. Formats vary per surface — the cart shows
// "$19.99", the invoice detail page "$ 19.99", and the cart's discount row renders a
// deduction as "- $22.60" — so strip everything that isn't a digit or a decimal point
// and return the magnitude (no caller needs the sign; the deduction is labelled).
export function parsePrice(text: string): number {
  return Number(text.replace(/[^\d.]/g, ''));
}

// Mirrors the app's `TruncatePipe` (`| truncate: 250` in the favorites template):
// longer text is cut to `length`, trimmed, then suffixed; shorter text is returned
// untouched, with no suffix. Reproducing the rule here lets a test assert a truncated
// description against the live product text instead of a hard-coded catalog string.
export function truncate(text: string, length = 250, suffix = '...'): string {
  if (text.length > length) {
    return text.substring(0, length).trim() + suffix;
  }

  return text;
}
