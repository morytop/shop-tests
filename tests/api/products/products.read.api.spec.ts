import { UNKNOWN_ID } from '@src/api/data/catalog.data';
import { expect, test } from '@src/merge.fixture';

// Every id here is resolved live from a list call: the catalog is shared production
// data that concurrent runs mutate mid-session (§9/§26), so no product, brand or
// category id may be hard-coded and no assertion may name a specific product.
test.describe('API products — reads', () => {
  test(
    'lists products in a paginated envelope',
    { tag: ['@api', '@smoke', '@products'] },
    async ({ productsRequest }) => {
      const response = await productsRequest.get();

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect.soft(body.data.length).toBeGreaterThan(0);
      expect.soft(body.current_page).toBe(1);
      expect.soft(body.total).toBeGreaterThanOrEqual(body.data.length);
      expect.soft(body.last_page).toBeGreaterThanOrEqual(1);
    },
  );

  test(
    'advances to the next page with the page param',
    { tag: ['@api', '@products'] },
    async ({ productsRequest }) => {
      const firstPage = await (await productsRequest.get({ page: 1 })).json();

      const response = await productsRequest.get({ page: 2 });

      expect(response.status()).toBe(200);

      const secondPage = await response.json();
      expect.soft(secondPage.current_page).toBe(2);
      // A second page only exists if the catalog spans one; assert the contents
      // differ rather than a fixed size, since `total` moves with the shared data.
      const firstPageIds = firstPage.data.map(
        (product: { id: string }) => product.id,
      );
      const overlap = secondPage.data.filter((product: { id: string }) =>
        firstPageIds.includes(product.id),
      );
      expect.soft(overlap).toEqual([]);
    },
  );

  test(
    'returns a single product by an id taken from the list',
    { tag: ['@api', '@smoke', '@products'] },
    async ({ productsRequest }) => {
      const list = await (await productsRequest.get()).json();
      const listed = list.data[0];

      const response = await productsRequest.getOne(listed.id);

      expect(response.status()).toBe(200);

      const product = await response.json();
      expect.soft(product.id).toBe(listed.id);
      expect.soft(product.name).toBe(listed.name);
      expect.soft(product.price).toBe(listed.price);
      expect.soft(product.category.id).toBeTruthy();
      expect.soft(product.brand.id).toBeTruthy();
    },
  );

  test(
    'returns a 404 for a well-formed but unknown product id',
    { tag: ['@api', '@products'] },
    async ({ productsRequest }) => {
      const response = await productsRequest.getOne(UNKNOWN_ID);

      expect(response.status()).toBe(404);
    },
  );

  test(
    'relates products sharing the category, excluding the product itself',
    { tag: ['@api', '@products'] },
    async ({ productsRequest }) => {
      const list = await (await productsRequest.get()).json();
      const product = list.data[0];

      const response = await productsRequest.getRelated(product.id);

      expect(response.status()).toBe(200);

      const related = await response.json();
      const categoryIds = related.map(
        (item: { category: { id: string } }) => item.category.id,
      );
      const relatedIds = related.map((item: { id: string }) => item.id);
      expect.soft(new Set(categoryIds)).toEqual(new Set([product.category.id]));
      expect.soft(relatedIds).not.toContain(product.id);
    },
  );

  test(
    'searches products by a term drawn from a live product name',
    { tag: ['@api', '@smoke', '@products'] },
    async ({ productsRequest }) => {
      const list = await (await productsRequest.get()).json();
      // The first whole word of a live product name: guaranteed to match at least
      // that product without hard-coding a term the catalog may not carry.
      const term = list.data[0].name.split(' ')[0];

      const response = await productsRequest.search(term);

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect.soft(body.data.length).toBeGreaterThan(0);
      const names = body.data.map((product: { name: string }) =>
        product.name.toLowerCase(),
      );
      expect
        .soft(names.every((name: string) => name.includes(term.toLowerCase())))
        .toBe(true);
    },
  );

  test(
    'filters products by brand',
    { tag: ['@api', '@products'] },
    async ({ productsRequest, brandsRequest }) => {
      const brands = await (await brandsRequest.get()).json();
      const brand = brands[0];

      const response = await productsRequest.get({ by_brand: brand.id });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect.soft(body.data.length).toBeGreaterThan(0);
      const brandIds = body.data.map(
        (product: { brand: { id: string } }) => product.brand.id,
      );
      expect.soft(new Set(brandIds)).toEqual(new Set([brand.id]));
    },
  );

  test(
    'filters products by a leaf category',
    { tag: ['@api', '@products'] },
    async ({ productsRequest, categoriesRequest }) => {
      // Products hang off leaf categories only — filtering by a top-level parent
      // id returns an empty set, so the id must come from `sub_categories`.
      const tree = await (await categoriesRequest.getTree()).json();
      const leaf = tree[0].sub_categories[0];

      const response = await productsRequest.get({ by_category: leaf.id });

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect.soft(body.data.length).toBeGreaterThan(0);
      const categoryIds = body.data.map(
        (product: { category: { id: string } }) => product.category.id,
      );
      expect.soft(new Set(categoryIds)).toEqual(new Set([leaf.id]));
    },
  );

  test(
    'sorts products by ascending price',
    { tag: ['@api', '@products'] },
    async ({ productsRequest }) => {
      const response = await productsRequest.get({ sort: 'price,asc' });

      expect(response.status()).toBe(200);

      const body = await response.json();
      const prices = body.data.map(
        (product: { price: number }) => product.price,
      );
      expect.soft(prices).toEqual([...prices].sort((a, b) => a - b));
    },
  );
});
