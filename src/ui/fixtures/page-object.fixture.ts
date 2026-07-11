import { test as base } from '@playwright/test';
import { AccountPage } from '@src/ui/pages/account.page';
import { AdminAverageSalesPerMonthPage } from '@src/ui/pages/admin-average-sales-per-month.page';
import { AdminAverageSalesPerWeekPage } from '@src/ui/pages/admin-average-sales-per-week.page';
import { AdminBrandsPage } from '@src/ui/pages/admin-brands.page';
import { AdminCategoriesPage } from '@src/ui/pages/admin-categories.page';
import { AdminDashboardPage } from '@src/ui/pages/admin-dashboard.page';
import { AdminMessagesPage } from '@src/ui/pages/admin-messages.page';
import { AdminOrdersPage } from '@src/ui/pages/admin-orders.page';
import { AdminProductsPage } from '@src/ui/pages/admin-products.page';
import { AdminSettingsPage } from '@src/ui/pages/admin-settings.page';
import { AdminStatisticsPage } from '@src/ui/pages/admin-statistics.page';
import { AdminUsersPage } from '@src/ui/pages/admin-users.page';
import { CartPage } from '@src/ui/pages/cart.page';
import { CheckoutAddressPage } from '@src/ui/pages/checkout-address.page';
import { CheckoutPaymentPage } from '@src/ui/pages/checkout-payment.page';
import { CheckoutSigninPage } from '@src/ui/pages/checkout-signin.page';
import { ContactPage } from '@src/ui/pages/contact.page';
import { FavoritesPage } from '@src/ui/pages/favorites.page';
import { ForgotPasswordPage } from '@src/ui/pages/forgot-password.page';
import { HandToolsPage } from '@src/ui/pages/hand-tools.page';
import { HomePage } from '@src/ui/pages/home.page';
import { InvoiceDetailPage } from '@src/ui/pages/invoice-detail.page';
import { InvoicesPage } from '@src/ui/pages/invoices.page';
import { LoginPage } from '@src/ui/pages/login.page';
import { MessageDetailPage } from '@src/ui/pages/message-detail.page';
import { MessagesPage } from '@src/ui/pages/messages.page';
import { OtherPage } from '@src/ui/pages/other.page';
import { PowerToolsPage } from '@src/ui/pages/power-tools.page';
import { ProductDetailPage } from '@src/ui/pages/product-detail.page';
import { ProfilePage } from '@src/ui/pages/profile.page';
import { RegisterPage } from '@src/ui/pages/register.page';
import { RentalsPage } from '@src/ui/pages/rentals.page';
import { SpecialToolsPage } from '@src/ui/pages/special-tools.page';

export type Pages = {
  accountPage: AccountPage;
  adminAverageSalesPerMonthPage: AdminAverageSalesPerMonthPage;
  adminAverageSalesPerWeekPage: AdminAverageSalesPerWeekPage;
  adminBrandsPage: AdminBrandsPage;
  adminCategoriesPage: AdminCategoriesPage;
  adminDashboardPage: AdminDashboardPage;
  adminMessagesPage: AdminMessagesPage;
  adminOrdersPage: AdminOrdersPage;
  adminProductsPage: AdminProductsPage;
  adminSettingsPage: AdminSettingsPage;
  adminStatisticsPage: AdminStatisticsPage;
  adminUsersPage: AdminUsersPage;
  cartPage: CartPage;
  checkoutAddressPage: CheckoutAddressPage;
  checkoutPaymentPage: CheckoutPaymentPage;
  checkoutSigninPage: CheckoutSigninPage;
  contactPage: ContactPage;
  favoritesPage: FavoritesPage;
  forgotPasswordPage: ForgotPasswordPage;
  handToolsPage: HandToolsPage;
  homePage: HomePage;
  invoiceDetailPage: InvoiceDetailPage;
  invoicesPage: InvoicesPage;
  loginPage: LoginPage;
  messageDetailPage: MessageDetailPage;
  messagesPage: MessagesPage;
  otherPage: OtherPage;
  powerToolsPage: PowerToolsPage;
  productDetailPage: ProductDetailPage;
  profilePage: ProfilePage;
  registerPage: RegisterPage;
  rentalsPage: RentalsPage;
  specialToolsPage: SpecialToolsPage;
};

export const pageObjectTest = base.extend<Pages>({
  accountPage: async ({ page }, use) => {
    await use(new AccountPage(page));
  },
  adminAverageSalesPerMonthPage: async ({ page }, use) => {
    await use(new AdminAverageSalesPerMonthPage(page));
  },
  adminAverageSalesPerWeekPage: async ({ page }, use) => {
    await use(new AdminAverageSalesPerWeekPage(page));
  },
  adminBrandsPage: async ({ page }, use) => {
    await use(new AdminBrandsPage(page));
  },
  adminCategoriesPage: async ({ page }, use) => {
    await use(new AdminCategoriesPage(page));
  },
  adminDashboardPage: async ({ page }, use) => {
    await use(new AdminDashboardPage(page));
  },
  adminMessagesPage: async ({ page }, use) => {
    await use(new AdminMessagesPage(page));
  },
  adminOrdersPage: async ({ page }, use) => {
    await use(new AdminOrdersPage(page));
  },
  adminProductsPage: async ({ page }, use) => {
    await use(new AdminProductsPage(page));
  },
  adminSettingsPage: async ({ page }, use) => {
    await use(new AdminSettingsPage(page));
  },
  adminStatisticsPage: async ({ page }, use) => {
    await use(new AdminStatisticsPage(page));
  },
  adminUsersPage: async ({ page }, use) => {
    await use(new AdminUsersPage(page));
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
  favoritesPage: async ({ page }, use) => {
    await use(new FavoritesPage(page));
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
  invoiceDetailPage: async ({ page }, use) => {
    await use(new InvoiceDetailPage(page));
  },
  invoicesPage: async ({ page }, use) => {
    await use(new InvoicesPage(page));
  },
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },
  messageDetailPage: async ({ page }, use) => {
    await use(new MessageDetailPage(page));
  },
  messagesPage: async ({ page }, use) => {
    await use(new MessagesPage(page));
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
  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
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
