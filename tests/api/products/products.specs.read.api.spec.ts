import { expect, test } from '@src/merge.fixture';

test.describe('API products — spec sub-resource reads', () => {
  test(
    'lists the specs of a live product',
    { tag: ['@api', '@smoke', '@products'] },
    async ({ productsRequest }) => {
      const list = await (await productsRequest.get()).json();
      const product = list.data[0];

      const response = await productsRequest.getSpecs(product.id);

      expect(response.status()).toBe(200);

      const specs = await response.json();
      expect.soft(specs.length).toBeGreaterThan(0);
      const productIds = specs.map(
        (spec: { product_id: string }) => spec.product_id,
      );
      expect.soft(new Set(productIds)).toEqual(new Set([product.id]));
      expect.soft(specs[0].spec_name).toBeTruthy();
      expect.soft(specs[0].spec_value).toBeTruthy();
    },
  );

  test(
    'returns a single spec by id',
    { tag: ['@api', '@products'] },
    async ({ productsRequest }) => {
      const list = await (await productsRequest.get()).json();
      const product = list.data[0];
      const specs = await (await productsRequest.getSpecs(product.id)).json();
      const listed = specs[0];

      const response = await productsRequest.getSpec(product.id, listed.id);

      expect(response.status()).toBe(200);

      const spec = await response.json();
      expect.soft(spec.id).toBe(listed.id);
      expect.soft(spec.spec_name).toBe(listed.spec_name);
      expect.soft(spec.spec_value).toBe(listed.spec_value);
    },
  );

  test(
    'lists the distinct spec names across the catalog',
    { tag: ['@api', '@smoke', '@products'] },
    async ({ productsRequest }) => {
      const response = await productsRequest.getSpecNames();

      expect(response.status()).toBe(200);

      const names = await response.json();
      expect.soft(names.length).toBeGreaterThan(0);
      expect.soft(names[0].name).toBeTruthy();
      expect.soft(Array.isArray(names[0].values)).toBe(true);
    },
  );
});
