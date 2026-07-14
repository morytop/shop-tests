import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import { expect, test } from '@src/merge.fixture';

// User Stories v5 — Invoices (TEST_PLAN.md §5.17). Covers the three deterministic ACs:
// AC1 the invoice appears in the list, AC2 the invoice detail page, AC3 a non-existent
// id → not-found. AC4 (discounted invoice) and AC5 (PDF download) are deferred (§9/§29).
//
// Data safety (§3): AC1/AC2 place a REAL Cash-on-Delivery order (simulated payment, §2),
// so each registers its own throwaway user via the API and logs in inline — a fresh user
// guarantees a single-invoice list, so the assertions are deterministic. Never `testUser1`
// (it IS the shared seeded `customer@`) or the `@logged` session (shared across specs;
// `checkout-e2e` AC2 already places orders as it). Billing is completed via the postcode
// lookup so the city ↔ country pair is orderable (§18); products are chosen dynamically
// (§3, §9). See TEST_PLAN.md §29 and .ai-docs/invoices-plan.md.

test.describe('Verify invoices', () => {
  // AC1 — after checkout the order's invoice appears in the list with the right number,
  // billing street, date, and total. Number/date/total are pinned exactly (total renders
  // `$X.XX` with no space, unlike the detail page — §29); the "Billing Address" column
  // (street only) is asserted present-but-not-pinned — the app fills it from an unreliable
  // source that can diverge from the submitted/detail street (§29), so an exact match
  // against the captured street is flaky.
  test(
    'placed order appears in the invoice list with correct details',
    { tag: ['@auth', '@invoices', '@regression'] },
    async ({
      accountPage,
      invoicesPage,
      loginPage,
      placeCodOrderAsLoggedInUser,
      usersRequest,
    }) => {
      const user = await registerUserWithApi(usersRequest);

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.pageTitle.waitFor();

      const order = await placeCodOrderAsLoggedInUser();

      await invoicesPage.gotoAndAwaitLoaded();

      const row = invoicesPage.invoiceRows.filter({
        hasText: order.invoiceNumber,
      });
      await expect(row.getByRole('cell').nth(0)).toHaveText(
        order.invoiceNumber,
      );
      await expect(row.getByRole('cell').nth(1)).not.toBeEmpty();
      await expect(row.getByRole('cell').nth(2)).toHaveText(
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
      );
      await expect(row.getByRole('cell').nth(3)).toHaveText(order.total);
    },
  );

  // AC2 — the invoice detail page shows number/date/total, the full billing address, the
  // payment method, and the line items. Values render as read-only inputs; the total here
  // carries a space (`$ X.XX`), unlike the list (§29).
  test(
    'invoice detail page shows number, address, payment method, and line items',
    { tag: ['@auth', '@invoices', '@regression'] },
    async ({
      accountPage,
      invoiceDetailPage,
      invoicesPage,
      loginPage,
      placeCodOrderAsLoggedInUser,
      usersRequest,
    }) => {
      const user = await registerUserWithApi(usersRequest);

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.pageTitle.waitFor();

      const order = await placeCodOrderAsLoggedInUser();
      // "$14.15" (list/cart) → "14.15", to rebuild each page's own format.
      const amount = order.total.replace('$', '').trim();

      await invoicesPage.gotoAndAwaitLoaded();
      await invoicesPage.openDetails(order.invoiceNumber);

      await expect(invoiceDetailPage.invoiceNumber).toHaveValue(
        order.invoiceNumber,
      );
      await expect(invoiceDetailPage.invoiceDate).toHaveValue(
        /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/,
      );
      await expect(invoiceDetailPage.total).toHaveValue(`$ ${amount}`);

      // The street is asserted present-but-not-pinned, like the list column: the
      // app fills the invoice billing address from a shared/stale prod value that
      // can diverge from the street submitted in the form (§29 — the same
      // shared-prefill bug behind the list-vs-detail divergence), so an exact
      // match against the captured street is flaky under parallel runs.
      await expect(invoiceDetailPage.street).not.toHaveValue('');
      await expect(invoiceDetailPage.postalCode).toHaveValue('12345');
      // City/state/country come back from the geocoder and render the country name
      // ("Germany"), not the billing form's ISO code — so pin only the value we
      // control (postal) and assert the rest are populated (§29).
      await expect(invoiceDetailPage.city).not.toHaveValue('');
      await expect(invoiceDetailPage.state).not.toHaveValue('');
      await expect(invoiceDetailPage.country).not.toHaveValue('');

      await expect(invoiceDetailPage.paymentMethod).toHaveValue(
        'Cash on Delivery',
      );

      const firstItem = invoiceDetailPage.lineItemRows.first();
      await expect(firstItem.getByRole('cell').nth(0)).toHaveText('1');
      await expect(firstItem.getByRole('cell').nth(1)).not.toBeEmpty();
      await expect(firstItem.getByRole('cell').nth(2)).toHaveText(`$${amount}`);
    },
  );

  // AC3 — a well-formed but non-existent invoice id renders the not-found message and
  // none of the detail fields. A "foreign" real invoice id can't be obtained safely, so a
  // non-existent id covers the AC (§29).
  test(
    'non-existent invoice id shows a not-found message',
    { tag: ['@auth', '@invoices', '@regression'] },
    async ({ accountPage, invoiceDetailPage, loginPage, usersRequest }) => {
      const user = await registerUserWithApi(usersRequest);

      await loginPage.goto();
      await loginPage.login(user.email, user.password);
      await accountPage.pageTitle.waitFor();

      await invoiceDetailPage.gotoInvoice('01kx0000000000000000000000');

      await expect(invoiceDetailPage.notFoundMessage).toBeVisible();
      await expect(invoiceDetailPage.invoiceNumber).toHaveCount(0);
    },
  );
});
