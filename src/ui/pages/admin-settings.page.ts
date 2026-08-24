import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

export class AdminSettingsPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.ADMIN_SETTINGS;
  readonly paymentEndpointInput: Locator;
  readonly geolocationInput: Locator;
  readonly co2ScaleToggle: Locator;
  readonly ecoBadgeToggle: Locator;
  readonly settingsSubmit: Locator;

  constructor(page: Page) {
    super(page);
    this.paymentEndpointInput = this.page.getByTestId('payment-endpoint');
    this.geolocationInput = this.page.getByTestId('geolocation');
    this.co2ScaleToggle = this.page.getByTestId('co2-scale-toggle');
    this.ecoBadgeToggle = this.page.getByTestId('eco-badge-toggle');
    this.settingsSubmit = this.page.getByTestId('settings-submit');
  }
}
