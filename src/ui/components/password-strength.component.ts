import { Locator, Page } from '@playwright/test';

/**
 * The password strength meter (`.strength-bar .fill` + the active label), rendered
 * with identical markup under the register form and the profile change-password
 * form.
 */
export class PasswordStrengthComponent {
  readonly fillBar: Locator;
  readonly activeLabel: Locator;

  constructor(root: Page | Locator) {
    this.fillBar = root.locator('.strength-bar .fill');
    this.activeLabel = root.locator('.strength-labels span.active');
  }
}
