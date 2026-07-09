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
