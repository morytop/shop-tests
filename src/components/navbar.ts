import { Locator, Page } from '@playwright/test';

export class NavbarComponent {
  readonly page: Page;
  readonly homeNavLink: Locator;
  readonly categoriesNavDropdown: Locator;
  readonly handToolsNavLink: Locator;
  readonly powerToolsNavLink: Locator;
  readonly otherNavLink: Locator;
  readonly specialToolsNavLink: Locator;
  readonly rentalsNavLink: Locator;
  readonly contactNavLink: Locator;
  readonly signInNavLink: Locator;

  constructor(page: Page) {
    this.page = page;
    this.homeNavLink = this.page.locator('[data-test="nav-home"]');
    this.categoriesNavDropdown = this.page.locator(
      '[data-test="nav-categories"]',
    );
    this.handToolsNavLink = this.page.locator('[data-test="nav-hand-tools"]');
    this.powerToolsNavLink = this.page.locator('[data-test="nav-power-tools"]');
    this.otherNavLink = this.page.locator('[data-test="nav-other"]');
    this.specialToolsNavLink = this.page.locator(
      '[data-test="nav-special-tools"]',
    );
    this.rentalsNavLink = this.page.locator('[data-test="nav-rentals"]');
    this.contactNavLink = this.page.locator('[data-test="nav-contact"]');
    this.signInNavLink = this.page.locator('[data-test="nav-sign-in"]');
  }
}
