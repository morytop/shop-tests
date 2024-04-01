import { HomePage } from '../../src/pages/home-page';
import { expect, test } from '@playwright/test';

test('Site title should contain Toolshop @smoke', async ({ page }) => {
  const homePage = new HomePage(page);

  await homePage.goto();

  await expect(page).toHaveTitle(/Toolshop/);
});
