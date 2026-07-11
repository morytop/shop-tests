import { faker } from '@faker-js/faker';
import { expect, test } from '@src/merge.fixture';

// User Stories v5 — Chat widget (test_plan.md §5.21), covering the widget shell and the
// "Find a product" flow. Both are guest-usable and read-only: nothing here touches an
// account, the cart or an order, so no throwaway user is needed (§3).
//
// The catalog is shared, mutable production data (§3/§9), so the search term is read off a
// live product card immediately before searching rather than hard-coded. That also means
// the result count can only be asserted against the widget's ≤5 cap, never an exact number.
//
// Each test drives at most one search per page load: the chat transcript accumulates, so an
// earlier search's cards would otherwise still be counted (§32).
//
// See test_plan.md §32 and .ai-docs/chat-widget-find-product-plan.md.

test.describe('Verify chat widget', () => {
  // AC1 — the toggle is present bottom-right on any page, not just the home page.
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

  // AC1 — opening the widget greets the user and offers the four documented options. The
  // labels are the app's actual copy, which is reworded vs. the docs (§9).
  test(
    'open the widget to a four-option menu',
    { tag: ['@chat', '@regression'] },
    async ({ chatWidget, homePage }) => {
      await homePage.goto();

      await chatWidget.open();

      await expect(chatWidget.window).toBeVisible();
      await expect(chatWidget.title).toHaveText('Chat Assistant');
      await expect(chatWidget.botMessages.first()).toContainText(
        'Hi! How can I help you today?',
      );
      await expect(chatWidget.menuActionButtons).toHaveText([
        'Find a product',
        'Order a product',
        'Checkout',
        'Create support ticket',
      ]);
      await expect(chatWidget.toggleButton).toBeHidden();
    },
  );

  // AC2 — a search answers with at most five product cards, including the product searched
  // for. The cap is the assertion the AC actually makes; forcing *more* than five matches
  // would take a hard-coded broad term, which §3 rules out (the cap itself was confirmed
  // live — a catch-all query returns exactly 5).
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

      const resultCount = await chatWidget.productCards.count();
      expect(resultCount).toBeGreaterThanOrEqual(1);
      expect(resultCount).toBeLessThanOrEqual(5);
      await expect(chatWidget.productCardNames).toContainText([productName]);
      await expect(chatWidget.productCardPrices.first()).toHaveText(
        /^\$\d+\.\d{2}$/,
      );
      await expect(chatWidget.productCardImages.first()).toBeVisible();
    },
  );

  // AC2 — the result card navigates to that product's detail page. The card *is* the
  // control: there is no "View Product" button as the plan assumed (§32). The id is dynamic
  // and products can vanish mid-session (§9), so the target is matched on the name the chat
  // itself rendered, not a cached id.
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

      await expect(page).toHaveURL(/\/product\/\w+$/);
      await expect(productDetailPage.productName).toHaveText(resultName);
      await expect(productDetailPage.addToCartButton).toBeVisible();
      // Routing away tears the conversation down — the widget reverts to its closed state.
      await expect(chatWidget.window).toBeHidden();
      await expect(chatWidget.toggleButton).toBeVisible();
    },
  );

  // AC2, negative path (§6) — a search matching nothing answers with the no-match reply
  // rather than an empty result list.
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
});
