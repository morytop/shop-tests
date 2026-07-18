import { faker } from '@faker-js/faker';
import { createInvoiceWithApi } from '@src/api/factories/invoice.api.factory';
import { prepareRandomUserPayload } from '@src/api/factories/user-register.api.factory';
import {
  AddItemResponse,
  CreateCartResponse,
  GetCartResponse,
  GetCurrentCustomerInfoResponse,
  GetFavoritesResponse,
  GetInvoiceResponse,
  GetInvoicesResponse,
  LoginCustomerResponse,
  SendMessageResponse,
  StoreFavoriteResponse,
  StoreUserResponse,
} from '@src/api/schemas/toolshop.zod';
import { expectToMatchSchema } from '@src/api/utils/schema.util';
import { expect, test } from '@src/fixtures/merge.fixture';

/**
 * Contract checks of the write and authenticated endpoints against the
 * published OpenAPI docs, complementing `contract.anonymous.api.spec.ts`.
 *
 * Every user the API registers is permanent, so the file is deliberately
 * consolidated rather than one-test-per-endpoint: the per-user resources (me,
 * favorites, invoices) share a single test — and so a single `loggedApiUser` —
 * while register/login validate the one throwaway their own act creates. A full
 * run of this file registers exactly two users.
 *
 * Carts are ownerless throwaway server objects and the contact form is
 * anonymous by design (§API-E), so neither test needs a token. The
 * `POST /messages` schema is a union (anonymous vs token-authenticated row —
 * §API-G); this test exercises the anonymous branch.
 */
test.describe('API contract — authenticated flows', () => {
  test(
    'POST /carts, add-item and GET /carts/{id} match their documented schemas',
    { tag: ['@api', '@contract', '@cart'] },
    async ({ cartsRequest, productsRequest }) => {
      const created = await cartsRequest.post();
      expect(created.status()).toBe(201);
      await expectToMatchSchema(created, CreateCartResponse);
      const cartId = (await created.json()).id;

      const products = await (await productsRequest.get()).json();
      const added = await cartsRequest.addItem(cartId, {
        product_id: products.data[0].id,
        quantity: 1,
      });
      expect(added.status()).toBe(200);
      await expectToMatchSchema(added, AddItemResponse);

      const cart = await cartsRequest.getOne(cartId);
      expect(cart.status()).toBe(200);
      await expectToMatchSchema(cart, GetCartResponse);

      await cartsRequest.delete(cartId);
    },
  );

  test(
    'POST /users/register and POST /users/login match their documented schemas',
    { tag: ['@api', '@contract', '@auth'] },
    async ({ usersRequest, loginRequest }) => {
      const payload = prepareRandomUserPayload();

      const registered = await usersRequest.post(payload);
      expect(registered.status()).toBe(201);
      await expectToMatchSchema(registered, StoreUserResponse);

      const loggedIn = await loginRequest.post({
        email: payload.email,
        password: payload.password,
      });
      expect(loggedIn.status()).toBe(200);
      await expectToMatchSchema(loggedIn, LoginCustomerResponse);
    },
  );

  test(
    'GET /users/me, favorites and invoices match their documented schemas',
    { tag: ['@api', '@contract', '@auth', '@favorites', '@invoices'] },
    async ({
      request,
      loggedApiUser,
      usersRequestLogged,
      favoritesRequestLogged,
      invoicesRequestLogged,
      productsRequest,
    }) => {
      const me = await usersRequestLogged.me();
      expect(me.status()).toBe(200);
      await expectToMatchSchema(me, GetCurrentCustomerInfoResponse);

      const products = await (await productsRequest.get()).json();
      const favorited = await favoritesRequestLogged.post({
        product_id: products.data[0].id,
      });
      expect(favorited.status()).toBe(201);
      await expectToMatchSchema(favorited, StoreFavoriteResponse);

      const favorites = await favoritesRequestLogged.get();
      expect(favorites.status()).toBe(200);
      await expectToMatchSchema(favorites, GetFavoritesResponse);

      await createInvoiceWithApi(request, {
        email: loggedApiUser.email,
        password: loggedApiUser.password,
      });

      const invoices = await invoicesRequestLogged.get();
      expect(invoices.status()).toBe(200);
      await expectToMatchSchema(invoices, GetInvoicesResponse);

      const invoiceId = (await invoices.json()).data[0].id;
      const invoice = await invoicesRequestLogged.getOne(invoiceId);
      expect(invoice.status()).toBe(200);
      await expectToMatchSchema(invoice, GetInvoiceResponse);
    },
  );

  test(
    'POST /messages matches its documented schema',
    { tag: ['@api', '@contract', '@messages'] },
    async ({ messagesRequest }) => {
      const response = await messagesRequest.post({
        name: faker.person.fullName(),
        email: faker.internet.email(),
        subject: 'Customer service',
        message: faker.lorem.sentences(4),
      });

      expect(response.status()).toBe(200);
      await expectToMatchSchema(response, SendMessageResponse);
    },
  );
});
