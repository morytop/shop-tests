import { expect, test } from '@src/merge.fixture';

test.describe('API images — reads', () => {
  test(
    'lists the catalog images with their attribution fields',
    { tag: ['@api', '@smoke', '@images'] },
    async ({ imagesRequest }) => {
      const response = await imagesRequest.get();

      expect(response.status()).toBe(200);

      const images = await response.json();
      expect.soft(images.length).toBeGreaterThan(0);
      expect.soft(images[0].id).toBeTruthy();
      expect.soft(images[0].file_name).toBeTruthy();
      // Every image carries Unsplash attribution — the app is legally obliged to
      // render it, so an image missing `by_name`/`source_url` is a real defect.
      expect.soft(images[0].by_name).toBeTruthy();
      expect.soft(images[0].source_url).toBeTruthy();
    },
  );
});
