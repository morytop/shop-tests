import { BasePage } from './base.page';
import { Locator, Page } from '@playwright/test';
import { API_PATHS } from '@src/api/utils/api.util';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { waitForApi } from '@src/ui/utils/network.util';

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
    this.productPrice = this.page.getByTestId('unit-price');
    this.productDescription = this.page.getByTestId('product-description');
    this.categoryBadge = this.page.getByLabel('category');
    this.brandBadge = this.page.getByLabel('brand');
    this.quantityInput = this.page.getByTestId('quantity');
    this.increaseQuantityButton = this.page.getByTestId('increase-quantity');
    this.decreaseQuantityButton = this.page.getByTestId('decrease-quantity');
    this.addToCartButton = this.page.getByTestId('add-to-cart');
    this.addToFavoritesButton = this.page.getByTestId('add-to-favorites');
    this.durationSlider = this.page.getByRole('slider', { name: 'ngx-slider' });
    this.outOfStockLabel = this.page.getByTestId('out-of-stock');
    this.relatedProductsHeading = this.page.getByRole('heading', {
      name: 'Related products',
    });
    this.relatedProductCards = this.page.locator('a.card');
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
    for (let attempt = 0; attempt < 3; attempt++) {
      const addedToCart = this.page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          /^\/carts\/[^/]+$/.test(new URL(response.url()).pathname),
      );
      await this.addToCartButton.click();
      if ((await addedToCart).ok()) return;
    }
  }

  async addToFavorites(): Promise<number> {
    const [response] = await Promise.all([
      waitForApi(this.page, API_PATHS.FAVORITES, { method: 'POST' }),
      this.addToFavoritesButton.click(),
    ]);

    return response.status();
  }
}
