import { AdminPage } from './admin.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

export class AdminStatisticsPage extends AdminPage {
  readonly PAGE_URL = PAGE_URLS.ADMIN_STATISTICS;
  readonly topSellingCategoriesHeading: Locator;
  readonly mostPurchasedProductsHeading: Locator;
  readonly customersByCountryHeading: Locator;
  readonly totalSalesPerCountryHeading: Locator;
  readonly reportTables: Locator;

  constructor(page: Page) {
    super(page);
    this.topSellingCategoriesHeading = this.page.getByRole('heading', {
      name: 'Top 10 Best Selling Categories',
    });
    this.mostPurchasedProductsHeading = this.page.getByRole('heading', {
      name: 'Top 10 Most Purchased Products',
    });
    this.customersByCountryHeading = this.page.getByRole('heading', {
      name: 'Customers By Country',
    });
    this.totalSalesPerCountryHeading = this.page.getByRole('heading', {
      name: 'Total Sales Per Country',
    });
    this.reportTables = this.page.getByRole('table');
  }
}
