import { expect, test } from '@src/merge.fixture';

test.describe('Verify menu bookmarks @smoke', () => {
  // Links whose destination updates the document <title>.
  const titleLinks = [
    { name: 'hand tools', title: /Hand Tools/ },
    { name: 'power tools', title: /Power Tools/ },
    { name: 'other', title: /Other/ },
    { name: 'rentals', title: /Rentals/ },
  ] as const;

  for (const { name, title } of titleLinks) {
    test(`${name} link navigates to a page titled ${title}`, async ({
      handToolsPage,
      powerToolsPage,
      otherPage,
      rentalsPage,
      page,
    }) => {
      const pages = {
        'hand tools': handToolsPage,
        'power tools': powerToolsPage,
        other: otherPage,
        rentals: rentalsPage,
      };

      await pages[name].goto();

      await expect(page).toHaveTitle(title);
    });
  }

  // Links identified by an on-page heading rather than <title>.
  const headingLinks = [
    { name: 'contact', heading: 'Contact' },
    { name: 'sign in', heading: 'Login' },
  ] as const;

  for (const { name, heading } of headingLinks) {
    test(`${name} link navigates to the ${heading} page`, async ({
      contactPage,
      loginPage,
    }) => {
      const pages = {
        contact: contactPage,
        'sign in': loginPage,
      };

      await pages[name].goto();

      await expect(pages[name].heading).toHaveText(heading);
    });
  }

  // Special Tools is the one category whose page renders the heading but never
  // updates <title> (test_plan.md §11/§14), so it is asserted via its heading.
  test('special tools link navigates to category: special tools page', async ({
    specialToolsPage,
  }) => {
    await specialToolsPage.goto();

    await expect(specialToolsPage.heading).toBeVisible();
  });
});
