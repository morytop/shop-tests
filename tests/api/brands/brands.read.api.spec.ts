import { UNKNOWN_ID } from '@src/api/data/catalog.data';
import { expect, test } from '@src/merge.fixture';

test.describe('API brands — reads', () => {
  test(
    'lists brands as a flat array',
    { tag: ['@api', '@smoke', '@brands'] },
    async ({ brandsRequest }) => {
      const response = await brandsRequest.get();

      expect(response.status()).toBe(200);

      const brands = await response.json();
      expect.soft(brands.length).toBeGreaterThan(0);
      expect.soft(brands[0].id).toBeTruthy();
      expect.soft(brands[0].name).toBeTruthy();
      expect.soft(brands[0].slug).toBeTruthy();
    },
  );

  test(
    'returns a single brand by an id taken from the list',
    { tag: ['@api', '@brands'] },
    async ({ brandsRequest }) => {
      const brands = await (await brandsRequest.get()).json();
      const listed = brands[0];

      const response = await brandsRequest.getOne(listed.id);

      expect(response.status()).toBe(200);

      const brand = await response.json();
      expect.soft(brand.id).toBe(listed.id);
      expect.soft(brand.name).toBe(listed.name);
    },
  );

  test(
    'returns a 404 for a well-formed but unknown brand id',
    { tag: ['@api', '@brands'] },
    async ({ brandsRequest }) => {
      const response = await brandsRequest.getOne(UNKNOWN_ID);

      expect(response.status()).toBe(404);
    },
  );

  test(
    'searches brands by a term drawn from a live brand name',
    { tag: ['@api', '@brands'] },
    async ({ brandsRequest }) => {
      const brands = await (await brandsRequest.get()).json();
      const term = brands[0].name.split(' ')[0];

      const response = await brandsRequest.search(term);

      expect(response.status()).toBe(200);

      const results = await response.json();
      expect.soft(results.length).toBeGreaterThan(0);
      const names = results.map((brand: { name: string }) =>
        brand.name.toLowerCase(),
      );
      expect
        .soft(names.every((name: string) => name.includes(term.toLowerCase())))
        .toBe(true);
    },
  );
});
