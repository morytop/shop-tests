import { expect, test } from '@src/fixtures/merge.fixture';

// User Stories v5 — Rentals (TEST_PLAN.md §5.4). AC1 listing, AC2 detail
// duration slider, AC3 cart labelling. AC4 (location discount) is excluded —
// unautomatable per §10. The catalog is shared/mutable (§3, §9), so rentals are
// selected dynamically (first card) with no hard-coded id/name/price.
test.describe('Verify rentals', () => {
  test(
    'rentals listing shows each rental with an image, name and description',
    { tag: '@regression' },
    async ({ rentalsPage }) => {
      await rentalsPage.goto();

      await expect(rentalsPage.pageHeading).toBeVisible();

      const cardCount = await rentalsPage.rentalCards.count();
      expect(cardCount).toBeGreaterThan(0);
      await expect(rentalsPage.rentalCardImages).toHaveCount(cardCount);
      await expect(rentalsPage.rentalCardNames).toHaveCount(cardCount);
      await expect(rentalsPage.rentalCardDescriptions).toHaveCount(cardCount);
      await expect(rentalsPage.rentalCardImages.first()).toBeVisible();
      await expect(rentalsPage.rentalCardNames.first()).not.toBeEmpty();
      await expect(rentalsPage.rentalCardDescriptions.first()).not.toBeEmpty();
    },
  );

  test(
    'rental detail page shows a duration slider instead of the quantity stepper',
    { tag: '@regression' },
    async ({ rentalsPage, productDetailPage }) => {
      await rentalsPage.goto();

      await rentalsPage.clickRentalCard(0);

      await expect(productDetailPage.durationSlider).toBeVisible();
      await expect(productDetailPage.quantityInput).toHaveCount(0);
    },
  );

  // The §5.4 AC documents "This is a rental item", but the cart actually renders
  // "Item for rent, price per hour" (verified live — see TEST_PLAN.md §13).
  test(
    'rental item added to cart is labelled as a rental',
    { tag: ['@smoke', '@regression'] },
    async ({ rentalsPage, productDetailPage, cartPage, navbar }) => {
      await rentalsPage.goto();
      await rentalsPage.clickRentalCard(0);

      await productDetailPage.addToCart();
      // The add is async; wait for the cart badge before navigating so goto()
      // doesn't abort the in-flight cart write and land on an empty cart.
      await expect(navbar.cartQuantity).toHaveText('1');
      await cartPage.goto();

      await expect(cartPage.rentalItemLabel).toBeVisible();
    },
  );
});
