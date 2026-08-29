import { faker } from '@faker-js/faker';
import { expect, test } from '@src/fixtures/merge.fixture';
import { makeValidAddress } from '@src/ui/factories/address.factory';
import { USD_PRICE_REGEX } from '@src/ui/utils/formats.util';
import { PRODUCT_DETAIL_URL_REGEX } from '@src/ui/utils/page-urls.util';

test.describe('Verify chat widget', () => {
  test(
    'show the chat toggle in the bottom-right corner of any page',
    { tag: ['@chat', '@regression'] },
    async ({ chatWidget, contactPage, homePage }) => {
      await homePage.goto();

      await expect(chatWidget.toggleButton).toBeVisible();
      await expect(chatWidget.toggleButton).toHaveAttribute(
        'aria-label',
        'Open chat',
      );
      await expect(chatWidget.window).toBeHidden();
      expect(await chatWidget.isToggleInBottomRightQuadrant()).toBe(true);

      await contactPage.goto();

      await expect(chatWidget.toggleButton).toBeVisible();
      expect(await chatWidget.isToggleInBottomRightQuadrant()).toBe(true);
    },
  );

  test(
    'open the widget to a four-option menu',
    { tag: ['@chat', '@regression'] },
    async ({ chatWidget, homePage }) => {
      await homePage.goto();

      await chatWidget.open();

      await expect(chatWidget.window).toBeVisible();
      await expect(chatWidget.title).toHaveText('Chat Assistant');
      await expect(chatWidget.botMessage).toBeVisible();
      await expect(chatWidget.findProductAction).toHaveText('Find a product');
      await expect(chatWidget.orderProductAction).toHaveText('Order a product');
      await expect(chatWidget.checkoutAction).toHaveText('Checkout');
      await expect(chatWidget.supportTicketAction).toHaveText(
        'Create support ticket',
      );
      await expect(chatWidget.toggleButton).toBeHidden();
    },
  );

  test(
    'return at most five product cards for a search',
    { tag: ['@chat', '@regression'] },
    async ({ chatWidget, homePage }) => {
      await homePage.goto();
      const productName = (
        await homePage.productCardNames.first().innerText()
      ).trim();

      await chatWidget.open();
      await chatWidget.chooseFindAProduct();
      await chatWidget.searchForProduct(productName);

      await expect(chatWidget.productCards.first()).toBeVisible();
      await expect(chatWidget.productCards.nth(5)).toHaveCount(0);
      await expect(chatWidget.productCardNames).toContainText([productName]);
      await expect(chatWidget.productCardPrices.first()).toHaveText(
        USD_PRICE_REGEX,
      );
      await expect(chatWidget.productCardImages.first()).toBeVisible();
    },
  );

  test(
    'open a product detail page from a chat search result',
    { tag: ['@chat', '@regression'] },
    async ({ chatWidget, homePage, page, productDetailPage }) => {
      await homePage.goto();
      const searchTerm = (
        await homePage.productCardNames.first().innerText()
      ).trim();
      await chatWidget.open();
      await chatWidget.chooseFindAProduct();
      await chatWidget.searchForProduct(searchTerm);
      const resultName = (
        await chatWidget.productCardNames.first().innerText()
      ).trim();

      await chatWidget.clickProductCard(0);

      await expect(page).toHaveURL(PRODUCT_DETAIL_URL_REGEX);
      await expect(productDetailPage.productName).toHaveText(resultName);
      await expect(productDetailPage.addToCartButton).toBeVisible();
      // Routing away tears the conversation down — the widget reverts to its closed state.
      await expect(chatWidget.window).toBeHidden();
      await expect(chatWidget.toggleButton).toBeVisible();
    },
  );

  test(
    'report no matches for a search that matches no product',
    { tag: ['@chat', '@regression'] },
    async ({ chatWidget, homePage }) => {
      await homePage.goto();
      const unmatchableQuery = faker.string.alpha(20);

      await chatWidget.open();
      await chatWidget.chooseFindAProduct();
      await chatWidget.searchForProduct(unmatchableQuery);

      await expect(chatWidget.noProductsFoundMessage).toBeVisible();
      await expect(chatWidget.productCards).toHaveCount(0);
      await expect(chatWidget.backToMenuAction.last()).toBeVisible();
    },
  );

  test(
    'order a product end-to-end and add it to the cart',
    { tag: ['@chat', '@regression', '@cart'] },
    async ({ chatWidget, homePage, navbar }) => {
      await homePage.goto();
      const productName = (
        await homePage.productCardNames.first().innerText()
      ).trim();

      await chatWidget.open();
      await chatWidget.chooseOrderAProduct();
      await chatWidget.searchForProduct(productName);
      await chatWidget.clickProductCard(0);
      await chatWidget.selectOrderQuantity(2);
      await chatWidget.confirmOrder();

      await expect(chatWidget.addedToCartMessage).toBeVisible();
      await navbar.waitForCartQuantity('2');
    },
  );

  test(
    'submit a support ticket end-to-end',
    { tag: ['@chat', '@regression'] },
    async ({ chatWidget, homePage }) => {
      await homePage.goto();

      await chatWidget.open();
      await chatWidget.chooseSupportTicket();
      await chatWidget.provideSupportContact(
        faker.person.firstName(),
        faker.person.lastName(),
        faker.internet.email(),
      );
      await chatWidget.selectSupportSubject('Webmaster');
      await chatWidget.submitSupportMessage(faker.lorem.sentence(20));
      await chatWidget.skipAttachment();

      await expect(chatWidget.ticketSubmittedMessage).toBeVisible();
    },
  );

  test(
    'reject a support ticket message under 50 characters',
    { tag: ['@chat', '@regression'] },
    async ({ chatWidget, homePage }) => {
      await homePage.goto();

      await chatWidget.open();
      await chatWidget.chooseSupportTicket();
      await chatWidget.provideSupportContact(
        faker.person.firstName(),
        faker.person.lastName(),
        faker.internet.email(),
      );
      await chatWidget.selectSupportSubject('Customer service');
      await chatWidget.submitSupportMessage(faker.lorem.sentence(3));

      await expect(chatWidget.messageTooShortError).toBeVisible();
      await expect(chatWidget.messageInput).toBeVisible();
    },
  );

  test(
    'checkout via chat with an empty cart gets no reply',
    { tag: ['@chat', '@regression', '@checkout'] },
    async ({ chatWidget, homePage }) => {
      await homePage.goto();

      await chatWidget.open();
      await chatWidget.chooseCheckout();

      await expect(chatWidget.cartTotalMessage).toBeHidden();
    },
  );

  test(
    'reject a hand-typed guest address at checkout via chat',
    { tag: ['@chat', '@regression', '@checkout'] },
    async ({ addProductToCart, chatWidget }) => {
      await addProductToCart();
      const address = makeValidAddress();

      await chatWidget.open();
      await chatWidget.chooseCheckout();
      await expect(chatWidget.cartTotalMessage).toBeVisible();
      await chatWidget.continueCheckoutAsGuest(faker.internet.email());
      await chatWidget.provideCheckoutAddress({
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
        street: address.street,
        city: address.city,
        state: address.state,
        country: address.country,
        postalCode: address.postalCode,
      });
      await chatWidget.confirmCheckoutAddress();
      await chatWidget.selectPaymentMethod('Cash on Delivery');
      await chatWidget.placeOrder();

      await expect(chatWidget.billingAddressErrorMessage).toBeVisible();
    },
  );
});
