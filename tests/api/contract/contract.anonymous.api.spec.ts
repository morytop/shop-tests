import {
  GetBrandResponse,
  GetBrandsResponse,
  GetCategoriesResponse,
  GetCategoriesTreeResponse,
  GetCategoryResponse,
  GetImagesResponse,
  GetProductResponse,
  GetProductsResponse,
  GetRelatedProductsResponse,
  SearchBrandResponse,
  SearchCategoryResponse,
  SearchProductResponse,
} from '@src/api/schemas/toolshop.zod';
import { expectToMatchSchema } from '@src/api/utils/schema.util';
import { expect, test } from '@src/fixtures/merge.fixture';

// Contract checks of the public read endpoints against the published OpenAPI
// docs: each response body must parse against its generated strict schema
// (`src/api/schemas/toolshop.zod.ts`), so an undocumented key, a missing
// documented key, or a type change fails naming the drifted field. Behavioural
// assertions (sorting, filtering, envelopes) stay in the per-resource read
// specs — these tests only pin the documented shape.
//
// Every id/term is resolved live from a list call (TEST_PLAN §3). Two
// documented-endpoint quirks (PRODUCT_EXPLORATION.md §6, REST API):
// `GET /categories/{id}` is not routed (405) — the by-id read under contract is
// `GET /categories/tree/{id}` — and `GET /product-specs/names` is skipped here
// because the docs give it no response schema, so its generated schema
// (`zod.unknown()`) would validate nothing.
test.describe('API contract — anonymous reads', () => {
  test.describe('products', () => {
    test(
      'GET /products matches its documented schema',
      { tag: ['@api', '@contract', '@products'] },
      async ({ productsRequest }) => {
        const response = await productsRequest.get();

        expect(response.status()).toBe(200);
        await expectToMatchSchema(response, GetProductsResponse);
      },
    );

    test(
      'GET /products keeps the documented schema on a later page',
      { tag: ['@api', '@contract', '@products'] },
      async ({ productsRequest }) => {
        const response = await productsRequest.get({ page: 2 });

        expect(response.status()).toBe(200);
        await expectToMatchSchema(response, GetProductsResponse);
      },
    );

    test(
      'GET /products/search matches its documented schema',
      { tag: ['@api', '@contract', '@products'] },
      async ({ productsRequest }) => {
        const list = await (await productsRequest.get()).json();
        const term = list.data[0].name.split(' ')[0];

        const response = await productsRequest.search(term);

        expect(response.status()).toBe(200);
        await expectToMatchSchema(response, SearchProductResponse);
      },
    );

    test(
      'GET /products/{id} matches its documented schema',
      { tag: ['@api', '@contract', '@products'] },
      async ({ productsRequest }) => {
        const list = await (await productsRequest.get()).json();

        const response = await productsRequest.getOne(list.data[0].id);

        expect(response.status()).toBe(200);
        await expectToMatchSchema(response, GetProductResponse);
      },
    );

    test(
      'GET /products/{id}/related matches its documented schema',
      { tag: ['@api', '@contract', '@products'] },
      async ({ productsRequest }) => {
        const list = await (await productsRequest.get()).json();

        const response = await productsRequest.getRelated(list.data[0].id);

        expect(response.status()).toBe(200);
        await expectToMatchSchema(response, GetRelatedProductsResponse);
      },
    );
  });

  test.describe('brands', () => {
    test(
      'GET /brands matches its documented schema',
      { tag: ['@api', '@contract', '@brands'] },
      async ({ brandsRequest }) => {
        const response = await brandsRequest.get();

        expect(response.status()).toBe(200);
        await expectToMatchSchema(response, GetBrandsResponse);
      },
    );

    test(
      'GET /brands/search matches its documented schema',
      { tag: ['@api', '@contract', '@brands'] },
      async ({ brandsRequest }) => {
        const brands = await (await brandsRequest.get()).json();
        const term = brands[0].name.split(' ')[0];

        const response = await brandsRequest.search(term);

        expect(response.status()).toBe(200);
        await expectToMatchSchema(response, SearchBrandResponse);
      },
    );

    test(
      'GET /brands/{id} matches its documented schema',
      { tag: ['@api', '@contract', '@brands'] },
      async ({ brandsRequest }) => {
        const brands = await (await brandsRequest.get()).json();

        const response = await brandsRequest.getOne(brands[0].id);

        expect(response.status()).toBe(200);
        await expectToMatchSchema(response, GetBrandResponse);
      },
    );
  });

  test.describe('categories', () => {
    test(
      'GET /categories matches its documented schema',
      { tag: ['@api', '@contract', '@categories'] },
      async ({ categoriesRequest }) => {
        const response = await categoriesRequest.get();

        expect(response.status()).toBe(200);
        await expectToMatchSchema(response, GetCategoriesResponse);
      },
    );

    test(
      'GET /categories/tree matches its documented schema',
      { tag: ['@api', '@contract', '@categories'] },
      async ({ categoriesRequest }) => {
        const response = await categoriesRequest.getTree();

        expect(response.status()).toBe(200);
        await expectToMatchSchema(response, GetCategoriesTreeResponse);
      },
    );

    test(
      'GET /categories/search matches its documented schema',
      { tag: ['@api', '@contract', '@categories'] },
      async ({ categoriesRequest }) => {
        const categories = await (await categoriesRequest.get()).json();
        const term = categories[0].name.split(' ')[0];

        const response = await categoriesRequest.search(term);

        expect(response.status()).toBe(200);
        await expectToMatchSchema(response, SearchCategoryResponse);
      },
    );

    test(
      'GET /categories/tree/{id} matches its documented schema',
      { tag: ['@api', '@contract', '@categories'] },
      async ({ categoriesRequest }) => {
        const tree = await (await categoriesRequest.getTree()).json();

        const response = await categoriesRequest.getTreeOne(tree[0].id);

        expect(response.status()).toBe(200);
        await expectToMatchSchema(response, GetCategoryResponse);
      },
    );
  });

  test.describe('images', () => {
    test(
      'GET /images matches its documented schema',
      { tag: ['@api', '@contract', '@images'] },
      async ({ imagesRequest }) => {
        const response = await imagesRequest.get();

        expect(response.status()).toBe(200);
        await expectToMatchSchema(response, GetImagesResponse);
      },
    );
  });
});
