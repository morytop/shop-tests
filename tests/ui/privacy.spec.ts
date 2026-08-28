import { expect, test } from '@src/fixtures/merge.fixture';
import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { privacySectionTitles } from '@src/ui/test-data/privacy.data';

test.describe('Verify privacy policy page', () => {
  test(
    'privacy policy loads on its own route',
    { tag: ['@privacy', '@regression'] },
    async ({ privacyPage, page }) => {
      await privacyPage.goto();

      await expect(page).toHaveURL(PAGE_URLS.PRIVACY);
      await expect(page).toHaveTitle(/^Privacy Policy/);
      await expect(privacyPage.content).toBeVisible();
    },
  );

  test(
    'footer link opens the privacy policy from another page',
    { tag: ['@privacy', '@regression'] },
    async ({ contactPage, privacyPage, page }) => {
      await contactPage.goto();

      await privacyPage.footerLink.click();

      await expect(page).toHaveURL(PAGE_URLS.PRIVACY);
      await expect(privacyPage.content).toBeVisible();
    },
  );

  test(
    'privacy policy lists every expected section',
    { tag: ['@privacy', '@regression'] },
    async ({ privacyPage }) => {
      await privacyPage.goto();

      await expect(privacyPage.sectionTitles).toHaveText(privacySectionTitles);
    },
  );

  test(
    'privacy policy states the key data-handling facts',
    { tag: ['@privacy', '@regression'] },
    async ({ privacyPage }) => {
      await privacyPage.goto();

      await expect(privacyPage.content).toContainText(
        'we collect your email address and profile information',
      );
      await expect(privacyPage.content).toContainText(
        'Toolshop integrates with Google Sign-In',
      );
      await expect(privacyPage.content).toContainText(
        'automatically removes all user data every hour',
      );
      await expect(privacyPage.content).toContainText(
        'Toolshop may use third-party services',
      );
      await expect(privacyPage.content).toContainText(
        'safeguard your personal information from unauthorized access',
      );
      await expect(privacyPage.content).toContainText(
        'info [at] testsmith [dot] io',
      );
    },
  );
});
