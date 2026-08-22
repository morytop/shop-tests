/**
 * The confirmation the forgot-password form actually renders: the RAW transloco
 * key, not translated copy. The template reads `t('page.forgot-password.confirm')`
 * while `en.json` defines the copy under `pages.…`, so transloco falls back to
 * echoing the key — a pinned production bug (PRODUCT_EXPLORATION.md §3, bug
 * row 3), not a typo in the test. The intended copy is
 * "Your password is successfully updated!".
 */
export const FORGOT_PASSWORD_CONFIRMATION_TEXT = 'page.forgot-password.confirm';
