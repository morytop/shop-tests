// True when `values` is ordered pairwise under `comparator(previous, current)`.
// e.g. ascending numbers: isSorted(prices, (a, b) => a <= b).
export function isSorted(
  values: number[],
  comparator: (a: number, b: number) => boolean,
): boolean {
  return values.every(
    (value, i) => i === 0 || comparator(values[i - 1], value),
  );
}

// True when `values` is alphabetically ordered in `direction`, using
// locale-aware comparison so the spec need not spell out localeCompare.
export function isSortedByString(
  values: string[],
  direction: 'asc' | 'desc',
): boolean {
  return values.every((value, i) => {
    if (i === 0) {
      return true;
    }
    const order = value.localeCompare(values[i - 1]);
    return direction === 'asc' ? order >= 0 : order <= 0;
  });
}
