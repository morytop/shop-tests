import { Locator, Page } from '@playwright/test';
import { API_PATHS } from '@src/api/utils/api.util';
import { waitForApi } from '@src/ui/utils/network.util';

/**
 * The chat assistant (`<app-chat-widget>`), rendered outside the router outlet and so
 * present on every page, that's why it is a component not a page
 */
export class ChatWidgetComponent {
  readonly page: Page;
  readonly toggleButton: Locator;
  readonly window: Locator;
  readonly closeButton: Locator;
  readonly title: Locator;
  readonly botMessage: Locator;
  readonly botMessages: Locator;
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
  readonly quantityButtons: Locator;
  readonly confirmOrderAction: Locator;
  readonly addedToCartMessage: Locator;
  readonly supportSubjectButtons: Locator;
  readonly messageTooShortError: Locator;
  readonly skipAttachmentAction: Locator;
  readonly ticketSubmittedMessage: Locator;
  readonly checkoutLoginAction: Locator;
  readonly checkoutGuestAction: Locator;
  readonly cartTotalMessage: Locator;
  readonly confirmAddressAction: Locator;
  readonly paymentMethodButtons: Locator;
  readonly placeOrderAction: Locator;
  readonly billingAddressErrorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.toggleButton = this.page.getByTestId('chat-toggle');
    // The toggle is swapped out for the window while open, so the two are never both present.
    this.window = this.page.getByTestId('chat-window');
    this.closeButton = this.page.getByTestId('chat-close');
    // The title is a bare <span> (no heading role), so it is matched by its visible copy.
    this.title = this.window.getByText('Chat Assistant');
    // Message bubbles carry no data-test; bot and user turns differ only by class.
    this.botMessages = this.page.getByText('Hi! How can I help you today?');
    this.botMessage = this.botMessages.first();
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
    this.productCardImages = this.productCards.getByRole('img');
    this.noProductsFoundMessage = this.window.getByText(
      'No products found. Try a different search.',
    );
    // A search settles as either result cards or the no-match reply; both are a valid
    // "the bot answered" state, so waits synchronise on whichever arrives.
    this.searchReply = this.productCards
      .first()
      .or(this.noProductsFoundMessage.first());
    this.quantityButtons = this.page.getByTestId('chat-action-select-quantity');
    this.confirmOrderAction = this.page.getByTestId(
      'chat-action-confirm-order',
    );
    this.addedToCartMessage = this.window.getByText('Added to your cart!');
    this.supportSubjectButtons = this.page.getByTestId(
      'chat-action-select-subject',
    );
    this.messageTooShortError = this.window.getByText(
      'Your message must be at least 50 characters long.',
    );
    this.skipAttachmentAction = this.page.getByTestId(
      'chat-action-skip-attachment',
    );
    this.ticketSubmittedMessage = this.window.getByText(
      "Your support ticket has been submitted successfully! We'll get back to you soon.",
    );
    this.checkoutLoginAction = this.page.getByTestId(
      'chat-action-checkout-login',
    );
    this.checkoutGuestAction = this.page.getByTestId(
      'chat-action-checkout-guest',
    );
    this.cartTotalMessage = this.window.getByText('Your cart total:');
    this.confirmAddressAction = this.page.getByTestId(
      'chat-action-checkout-confirm-address',
    );
    this.paymentMethodButtons = this.page.getByTestId(
      'chat-action-select-payment-method',
    );
    this.placeOrderAction = this.page.getByTestId(
      'chat-action-checkout-confirm-order',
    );
    this.billingAddressErrorMessage = this.window.getByText(
      'There was an error processing your order:',
    );
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

  async chooseOrderAProduct(): Promise<void> {
    await this.orderProductAction.click();
    await this.messageInput.waitFor();
  }

  async selectOrderQuantity(quantity: number): Promise<void> {
    await this.quantityButtons.first().waitFor();
    await this.quantityButtons
      .getByText(`${quantity}`, { exact: true })
      .click();
    await this.confirmOrderAction.waitFor();
  }

  async confirmOrder(): Promise<void> {
    await this.confirmOrderAction.click();
    await this.addedToCartMessage.waitFor();
  }

  async chooseCheckout(): Promise<void> {
    await this.checkoutAction.click();
  }

  async continueCheckoutAsGuest(email: string): Promise<void> {
    await this.checkoutGuestAction.click();
    await this.messageInput.waitFor();
    await this.messageInput.fill(email);
    await this.sendButton.click();
    await this.window.getByText('Please enter your first name:').waitFor();
  }

  async provideCheckoutAddress(address: {
    firstName: string;
    lastName: string;
    street: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  }): Promise<void> {
    const steps: [string, string][] = [
      [address.firstName, 'Please enter your last name:'],
      [address.lastName, 'Please enter your street address:'],
      [address.street, 'Please enter your city:'],
      [address.city, 'Please enter your state/province:'],
      [address.state, 'Please enter your country:'],
      [address.country, 'Please enter your postal code:'],
      [address.postalCode, 'Please confirm your billing address:'],
    ];
    for (const [value, nextPrompt] of steps) {
      await this.messageInput.fill(value);
      await this.sendButton.click();
      await this.window.getByText(nextPrompt).waitFor();
    }
  }

  async confirmCheckoutAddress(): Promise<void> {
    await this.confirmAddressAction.click();
    await this.paymentMethodButtons.first().waitFor();
  }

  async selectPaymentMethod(method: string): Promise<void> {
    await this.paymentMethodButtons.getByText(method, { exact: true }).click();
    await this.placeOrderAction.waitFor();
  }

  async placeOrder(): Promise<void> {
    await this.placeOrderAction.click();
    await this.billingAddressErrorMessage.waitFor();
  }

  async chooseSupportTicket(): Promise<void> {
    await this.supportTicketAction.click();
    await this.messageInput.waitFor();
  }

  async provideSupportContact(
    firstName: string,
    lastName: string,
    email: string,
  ): Promise<void> {
    await this.messageInput.fill(firstName);
    await this.sendButton.click();
    await this.window.getByText('What is your last name?').waitFor();
    await this.messageInput.fill(lastName);
    await this.sendButton.click();
    await this.window.getByText('What is your email address?').waitFor();
    await this.messageInput.fill(email);
    await this.sendButton.click();
    await this.supportSubjectButtons.first().waitFor();
  }

  async selectSupportSubject(subject: string): Promise<void> {
    await this.supportSubjectButtons
      .getByText(subject, { exact: true })
      .click();
    await this.messageInput.waitFor();
  }

  async submitSupportMessage(message: string): Promise<void> {
    await this.messageInput.fill(message);
    await this.sendButton.click();
    await this.skipAttachmentAction
      .or(this.messageTooShortError)
      .first()
      .waitFor();
  }

  async skipAttachment(): Promise<void> {
    await this.skipAttachmentAction.click();
    await this.ticketSubmittedMessage.waitFor();
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
