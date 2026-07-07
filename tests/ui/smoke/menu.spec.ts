import { expect, test } from '@src/merge.fixture';

test.describe('Verify menu bookmarks @smoke', () => {
  test('hand tools link navigates to category: hand tools page', async ({
    handToolsPage,
    page,
  }) => {
    await handToolsPage.goto();
    await expect(page).toHaveTitle(/Hand Tools/);
  });

  test('power tools link navigates to category: power tools page', async ({
    powerToolsPage,
    page,
  }) => {
    await powerToolsPage.goto();
    await expect(page).toHaveTitle(/Power Tools/);
  });

  test('other link navigates to category: other page', async ({
    otherPage,
    page,
  }) => {
    await otherPage.goto();
    await expect(page).toHaveTitle(/Other/);
  });

  test('special tools link navigates to category: special tools page', async ({
    specialToolsPage,
  }) => {
    await specialToolsPage.goto();
    await expect(specialToolsPage.heading).toBeVisible();
  });

  test('rentals link navigates to rentals page', async ({
    page,
    rentalsPage,
  }) => {
    await rentalsPage.goto();
    await expect(page).toHaveTitle(/Rentals/);
  });

  test('contact link navigates to contact page', async ({ contactPage }) => {
    await contactPage.goto();
    await expect(contactPage.heading).toHaveText('Contact');
  });

  test('sign in link navigates to login page', async ({ loginPage }) => {
    await loginPage.goto();
    await expect(loginPage.heading).toHaveText('Login');
  });
});
