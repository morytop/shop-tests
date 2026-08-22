/**
 * Named assertion-timeout constants, per the Assertions section of
 * CODING_STANDARDS.md: a timeout override is never a bare number — its name and
 * comment must explain the app-side timer it accommodates.
 */

/**
 * How long a success banner may take to auto-dismiss. Both inline success banners
 * are removed from the DOM by app-side timers — the forgot-password alert ~3s
 * after render (a `setTimeout`-driven `@if`), the profile form's banner ~5.4s
 * (PRODUCT_EXPLORATION.md §24) — so "the banner disappears" is asserted as
 * `toHaveCount(0)` within this window: the longest timer plus render headroom,
 * deliberately tighter than the global `expect.timeout` so the assertion pins
 * the auto-dismiss window rather than merely waiting out the default.
 */
export const BANNER_DISMISS_TIMEOUT = 10_000;
