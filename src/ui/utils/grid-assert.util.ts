import { expect } from '@src/fixtures/merge.fixture';
import { ProductListPage } from '@src/ui/pages/product-list.page';
import { parsePrice } from '@src/ui/utils/price.util';
import { isSorted, isSortedByString } from '@src/ui/utils/sort.util';

/**
 * Grid-ordering assertions over a product listing. Numeric ordering and bounds
 * have no locator formulation, so `expect.poll` is the right tool — and per
 * CODING_STANDARDS these polls live behind a named util (the
 * `expectToMatchSchema()` pattern: an assertion helper in utils is legitimate
 * because it *is* the assertion). Every poll body requires a non-empty read:
 * an empty grid is vacuously "sorted"/"within bounds" and must not pass.
 */

/** Polls until the grid is non-empty and ordered by `field` in `direction`. */
export async function expectGridSorted(
  listPage: ProductListPage,
  field: 'name' | 'price',
  direction: 'asc' | 'desc',
): Promise<void> {
  await expect
    .poll(
      async () => {
        if (field === 'name') {
          const names = await listPage.getProductNames();
          return names.length > 0 && isSortedByString(names, direction);
        }
        const prices = (await listPage.getProductPrices()).map(parsePrice);
        const inOrder =
          direction === 'asc'
            ? (a: number, b: number): boolean => a <= b
            : (a: number, b: number): boolean => a >= b;
        return prices.length > 0 && isSorted(prices, inOrder);
      },
      {
        message: `grid is non-empty and sorted by ${field} (${direction})`,
      },
    )
    .toBe(true);
}

/** Polls until the grid is non-empty and every displayed price is ≤ `max`. */
export async function expectPricesAtMost(
  listPage: ProductListPage,
  max: number,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const prices = (await listPage.getProductPrices()).map(parsePrice);
        return prices.length > 0 && prices.every((price) => price <= max);
      },
      {
        message: `grid is non-empty and every price is at most ${max}`,
      },
    )
    .toBe(true);
}
