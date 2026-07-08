// Parse a displayed price like "$19.99" into a number. Tolerates surrounding
// whitespace so callers can pass raw innerText without pre-trimming.
export function parsePrice(text: string): number {
  return Number(text.replace('$', '').trim());
}
