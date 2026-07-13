import { Locator, Page } from '@playwright/test';
import { LanguageCode } from '@src/ui/models/language.model';

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
  readonly languageSelect: Locator;
  readonly languageMenu: Locator;
  readonly languageOptions: Locator;

  constructor(page: Page) {
    this.page = page;
    this.homeNavLink = this.page.getByTestId('nav-home');
    this.categoriesNavDropdown = this.page.getByTestId('nav-categories');
    this.handToolsNavLink = this.page.getByTestId('nav-hand-tools');
    this.powerToolsNavLink = this.page.getByTestId('nav-power-tools');
    this.otherNavLink = this.page.getByTestId('nav-other');
    this.specialToolsNavLink = this.page.getByTestId('nav-special-tools');
    this.rentalsNavLink = this.page.getByTestId('nav-rentals');
    this.contactNavLink = this.page.getByTestId('nav-contact');
    this.signInNavLink = this.page.getByTestId('nav-sign-in');
    // Cart badge is rendered only once the cart is non-empty.
    this.cartLink = this.page.getByTestId('nav-cart');
    this.cartQuantity = this.page.getByTestId('cart-quantity');

    // Account dropdown, labelled with the signed-in user's name. For an admin it also
    // holds every admin section link — there is no sidebar (TEST_PLAN.md §9, §31). The
    // links are in the DOM but hidden until the dropdown is opened.
    this.userMenu = this.page.getByTestId('nav-menu');
    this.signOutNavLink = this.page.getByTestId('nav-sign-out');
    this.adminDashboardNavLink = this.page.getByTestId('nav-admin-dashboard');
    this.adminBrandsNavLink = this.page.getByTestId('nav-admin-brands');
    this.adminCategoriesNavLink = this.page.getByTestId('nav-admin-categories');
    this.adminProductsNavLink = this.page.getByTestId('nav-admin-products');
    this.adminOrdersNavLink = this.page.getByTestId('nav-admin-orders');
    this.adminUsersNavLink = this.page.getByTestId('nav-admin-users');
    this.adminMessagesNavLink = this.page.getByTestId('nav-admin-messages');
    this.adminSettingsNavLink = this.page.getByTestId('nav-admin-settings');
    this.adminStatisticsNavLink = this.page.getByTestId('nav-admin-statistics');
    this.averageMonthSalesNavLink = this.page.getByTestId(
      'nav-average-month-sales',
    );
    this.averageWeekSalesNavLink = this.page.getByTestId(
      'nav-average-week-sales',
    );

    // Language dropdown: the toggle shows the active code ("EN"), and its menu is
    // labelled by it (`aria-labelledby`), which scopes the option menuitems away from
    // the main menubar's own menuitems. The nav's `data-test` ids are language-agnostic,
    // so every other locator here keeps working after a switch (TEST_PLAN.md §34).
    this.languageSelect = this.page.getByTestId('language-select');
    this.languageMenu = this.page.getByRole('menu', {
      name: 'Select language',
    });
    this.languageOptions = this.languageMenu.getByRole('menuitem');
  }

  async openCategories(): Promise<void> {
    await this.categoriesNavDropdown.click();
  }

  async openUserMenu(): Promise<void> {
    await this.userMenu.click();
  }

  async openLanguageMenu(): Promise<void> {
    await this.languageSelect.click();
  }

  async selectLanguage(code: LanguageCode): Promise<void> {
    await this.openLanguageMenu();
    await this.languageOptions
      .filter({ hasText: new RegExp(`^${code}$`) })
      .click();
  }

  /**
   * Wait for the cart badge to show exactly `count`. The cart write is async, so
   * this both confirms an add landed and serialises consecutive adds — a second
   * add fired before the badge updates is otherwise silently lost.
   */
  async waitForCartQuantity(count: string): Promise<void> {
    await this.cartQuantity
      .filter({ hasText: new RegExp(`^${count}$`) })
      .waitFor();
  }
}
