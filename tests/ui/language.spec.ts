import { expect, test } from '@src/merge.fixture';
import { languages } from '@src/ui/test-data/language.data';

// User Stories v5 — Multi-language (test_plan.md §5.23). Covers the three automatable
// bullets: the selector's option list, that switching translates the visible UI, and
// that the choice survives a reload and a new navigation. The optional fourth bullet
// (first-visit browser-language auto-detection) is out of scope for this pass.
//
// Production offers 7 languages, not the 6 the v5 docs list — Greek is undocumented
// (§9). Nav labels are asserted against the app's real translations (§34); the
// language-agnostic `data-test` ids mean the navbar locators themselves don't change.
//
// Data safety (§3): the language is per-browser-context localStorage, so these tests
// mutate nothing shared and need no account.
//
// The nav is global, so these tests drive it from the *contact* page rather than the
// home page: the AC is "on any page", and home's product grid is heavy enough on prod
// that under parallel workers it alone can eat most of the 60s test budget (§34).

test.describe('Verify multi-language support', () => {
  const otherLanguages = languages.filter(({ code }) => code !== 'EN');

  // §5.23 AC1 — the nav selector exposes every supported language, on any page.
  test(
    'language selector offers all supported languages',
    { tag: ['@language', '@regression'] },
    async ({ contactPage }) => {
      await contactPage.goto();

      await contactPage.bookmarks.openLanguageMenu();

      await expect(contactPage.bookmarks.languageOptions).toHaveText(
        languages.map(({ code }) => code),
      );
    },
  );

  // §5.23 AC2 — switching translates the visible UI, spot-checked on the four main-menu
  // labels. Dutch translates neither "Home" nor "Contact", so all four are asserted
  // rather than a single label (§34).
  for (const { code, name, navLabels } of otherLanguages) {
    test(
      `switching to ${name} translates the nav labels`,
      { tag: ['@language', '@regression'] },
      async ({ contactPage }) => {
        await contactPage.goto();
        await expect(contactPage.bookmarks.homeNavLink).toHaveText('Home');

        await contactPage.bookmarks.selectLanguage(code);

        await expect(contactPage.bookmarks.languageSelect).toContainText(code);
        await expect(contactPage.bookmarks.homeNavLink).toHaveText(
          navLabels.home,
        );
        await expect(contactPage.bookmarks.categoriesNavDropdown).toHaveText(
          navLabels.categories,
        );
        await expect(contactPage.bookmarks.contactNavLink).toHaveText(
          navLabels.contact,
        );
        await expect(contactPage.bookmarks.signInNavLink).toHaveText(
          navLabels.signIn,
        );
      },
    );
  }

  // §5.23 AC3 — the choice is persisted (localStorage `language`), so it survives both a
  // reload and a fresh navigation to another page within the same context.
  test(
    'selected language persists across a reload and a new navigation',
    { tag: ['@language', '@regression'] },
    async ({ contactPage, loginPage, page }) => {
      const german = languages.find(({ code }) => code === 'DE')!;
      await contactPage.goto();

      await contactPage.bookmarks.selectLanguage(german.code);
      await expect(contactPage.bookmarks.homeNavLink).toHaveText(
        german.navLabels.home,
      );
      await page.reload();

      await expect(contactPage.bookmarks.languageSelect).toContainText(
        german.code,
      );
      await expect(contactPage.bookmarks.homeNavLink).toHaveText(
        german.navLabels.home,
      );

      await loginPage.goto();

      await expect(loginPage.bookmarks.languageSelect).toContainText(
        german.code,
      );
      await expect(loginPage.bookmarks.signInNavLink).toHaveText(
        german.navLabels.signIn,
      );
    },
  );
});
