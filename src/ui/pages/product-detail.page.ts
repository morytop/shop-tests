import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { API_PATHS } from '@src/api/utils/api.util';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { waitForApi } from '@src/ui/utils/network.util';

/**
 * A single product's detail page (`/product/<id>`). The id is dynamic and the
 * catalog is shared/mutable (TEST_PLAN.md §9), so this page is always reached by
 * clicking a product card from a listing rather than a hard-coded URL — PAGE_URL
 * is only the base path to satisfy BasePage, and goto() is not the entry point.
 */
export class ProductDetailPage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.PRODUCT;
  readonly productImage: Locator;
  readonly productName: Locator;
  readonly productPrice: Locator;
  readonly productDescription: Locator;
  readonly categoryBadge: Locator;
  readonly brandBadge: Locator;
  readonly quantityInput: Locator;
  readonly increaseQuantityButton: Locator;
  readonly decreaseQuantityButton: Locator;
  readonly addToCartButton: Locator;
  readonly addToFavoritesButton: Locator;
  readonly durationSlider: Locator;
  readonly outOfStockLabel: Locator;
  readonly relatedProductsHeading: Locator;
  readonly relatedProductCards: Locator;
  readonly successToast: Locator;
  readonly errorToast: Locator;

  constructor(page: Page) {
    super(page);
    // The main product image is the only `.figure-img`; related cards use `.card-img-top`.
    this.productImage = this.page.locator('img.figure-img');
    this.productName = this.page.getByTestId('product-name');
    // Detail price is a bare number (e.g. "14.15"), unlike the listing card's "$X.XX".
    this.productPrice = this.page.getByTestId('unit-price');
    this.productDescription = this.page.getByTestId('product-description');
    // Category/brand render as pill badges distinguished only by aria-label.
    this.categoryBadge = this.page.getByLabel('category');
    this.brandBadge = this.page.getByLabel('brand');
    this.quantityInput = this.page.getByTestId('quantity');
    this.increaseQuantityButton = this.page.getByTestId('increase-quantity');
    this.decreaseQuantityButton = this.page.getByTestId('decrease-quantity');
    this.addToCartButton = this.page.getByTestId('add-to-cart');
    // The attribute is American, the visible label British ("Add to favourites").
    this.addToFavoritesButton = this.page.getByTestId('add-to-favorites');
    // Rental products replace the quantity stepper with a 1–10h duration slider.
    this.durationSlider = this.page.getByRole('slider', { name: 'ngx-slider' });
    this.outOfStockLabel = this.page.getByTestId('out-of-stock');
    this.relatedProductsHeading = this.page.getByRole('heading', {
      name: 'Related products',
    });
    // The only cards on a detail page are the related-products cards (plain
    // `a.card`, unlike the listing's `a.card[data-test^="product-"]`).
    this.relatedProductCards = this.page.locator('a.card');
    // ngx-toastr renders success and failure into identically-structured toasts that
    // differ only by container class, and a toast raised by an earlier action can still
    // be on screen when the next one arrives — so match the type rather than the generic
    // `.toast-message`. The expected copy is asserted in the spec.
    this.successToast = this.page.locator('.ngx-toastr.toast-success');
    this.errorToast = this.page.locator('.ngx-toastr.toast-error');
  }

  async increaseQuantity(times: number): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.increaseQuantityButton.click();
    }
  }

  async decreaseQuantity(times: number): Promise<void> {
    for (let i = 0; i < times; i++) {
      await this.decreaseQuantityButton.click();
    }
  }

  async setQuantity(value: string): Promise<void> {
    await this.quantityInput.fill(value);
  }

  async addToCart(): Promise<void> {
    await this.addToCartButton.click();
  }

  /**
   * Favorite the product and wait for the write to land, returning the HTTP status.
   *
   * The favorite is persisted by an async `POST /favorites`; navigating straight to the
   * favorites page after a bare click can outrun it, so the response — not the toast —
   * is the synchronisation point. The component fires that POST unconditionally and
   * decides which toast to raise from the server's reply (201 added / 409 duplicate /
   * 401 logged out), so the status is the caller's observable for all three outcomes.
   */
  async addToFavoritesAndAwaitResponse(): Promise<number> {
    const [response] = await Promise.all([
      waitForApi(this.page, API_PATHS.FAVORITES, { method: 'POST' }),
      this.addToFavoritesButton.click(),
    ]);

    return response.status();
  }
}
