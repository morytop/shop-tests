import { expect, test } from '@src/fixtures/merge.fixture';
import { privacySectionTitles } from '@src/ui/test-data/privacy.data';

// User Stories v5 — Privacy policy (TEST_PLAN.md §5.24). The page is static prose, so the
// AC is coverage of its content: the route loads, every documented section is present, and
// the data-handling facts the policy commits to are actually stated.
//
// The section titles are `<strong>` tags — the page renders no headings and no `data-test`
// attributes at all (§35) — so the assertions are on exact text, not roles.
//
// Data safety (§3): read-only static page, no account, no catalog, no cart. These tests are
// deliberately not `@logged`, since the policy renders identically for guests.

test.describe('Verify privacy policy page', () => {
  // §5.24 — the route loads, both directly and from its only in-app entry point (the footer).
  test(
    'privacy policy loads on its own route',
    { tag: ['@privacy', '@regression'] },
    async ({ privacyPage, page }) => {
      await privacyPage.goto();

      await expect(page).toHaveURL(/\/privacy$/);
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

      await expect(page).toHaveURL(/\/privacy$/);
      await expect(privacyPage.content).toBeVisible();
    },
  );

  // §5.24 — every expected section is present, in order. Asserting the full ordered list (not
  // just the six the AC names) means a section added or dropped upstream fails the test.
  test(
    'privacy policy lists every expected section',
    { tag: ['@privacy', '@regression'] },
    async ({ privacyPage }) => {
      await privacyPage.goto();

      await expect(privacyPage.sectionTitles).toHaveText(privacySectionTitles);
    },
  );

  // §5.24 — the substance behind the section titles: what is collected via Google Sign-In, the
  // hourly automatic wipe, third-party services, data security, and how to reach the operator.
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
