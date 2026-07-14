import { Locator, Page } from '@playwright/test';
import { API_PATHS } from '@src/api/utils/api.util';
import { waitForApi } from '@src/ui/utils/network.util';

/**
 * The chat assistant (`<app-chat-widget>`), rendered outside the router outlet and so
 * present on every page — it is a component, not a page, and is injected as its own
 * fixture rather than hanging off a PAGE_URL (TEST_PLAN.md §32).
 *
 * The transcript accumulates: an earlier search's result cards stay in the DOM, and
 * "Back to menu" appends a fresh greeting rather than replacing the old one. Callers
 * that count messages or cards must therefore drive one flow per page load.
 */
export class ChatWidgetComponent {
  readonly page: Page;
  readonly toggleButton: Locator;
  readonly window: Locator;
  readonly closeButton: Locator;
  readonly title: Locator;
  readonly botMessages: Locator;
  readonly menuActionButtons: Locator;
  readonly findProductAction: Locator;
  readonly orderProductAction: Locator;
  readonly checkoutAction: Locator;
  readonly supportTicketAction: Locator;
  readonly backToMenuAction: Locator;
  readonly messageInput: Locator;
  readonly sendButton: Locator;
  readonly productCards: Locator;
  readonly productCardNames: Locator;
  readonly productCardPrices: Locator;
  readonly productCardImages: Locator;
  readonly noProductsFoundMessage: Locator;
  readonly searchReply: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toggleButton = this.page.getByTestId('chat-toggle');
    // The toggle is swapped out for the window while open, so the two are never both present.
    this.window = this.page.getByTestId('chat-window');
    this.closeButton = this.page.getByTestId('chat-close');
    this.title = this.window.locator('.chat-title');
    // Message bubbles carry no data-test; bot and user turns differ only by class.
    this.botMessages = this.window.locator('.chat-message.bot-message');
    // The greeting's four options. Scoped to the first bot message because "Back to menu"
    // appends a second greeting with the same four buttons rather than reusing the first.
    this.menuActionButtons = this.botMessages
      .first()
      .locator('.action-buttons')
      .getByRole('button');
    this.findProductAction = this.page.getByTestId('chat-action-find-product');
    this.orderProductAction = this.page.getByTestId(
      'chat-action-order-product',
    );
    this.checkoutAction = this.page.getByTestId('chat-action-start-checkout');
    this.supportTicketAction = this.page.getByTestId(
      'chat-action-support-ticket',
    );
    this.backToMenuAction = this.page.getByTestId('chat-action-back-to-menu');
    this.messageInput = this.page.getByTestId('chat-input');
    this.sendButton = this.page.getByTestId('chat-send');
    // Result cards are clickable in their own right — there is no "View Product" button
    // (TEST_PLAN.md §32). Their name/price are plain classes, not the grid's data-test ids.
    this.productCards = this.page.getByTestId('chat-product');
    this.productCardNames = this.productCards.locator('.product-name');
    this.productCardPrices = this.productCards.locator('.product-price');
    this.productCardImages = this.productCards.locator('img.product-image');
    this.noProductsFoundMessage = this.window.getByText(
      'No products found. Try a different search.',
    );
    // A search settles as either result cards or the no-match reply; both are a valid
    // "the bot answered" state, so waits synchronise on whichever arrives.
    this.searchReply = this.productCards
      .first()
      .or(this.noProductsFoundMessage.first());
  }

  async open(): Promise<void> {
    await this.toggleButton.click();
    await this.window.waitFor();
  }

  async close(): Promise<void> {
    await this.closeButton.click();
  }

  async chooseFindAProduct(): Promise<void> {
    await this.findProductAction.click();
    await this.messageInput.waitFor();
  }

  /**
   * Submit a product search and wait for the bot's reply to render.
   *
   * The widget queries its own endpoint (`QUERY /products/search`, not the grid's
   * `/products`) and renders the reply from that response, so awaiting the response alone
   * would still race the paint — the four prior pre-load races in this suite (§10, §26,
   * §29, §30, §31) are all that same bug. Waiting on the rendered reply covers both the
   * "found" and "no match" branches.
   */
  async searchForProduct(query: string): Promise<void> {
    await this.messageInput.fill(query);
    await Promise.all([
      waitForApi(this.page, API_PATHS.PRODUCT_SEARCH),
      this.sendButton.click(),
    ]);
    await this.searchReply.waitFor();
  }

  async clickProductCard(index: number): Promise<void> {
    await this.productCards.nth(index).click();
  }

  /**
   * Whether the toggle sits in the bottom-right quadrant of the viewport (its documented
   * placement). Kept here rather than in the spec so the nullable box/viewport reads stay
   * out of a test body, where `?.`/`??` trip `playwright/no-conditional-in-test`.
   */
  async isToggleInBottomRightQuadrant(): Promise<boolean> {
    const box = await this.toggleButton.boundingBox();
    const viewport = this.page.viewportSize();
    if (!box || !viewport) return false;

    return box.x > viewport.width / 2 && box.y > viewport.height / 2;
  }
}
