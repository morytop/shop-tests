// Parse a displayed price into a number. Formats vary per surface — the cart shows
// "$19.99", the invoice detail page "$ 19.99", and the cart's discount row renders a
// deduction as "- $22.60" — so strip everything that isn't a digit or a decimal point
// and return the magnitude (no caller needs the sign; the deduction is labelled).
export function parsePrice(text: string): number {
  return Number(text.replace(/[^\d.]/g, ''));
}
