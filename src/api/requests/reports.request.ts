import { APIRequestContext, APIResponse } from '@playwright/test';
import { Headers } from '@src/api/models/headers.api.model';
import { BaseRequest } from '@src/api/requests/base.request';
import { apiUrls } from '@src/api/utils/api.util';

/**
 * The seven admin-only `/reports/*` reads. There is no `/reports` index route,
 * so like `TotpRequest` the inherited `url` goes unused and every endpoint is
 * addressed explicitly. Admin-token GETs only — reports are never mutated.
 */
export class ReportsRequest extends BaseRequest {
  constructor(
    protected request: APIRequestContext,
    headers?: Headers,
  ) {
    super(request, apiUrls.REPORT_TOTAL_SALES_PER_COUNTRY, headers);
  }

  private async getReport(
    url: string,
    params?: Record<string, number>,
  ): Promise<APIResponse> {
    return await this.request.get(url, { headers: this.headers, params });
  }

  async getTotalSalesPerCountry(): Promise<APIResponse> {
    return await this.getReport(apiUrls.REPORT_TOTAL_SALES_PER_COUNTRY);
  }

  async getTop10PurchasedProducts(): Promise<APIResponse> {
    return await this.getReport(apiUrls.REPORT_TOP10_PURCHASED_PRODUCTS);
  }

  async getTop10BestSellingCategories(): Promise<APIResponse> {
    return await this.getReport(apiUrls.REPORT_TOP10_BEST_SELLING_CATEGORIES);
  }

  async getTotalSalesOfYears(years?: number): Promise<APIResponse> {
    return await this.getReport(
      apiUrls.REPORT_TOTAL_SALES_OF_YEARS,
      years === undefined ? undefined : { years },
    );
  }

  async getAverageSalesPerMonth(year?: number): Promise<APIResponse> {
    return await this.getReport(
      apiUrls.REPORT_AVERAGE_SALES_PER_MONTH,
      year === undefined ? undefined : { year },
    );
  }

  async getAverageSalesPerWeek(year?: number): Promise<APIResponse> {
    return await this.getReport(
      apiUrls.REPORT_AVERAGE_SALES_PER_WEEK,
      year === undefined ? undefined : { year },
    );
  }

  async getCustomersByCountry(): Promise<APIResponse> {
    return await this.getReport(apiUrls.REPORT_CUSTOMERS_BY_COUNTRY);
  }
}
