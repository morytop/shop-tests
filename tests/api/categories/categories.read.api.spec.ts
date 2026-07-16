import { expect, test } from '@src/merge.fixture';

test.describe('API categories — reads', () => {
  test(
    'lists categories flat, parents and children together',
    { tag: ['@api', '@smoke', '@categories'] },
    async ({ categoriesRequest }) => {
      const response = await categoriesRequest.get();

      expect(response.status()).toBe(200);

      const categories = await response.json();
      expect.soft(categories.length).toBeGreaterThan(0);
      expect.soft(categories[0].id).toBeTruthy();
      expect.soft(categories[0].slug).toBeTruthy();
      // The flat list is not the tree: it carries leaf categories alongside the
      // top-level ones, distinguished only by `parent_id`.
      const parents = categories.filter(
        (category: { parent_id: string | null }) => category.parent_id === null,
      );
      expect.soft(parents.length).toBeGreaterThan(0);
      expect.soft(parents.length).toBeLessThan(categories.length);
    },
  );

  // `GET /categories/{id}` is not a route: it answers 405 for every id — real,
  // unknown, or slug — while PUT/PATCH/DELETE on the same path *are* registered.
  // Single-category reads go through `/categories/tree/{id}` instead. Pinned so a
  // future release that fills the gap fails here and gets a real happy-path test.
  test(
    'does not route a single-category read by id',
    { tag: ['@api', '@categories'] },
    async ({ categoriesRequest }) => {
      const categories = await (await categoriesRequest.get()).json();

      const response = await categoriesRequest.getOne(categories[0].id);

      expect(response.status()).toBe(405);
    },
  );

  test(
    'nests child categories under their parent in the tree',
    { tag: ['@api', '@smoke', '@categories'] },
    async ({ categoriesRequest }) => {
      const response = await categoriesRequest.getTree();

      expect(response.status()).toBe(200);

      const tree = await response.json();
      expect.soft(tree.length).toBeGreaterThan(0);
      const parentIds = tree.map(
        (category: { parent_id: string | null }) => category.parent_id,
      );
      expect.soft(new Set(parentIds)).toEqual(new Set([null]));

      const [root] = tree;
      expect.soft(root.sub_categories.length).toBeGreaterThan(0);
      const childParentIds = root.sub_categories.map(
        (child: { parent_id: string }) => child.parent_id,
      );
      expect.soft(new Set(childParentIds)).toEqual(new Set([root.id]));
    },
  );

  test(
    'returns a single tree branch by id',
    { tag: ['@api', '@categories'] },
    async ({ categoriesRequest }) => {
      const tree = await (await categoriesRequest.getTree()).json();
      const root = tree[0];

      const response = await categoriesRequest.getTreeOne(root.id);

      expect(response.status()).toBe(200);

      const branch = await response.json();
      expect.soft(branch.id).toBe(root.id);
      expect.soft(branch.parent_id).toBeNull();
      const childIds = branch.sub_categories.map(
        (child: { id: string }) => child.id,
      );
      expect
        .soft(childIds)
        .toEqual(root.sub_categories.map((child: { id: string }) => child.id));
    },
  );

  test(
    'searches categories by a term drawn from a live category name',
    { tag: ['@api', '@categories'] },
    async ({ categoriesRequest }) => {
      const categories = await (await categoriesRequest.get()).json();
      const term = categories[0].name.split(' ')[0];

      const response = await categoriesRequest.search(term);

      expect(response.status()).toBe(200);

      const results = await response.json();
      expect.soft(results.length).toBeGreaterThan(0);
      const names = results.map((category: { name: string }) =>
        category.name.toLowerCase(),
      );
      expect
        .soft(names.every((name: string) => name.includes(term.toLowerCase())))
        .toBe(true);
    },
  );
});
