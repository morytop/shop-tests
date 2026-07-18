import { expect, test } from '@src/fixtures/merge.fixture';

test('Site title should contain Toolshop @smoke', async ({
  homePage,
  page,
}) => {
  await homePage.goto();

  await expect(page).toHaveTitle(/Toolshop/);
});
