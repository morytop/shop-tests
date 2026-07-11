import { AdminPage } from './admin.page';
import { Locator, Page } from '@playwright/test';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

/**
 * Admin settings (`/admin/settings`) — undocumented in the v5 user stories (TEST_PLAN.md
 * §9), covered here at smoke level only.
 *
 * ⚠ This form rewrites **app-wide** configuration (payment endpoint, geolocation, the CO₂
 * scale and eco-badge toggles) for every user of the shared demo site. Nothing here
 * submits it, and `settingsSubmit` is modelled purely so its presence can be asserted —
 * never clicked (§3, §31).
 */
export class AdminSettingsPage extends AdminPage {
  readonly PAGE_URL = PAGE_URLS.ADMIN_SETTINGS;
  readonly paymentEndpointInput: Locator;
  readonly geolocationInput: Locator;
  readonly co2ScaleToggle: Locator;
  readonly ecoBadgeToggle: Locator;
  readonly settingsSubmit: Locator;

  constructor(page: Page) {
    super(page);
    this.paymentEndpointInput = this.page.locator(
      '[data-test="payment-endpoint"]',
    );
    this.geolocationInput = this.page.locator('[data-test="geolocation"]');
    this.co2ScaleToggle = this.page.locator('[data-test="co2-scale-toggle"]');
    this.ecoBadgeToggle = this.page.locator('[data-test="eco-badge-toggle"]');
    this.settingsSubmit = this.page.locator('[data-test="settings-submit"]');
  }
}
