import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import { expect, test } from '@src/merge.fixture';
import { parsePrice } from '@src/ui/utils/price.util';

// User Stories v5 — Discounts (test_plan.md §5.22). Covers the one discount mechanism
// that is actually automatable: the 15% combination discount a cart earns by holding
// both a rental and a non-rental item. That is also §5.5 AC7/AC8 (cart breakdown + its
// removal) and, carried through to the invoice, §5.17 AC4.
//
// The location-based discount (§5.22 AC2) is NOT automatable — see the skipped test at
// the bottom and §10/§33.
//
// Data safety (§3): the first two tests run entirely on the guest, per-context
// localStorage cart, so they mutate nothing shared. The invoice test places a REAL
// Cash-on-Delivery order (simulated payment, §2), so it registers its own throwaway
// user via the API — never `testUser1` (it IS the shared seeded `customer@`) nor the
// `@logged` session user. Products/rentals are chosen dynamically by card index and
// every amount is read back from the DOM (§3, §9); the app's rounding direction can't
// be pinned from the UI (§33), so the assertions check the *relationships* between
// subtotal, discount, and total rather than reconstructed literals.

test.describe('Verify discounts', () => {
  // §5.5 AC7 — a rental + a non-rental in the cart earns the 15% combination discount,
  // shown as a Subtotal / Discount (15%) / Total breakdown.
  test(
    'cart with a rental and a non-rental item gets the 15% combination discount',
    { tag: ['@checkout', '@discounts', '@regression'] },
    async ({ addProductToCart, addRentalToCart, cartPage }) => {
      await addProductToCart(0, '1');
      await addRentalToCart(0, '2');

      await cartPage.goto();

      await expect(cartPage.productTitles).toHaveCount(2);
      await expect(cartPage.cartDiscountLabel).toBeVisible();

      const lineTotal = parsePrice(
        await cartPage.linePrices.nth(0).innerText(),
      );
      const rentalLineTotal = parsePrice(
        await cartPage.linePrices.nth(1).innerText(),
      );
      const subtotal = parsePrice(await cartPage.cartSubtotal.innerText());
      const discount = parsePrice(await cartPage.cartDiscount.innerText());
      const total = parsePrice(await cartPage.cartTotal.innerText());

      expect(subtotal).toBeCloseTo(lineTotal + rentalLineTotal, 2);
      expect(discount).toBeCloseTo(subtotal * 0.15, 2);
      expect(total).toBeCloseTo(subtotal - discount, 2);
      expect(total).toBeLessThan(subtotal);
    },
  );

  // §5.5 AC8 — removing all items of one type (here the rental) drops the discount: the
  // Subtotal and Discount rows disappear entirely (they are conditional, §33) and the
  // total reverts to the surviving line's plain price.
  test(
    'removing the rental removes the combination discount and reverts the total',
    { tag: ['@checkout', '@discounts', '@regression'] },
    async ({ addProductToCart, addRentalToCart, cartPage }) => {
      await addProductToCart(0, '1');
      await addRentalToCart(0, '2');
      await cartPage.goto();
      await expect(cartPage.cartDiscount).toBeVisible();
      const survivorLine = (
        await cartPage.linePrices.nth(0).innerText()
      ).trim();

      await cartPage.removeItem(1);

      await expect(cartPage.productTitles).toHaveCount(1);
      await expect(cartPage.cartSubtotal).toHaveCount(0);
      await expect(cartPage.cartDiscount).toHaveCount(0);
      await expect(cartPage.cartDiscountLabel).toHaveCount(0);
      await expect(cartPage.cartTotal).toHaveText(survivorLine);
    },
  );

  // §5.17 AC4 — a discounted order's invoice carries the breakdown through: subtotal,
  // the discount amount, the 15% (in the label only — the field itself holds an amount
  // despite its `#additional_discount_percentage` id, §33), and the discounted total.
  // The discount is order-level, so the line items keep their full undiscounted prices;
  // the documented per-line strikethrough belongs to the unautomatable is_location_offer
  // mechanism (§10), not to this discount.
  test(
    'discounted order invoice shows the subtotal, discount, and discounted total',
    { tag: ['@auth', '@checkout', '@discounts', '@invoices', '@regression'] },
    async ({
      accountPage,
      addProductToCart,
      addRentalToCart,
      cartPage,
      invoiceDetailPage,
      invoicesPage,
      loginPage,
      placeCodOrderFromCart,
      usersRequest,
    }) => {
      const user = await registerUserWithApi(usersRequest);
      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.title.waitFor();

      await addProductToCart(0, '1');
      await addRentalToCart(0, '2');
      await cartPage.goto();
      const subtotal = parsePrice(await cartPage.cartSubtotal.innerText());
      const discount = parsePrice(await cartPage.cartDiscount.innerText());

      const order = await placeCodOrderFromCart();

      await invoicesPage.gotoAndAwaitLoaded();
      await invoicesPage.openDetails(order.invoiceNumber);

      // The invoice renders money with a space after the `$` ("$ 12.01"), unlike the
      // cart and the invoice list (§29).
      await expect(invoiceDetailPage.discountLabel).toBeVisible();
      await expect(invoiceDetailPage.subtotal).toHaveValue(
        `$ ${subtotal.toFixed(2)}`,
      );
      await expect(invoiceDetailPage.discount).toHaveValue(
        `$ ${discount.toFixed(2)}`,
      );
      await expect(invoiceDetailPage.total).toHaveValue(
        `$ ${(subtotal - discount).toFixed(2)}`,
      );

      const invoiceTotal = parsePrice(
        await invoiceDetailPage.total.inputValue(),
      );
      expect(invoiceTotal).toBeCloseTo(parsePrice(order.total), 2);
      expect(discount).toBeCloseTo(subtotal * 0.15, 2);

      await expect(invoiceDetailPage.lineItemRows).toHaveCount(2);
    },
  );

  // §5.22 AC2 — location-based discount. Unautomatable, and deliberately kept visible in
  // the suite rather than silently dropped (the §10 pattern for the discounted-product
  // card). Eligibility is decided server-side from the *request IP* via the product's
  // `is_location_offer` flag: §10 mocked Playwright's browser `geolocation` context to
  // London for a live `is_location_offer: true` product and reloaded — no discounted
  // price rendered. The browser Geolocation API is simply not the input, so no amount of
  // client-side mocking can trigger this from a non-eligible CI/dev IP. Verifying it
  // needs a request originating from a supported city (a proxy/VPN or a controllable
  // environment) — manual/exploratory only.
  //
  // The lint rules forbid skipped/assertion-less tests, and rightly so: a skip is
  // normally a temporarily-disabled test. This one is different — it is a permanent
  // marker for an AC that no browser-side test can ever satisfy, kept in the suite so
  // the gap stays visible instead of silently vanishing from the plan. Hence the
  // narrowly-scoped disable rather than a change to the shared config.
  /* eslint-disable-next-line playwright/no-skipped-test, playwright/expect-expect */
  test.skip('location-based discount applies for a supported city', () => {});
});
