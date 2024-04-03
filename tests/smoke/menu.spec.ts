import { ContactPage } from '../../src/pages/contact-page';
import { HandToolsPage } from '../../src/pages/handTools-page';
import { LoginPage } from '../../src/pages/login-page';
import { OtherPage } from '../../src/pages/other-page';
import { PowerToolsPage } from '../../src/pages/powerTools-page';
import { RentalsPage } from '../../src/pages/rentals-page';
import { SpecialToolsPage } from '../../src/pages/specialTools-page';
import { expect, test } from '@playwright/test';

test.describe('Verify menu bookmarks @smoke', () => {
  test('hand tools link navigates to category: hand tools page', async ({
    page,
  }) => {
    const handToolsPage = new HandToolsPage(page);
    await handToolsPage.goto();
    await expect(handToolsPage.title).toHaveText('Category: Hand Tools');
  });

  test('power tools link navigates to category: power tools page', async ({
    page,
  }) => {
    const powerToolsPage = new PowerToolsPage(page);
    await powerToolsPage.goto();
    await expect(powerToolsPage.title).toHaveText('Category: Power Tools');
  });

  test('other link navigates to category: other page', async ({ page }) => {
    const otherPage = new OtherPage(page);
    await otherPage.goto();
    await expect(otherPage.title).toHaveText('Category: Other');
  });

  test('special tools link navigates to category: special tools page', async ({
    page,
  }) => {
    const specialToolsPage = new SpecialToolsPage(page);
    await specialToolsPage.goto();
    await expect(specialToolsPage.title).toHaveText('Category: Special Tools');
  });

  test('rentals link navigates to rentals page', async ({ page }) => {
    const rentalsPage = new RentalsPage(page);
    await rentalsPage.goto();
    await expect(rentalsPage.title).toHaveText('Rentals');
  });

  test('contact link navigates to contact page', async ({ page }) => {
    const contactPage = new ContactPage(page);
    await contactPage.goto();
    await expect(contactPage.heading).toHaveText('Contact');
  });

  test('sign in link navigates to login page', async ({ page }) => {
    const loginPage = new LoginPage(page);
    await loginPage.goto();
    await expect(loginPage.heading).toHaveText('Login');
  });
});
