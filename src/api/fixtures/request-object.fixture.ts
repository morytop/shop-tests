import { test as baseTest } from '@playwright/test';
import { getAuthorizationHeader } from '@src/api/factories/authorization-header.api.factory';
import { registerUserWithApi } from '@src/api/factories/user-register.api.factory';
import { Headers } from '@src/api/models/headers.api.model';
import { UserRegisterPayload } from '@src/api/models/user.api.model';
import { BrandsRequest } from '@src/api/requests/brands.request';
import { CartsRequest } from '@src/api/requests/carts.request';
import { CategoriesRequest } from '@src/api/requests/categories.request';
import { FavoritesRequest } from '@src/api/requests/favorites.request';
import { InvoicesRequest } from '@src/api/requests/invoices.request';
import { LoginRequest } from '@src/api/requests/login.request';
import { MessagesRequest } from '@src/api/requests/messages.request';
import { PaymentRequest } from '@src/api/requests/payment.request';
import { ProductsRequest } from '@src/api/requests/products.request';
import { ReportsRequest } from '@src/api/requests/reports.request';
import { UsersRequest } from '@src/api/requests/users.request';
import { adminUser } from '@src/ui/test-data/user.data';

/** Anonymous request objects — no auth header, safe for any spec. */
export interface Requests {
  usersRequest: UsersRequest;
  loginRequest: LoginRequest;
  productsRequest: ProductsRequest;
  brandsRequest: BrandsRequest;
  categoriesRequest: CategoriesRequest;
  cartsRequest: CartsRequest;
  favoritesRequest: FavoritesRequest;
  invoicesRequest: InvoicesRequest;
  messagesRequest: MessagesRequest;
  paymentRequest: PaymentRequest;
}

/**
 * Customer-authenticated variants. Pulling any of these registers a fresh
 * throwaway user (a write on the shared prod backend) and logs it in, so only
 * request them in specs that actually need an authenticated customer. All of
 * them share the one `loggedApiUser` per test; `loggedApiUser` itself is
 * exposed for specs that need the credentials or profile fields.
 */
export interface LoggedRequests {
  loggedApiUser: UserRegisterPayload;
  loggedHeaders: Headers;
  usersRequestLogged: UsersRequest;
  favoritesRequestLogged: FavoritesRequest;
  invoicesRequestLogged: InvoicesRequest;
}

/**
 * Admin-token variants for the read-only admin sweep. The seeded admin account
 * is shared app-wide: these fixtures only ever log in with the correct password
 * (lockout is permanent after 3 failures, TEST_PLAN §20) and must only be used
 * for GETs — never a mutation.
 */
export interface AdminRequests {
  adminHeaders: Headers;
  usersRequestAdmin: UsersRequest;
  messagesRequestAdmin: MessagesRequest;
  reportsRequestAdmin: ReportsRequest;
}

export const requestObjectTest = baseTest.extend<
  Requests & LoggedRequests & AdminRequests
>({
  usersRequest: async ({ request }, use) => {
    await use(new UsersRequest(request));
  },
  loginRequest: async ({ request }, use) => {
    await use(new LoginRequest(request));
  },
  productsRequest: async ({ request }, use) => {
    await use(new ProductsRequest(request));
  },
  brandsRequest: async ({ request }, use) => {
    await use(new BrandsRequest(request));
  },
  categoriesRequest: async ({ request }, use) => {
    await use(new CategoriesRequest(request));
  },
  cartsRequest: async ({ request }, use) => {
    await use(new CartsRequest(request));
  },
  favoritesRequest: async ({ request }, use) => {
    await use(new FavoritesRequest(request));
  },
  invoicesRequest: async ({ request }, use) => {
    await use(new InvoicesRequest(request));
  },
  messagesRequest: async ({ request }, use) => {
    await use(new MessagesRequest(request));
  },
  paymentRequest: async ({ request }, use) => {
    await use(new PaymentRequest(request));
  },

  loggedApiUser: async ({ usersRequest }, use) => {
    await use(await registerUserWithApi(usersRequest));
  },
  // A fresh token per test: the API's JWTs expire after 5 minutes, so a token
  // must never be shared or persisted across tests (same rule as
  // logged-session.fixture.ts).
  loggedHeaders: async ({ request, loggedApiUser }, use) => {
    await use(
      await getAuthorizationHeader(request, {
        email: loggedApiUser.email,
        password: loggedApiUser.password,
      }),
    );
  },
  usersRequestLogged: async ({ request, loggedHeaders }, use) => {
    await use(new UsersRequest(request, loggedHeaders));
  },
  favoritesRequestLogged: async ({ request, loggedHeaders }, use) => {
    await use(new FavoritesRequest(request, loggedHeaders));
  },
  invoicesRequestLogged: async ({ request, loggedHeaders }, use) => {
    await use(new InvoicesRequest(request, loggedHeaders));
  },

  adminHeaders: async ({ request }, use) => {
    await use(await getAuthorizationHeader(request, adminUser));
  },
  usersRequestAdmin: async ({ request, adminHeaders }, use) => {
    await use(new UsersRequest(request, adminHeaders));
  },
  messagesRequestAdmin: async ({ request, adminHeaders }, use) => {
    await use(new MessagesRequest(request, adminHeaders));
  },
  reportsRequestAdmin: async ({ request, adminHeaders }, use) => {
    await use(new ReportsRequest(request, adminHeaders));
  },
});
