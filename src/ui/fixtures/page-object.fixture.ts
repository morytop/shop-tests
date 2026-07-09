import { test as base } from '@playwright/test';
import { AccountPage } from '@src/ui/pages/account.page';
import { CartPage } from '@src/ui/pages/cart.page';
import { CheckoutAddressPage } from '@src/ui/pages/checkout-address.page';
import { CheckoutPaymentPage } from '@src/ui/pages/checkout-payment.page';
import { CheckoutSigninPage } from '@src/ui/pages/checkout-signin.page';
import { ContactPage } from '@src/ui/pages/contact.page';
import { ForgotPasswordPage } from '@src/ui/pages/forgot-password.page';
import { HandToolsPage } from '@src/ui/pages/hand-tools.page';
import { HomePage } from '@src/ui/pages/home.page';
import { LoginPage } from '@src/ui/pages/login.page';
import { OtherPage } from '@src/ui/pages/other.page';
import { PowerToolsPage } from '@src/ui/pages/power-tools.page';
import { ProductDetailPage } from '@src/ui/pages/product-detail.page';
import { RegisterPage } from '@src/ui/pages/register.page';
import { RentalsPage } from '@src/ui/pages/rentals.page';
import { SpecialToolsPage } from '@src/ui/pages/special-tools.page';

export type Pages = {
  accountPage: AccountPage;
  cartPage: CartPage;
  checkoutAddressPage: CheckoutAddressPage;
  checkoutPaymentPage: CheckoutPaymentPage;
  checkoutSigninPage: CheckoutSigninPage;
  contactPage: ContactPage;
  forgotPasswordPage: ForgotPasswordPage;
  handToolsPage: HandToolsPage;
  homePage: HomePage;
  loginPage: LoginPage;
  otherPage: OtherPage;
  powerToolsPage: PowerToolsPage;
  productDetailPage: ProductDetailPage;
  registerPage: RegisterPage;
  rentalsPage: RentalsPage;
  specialToolsPage: SpecialToolsPage;
};

export const pageObjectTest = base.extend<Pages>({
  accountPage: async ({ page }, use) => {
    await use(new AccountPage(page));
  },
  cartPage: async ({ page }, use) => {
    await use(new CartPage(page));
  },
  checkoutAddressPage: async ({ page }, use) => {
    await use(new CheckoutAddressPage(page));
  },
  checkoutPaymentPage: async ({ page }, use) => {
    await use(new CheckoutPaymentPage(page));
  },
  checkoutSigninPage: async ({ page }, use) => {
    await use(new CheckoutSigninPage(page));
  },
  contactPage: async ({ page }, use) => {
    await use(new ContactPage(page));
  },
  forgotPasswordPage: async ({ page }, use) => {
    await use(new ForgotPasswordPage(page));
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
  productDetailPage: async ({ page }, use) => {
    await use(new ProductDetailPage(page));
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
});
