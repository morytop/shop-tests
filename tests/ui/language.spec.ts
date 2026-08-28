import { expect, test } from '@src/fixtures/merge.fixture';
import { languages } from '@src/ui/test-data/language.data';

test.describe('Verify multi-language support', () => {
  const otherLanguages = languages.filter(({ code }) => code !== 'EN');

  test(
    'language selector offers all supported languages',
    { tag: ['@language', '@regression'] },
    async ({ contactPage, navbar }) => {
      await contactPage.goto();

      await navbar.openLanguageMenu();

      await expect(navbar.languageOptions).toHaveText(
        languages.map(({ code }) => code),
      );
    },
  );

  for (const { code, name, navLabels } of otherLanguages) {
    test(
      `switching to ${name} translates the nav labels`,
      { tag: ['@language', '@regression'] },
      async ({ contactPage, navbar }) => {
        await contactPage.goto();
        await expect(navbar.homeNavLink).toHaveText('Home');

        await navbar.selectLanguage(code);

        await expect(navbar.languageSelect).toContainText(code);
        await expect(navbar.homeNavLink).toHaveText(navLabels.home);
        await expect(navbar.categoriesNavDropdown).toHaveText(
          navLabels.categories,
        );
        await expect(navbar.contactNavLink).toHaveText(navLabels.contact);
        await expect(navbar.signInNavLink).toHaveText(navLabels.signIn);
      },
    );
  }

  test(
    'selected language persists across a reload and a new navigation',
    { tag: ['@language', '@regression'] },
    async ({ contactPage, loginPage, navbar, page }) => {
      const german = languages.find(({ code }) => code === 'DE')!;
      await contactPage.goto();

      await navbar.selectLanguage(german.code);
      await expect(navbar.homeNavLink).toHaveText(german.navLabels.home);
      await page.reload();

      await expect(navbar.languageSelect).toContainText(german.code);
      await expect(navbar.homeNavLink).toHaveText(german.navLabels.home);

      await loginPage.goto();

      await expect(navbar.languageSelect).toContainText(german.code);
      await expect(navbar.signInNavLink).toHaveText(german.navLabels.signIn);
    },
  );
});
