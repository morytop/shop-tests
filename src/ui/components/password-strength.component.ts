import { Locator, Page } from '@playwright/test';

/**
 * The password strength meter (`.strength-bar .fill` + the active label), rendered
 * with identical markup under the register form and the profile change-password
 * form. The root is passed in because the profile page must scope the meter to its
 * change-password form (sibling forms on that page render their own banners/meter
 * markup), while the register page's meter is the only one and matches page-wide.
 * The two instances behave differently in production: the register copy is broken
 * (TEST_PLAN.md §19), the profile copy tracks the typed value (§25).
 */
export class PasswordStrengthComponent {
  readonly fillBar: Locator;
  readonly activeLabel: Locator;

  constructor(root: Page | Locator) {
    this.fillBar = root.locator('.strength-bar .fill');
    this.activeLabel = root.locator('.strength-labels span.active');
  }
}
