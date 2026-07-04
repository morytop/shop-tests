import { AccountPage } from '../pages/account.page';
import { ContactPage } from '../pages/contact.page';
import { HandToolsPage } from '../pages/hand-tools.page';
import { HomePage } from '../pages/home.page';
import { LoginPage } from '../pages/login.page';
import { OtherPage } from '../pages/other.page';
import { PowerToolsPage } from '../pages/power-tools.page';
import { RegisterPage } from '../pages/register.page';
import { RentalsPage } from '../pages/rentals.page';
import { SpecialToolsPage } from '../pages/special-tools.page';
import type { test as base } from '@playwright/test';

export type Pages = {
  accountPage: AccountPage;
  contactPage: ContactPage;
  handToolsPage: HandToolsPage;
  homePage: HomePage;
  loginPage: LoginPage;
  otherPage: OtherPage;
  powerToolsPage: PowerToolsPage;
  registerPage: RegisterPage;
  rentalsPage: RentalsPage;
  specialToolsPage: SpecialToolsPage;
};

type ExtendParams = Parameters<typeof base.extend<Pages>>[0];

export const pages: ExtendParams = {
  accountPage: async ({ page }, use) => {
    await use(new AccountPage(page));
  },
  contactPage: async ({ page }, use) => {
    await use(new ContactPage(page));
  },
  handToolsPage: async ({ page }, use) => {
    await use(new HandToolsPage(page));
  },
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  otherPage: async ({ page }, use) => {
    await use(new OtherPage(page));
  },
  powerToolsPage: async ({ page }, use) => {
    await use(new PowerToolsPage(page));
  },
  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },
  rentalsPage: async ({ page }, use) => {
    await use(new RentalsPage(page));
  },
  specialToolsPage: async ({ page }, use) => {
    await use(new SpecialToolsPage(page));
  },
};
