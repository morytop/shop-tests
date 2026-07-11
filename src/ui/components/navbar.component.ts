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
  readonly cartLink: Locator;
  readonly cartQuantity: Locator;
  readonly userMenu: Locator;
  readonly signOutNavLink: Locator;
  readonly adminDashboardNavLink: Locator;
  readonly adminBrandsNavLink: Locator;
  readonly adminCategoriesNavLink: Locator;
  readonly adminProductsNavLink: Locator;
  readonly adminOrdersNavLink: Locator;
  readonly adminUsersNavLink: Locator;
  readonly adminMessagesNavLink: Locator;
  readonly adminSettingsNavLink: Locator;
  readonly adminStatisticsNavLink: Locator;
  readonly averageMonthSalesNavLink: Locator;
  readonly averageWeekSalesNavLink: Locator;

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
    // Cart badge is rendered only once the cart is non-empty.
    this.cartLink = this.page.locator('[data-test="nav-cart"]');
    this.cartQuantity = this.page.locator('[data-test="cart-quantity"]');

    // Account dropdown, labelled with the signed-in user's name. For an admin it also
    // holds every admin section link — there is no sidebar (test_plan.md §9, §31). The
    // links are in the DOM but hidden until the dropdown is opened.
    this.userMenu = this.page.locator('[data-test="nav-menu"]');
    this.signOutNavLink = this.page.locator('[data-test="nav-sign-out"]');
    this.adminDashboardNavLink = this.page.locator(
      '[data-test="nav-admin-dashboard"]',
    );
    this.adminBrandsNavLink = this.page.locator(
      '[data-test="nav-admin-brands"]',
    );
    this.adminCategoriesNavLink = this.page.locator(
      '[data-test="nav-admin-categories"]',
    );
    this.adminProductsNavLink = this.page.locator(
      '[data-test="nav-admin-products"]',
    );
    this.adminOrdersNavLink = this.page.locator(
      '[data-test="nav-admin-orders"]',
    );
    this.adminUsersNavLink = this.page.locator('[data-test="nav-admin-users"]');
    this.adminMessagesNavLink = this.page.locator(
      '[data-test="nav-admin-messages"]',
    );
    this.adminSettingsNavLink = this.page.locator(
      '[data-test="nav-admin-settings"]',
    );
    this.adminStatisticsNavLink = this.page.locator(
      '[data-test="nav-admin-statistics"]',
    );
    this.averageMonthSalesNavLink = this.page.locator(
      '[data-test="nav-average-month-sales"]',
    );
    this.averageWeekSalesNavLink = this.page.locator(
      '[data-test="nav-average-week-sales"]',
    );
  }

  async openCategories(): Promise<void> {
    await this.categoriesNavDropdown.click();
  }

  async openUserMenu(): Promise<void> {
    await this.userMenu.click();
  }
}
