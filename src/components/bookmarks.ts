import { Page } from '@playwright/test';

export class BookmarksComponent {
  homeNavLink = this.page.locator('[data-test="nav-home"]');
  categoriesNavDropdown = this.page.locator('[data-test="nav-categories"]');
  handToolsNavLink = this.page.locator('[data-test="nav-hand-tools"]');
  powerToolsNavLink = this.page.locator('[data-test="nav-power-tools"]');
  otherNavLink = this.page.locator('[data-test="nav-other"]');
  specialToolsNavLink = this.page.locator('[data-test="nav-special-tools"]');
  rentalsNavLink = this.page.locator('[data-test="nav-rentals"]');
  contactNavLink = this.page.locator('[data-test="nav-contact"]');
  signInNavLink = this.page.locator('[data-test="nav-sign-in"]');

  constructor(private page: Page) {}
}
