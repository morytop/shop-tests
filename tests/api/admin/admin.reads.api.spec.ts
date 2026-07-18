import { ReportsRequest } from '@src/api/requests/reports.request';
import { expect, test } from '@src/fixtures/merge.fixture';

/**
 * Read-only admin sweep at the API level, mirroring `tests/admin/*.spec.ts`. Every
 * request goes through the `*RequestAdmin` fixtures, which only ever send the seeded
 * admin's correct password (TEST_PLAN §20 — 3 failures lock the account permanently)
 * and are GET-only by construction: there is no admin write path in this suite.
 */
test.describe('API admin — read-only smoke', () => {
  test(
    'the seven reports endpoints return array data',
    { tag: ['@api', '@admin', '@smoke'] },
    async ({ reportsRequestAdmin }) => {
      const responses = await Promise.all([
        reportsRequestAdmin.getTotalSalesPerCountry(),
        reportsRequestAdmin.getTop10PurchasedProducts(),
        reportsRequestAdmin.getTop10BestSellingCategories(),
        reportsRequestAdmin.getTotalSalesOfYears(),
        reportsRequestAdmin.getAverageSalesPerMonth(),
        reportsRequestAdmin.getAverageSalesPerWeek(),
        reportsRequestAdmin.getCustomersByCountry(),
      ]);

      for (const response of responses) {
        expect(response.status()).toBe(200);
        expect.soft(Array.isArray(await response.json())).toBe(true);
      }
    },
  );

  test(
    'the users list is paginated, searchable, and readable by id',
    { tag: ['@api', '@admin', '@smoke'] },
    async ({ usersRequestAdmin }) => {
      const list = await usersRequestAdmin.get();
      expect(list.status()).toBe(200);
      const page = await list.json();
      expect.soft(page.current_page).toBe(1);
      expect.soft(Array.isArray(page.data)).toBe(true);
      const user = page.data[0];

      const search = await usersRequestAdmin.search(user.first_name);
      expect(search.status()).toBe(200);
      const searchResults = await search.json();
      expect
        .soft(searchResults.data.map((u: { id: string }) => u.id))
        .toContain(user.id);

      const byId = await usersRequestAdmin.getOne(user.id);
      expect(byId.status()).toBe(200);
      const single = await byId.json();
      expect.soft(single.id).toBe(user.id);
      expect.soft(single.email).toBe(user.email);
    },
  );

  test(
    'the messages list and single read return contact-form rows',
    { tag: ['@api', '@admin', '@smoke'] },
    async ({ messagesRequestAdmin }) => {
      const list = await messagesRequestAdmin.get();
      expect(list.status()).toBe(200);
      const page = await list.json();
      expect.soft(Array.isArray(page.data)).toBe(true);
      const message = page.data[0];

      const byId = await messagesRequestAdmin.getOne(message.id);
      expect(byId.status()).toBe(200);
      const single = await byId.json();
      expect.soft(single.id).toBe(message.id);
      expect.soft(single.subject).toBe(message.subject);
    },
  );

  test(
    'rejects anonymous access to every admin-read endpoint with 401',
    { tag: ['@api', '@admin', '@auth'] },
    async ({ request, usersRequest, messagesRequest }) => {
      // Reports have no anonymous fixture (no public use case), so the request
      // object is built directly from the raw `request` fixture, same as the
      // malformed-token case in `users.session.api.spec.ts`.
      const anonymousReportsRequest = new ReportsRequest(request);

      const [users, messages, reports] = await Promise.all([
        usersRequest.get(),
        messagesRequest.get(),
        anonymousReportsRequest.getTotalSalesPerCountry(),
      ]);

      expect(users.status()).toBe(401);
      expect(messages.status()).toBe(401);
      expect(reports.status()).toBe(401);
    },
  );
});
