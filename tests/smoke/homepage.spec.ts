import { test } from '../../src/fixtures/main';
import { expect } from '@playwright/test';

test('Site title should contain Toolshop @smoke', async ({
  homePage,
  page,
}) => {
  await homePage.goto();

  await expect(page).toHaveTitle(/Toolshop/);
});
