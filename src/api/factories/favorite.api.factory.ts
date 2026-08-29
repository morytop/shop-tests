import { APIRequestContext } from '@playwright/test';
import { getAuthorizationHeader } from '@src/api/factories/authorization-header.api.factory';
import { LoginData } from '@src/api/models/login.api.model';
import { FavoritesRequest } from '@src/api/requests/favorites.request';
import { ProductsRequest } from '@src/api/requests/products.request';
import { expect } from '@src/fixtures/merge.fixture';

/** The catalog product a favorite was created for, as the catalog returned it. */
export interface FavoritedProduct {
  id: string;
  name: string;
}

export async function addFavoritesWithApi(
  request: APIRequestContext,
  credentials: LoginData,
  count = 1,
): Promise<FavoritedProduct[]> {
  const maxPasses = 3;
  const headers = await getAuthorizationHeader(request, credentials);
  const favoritesRequest = new FavoritesRequest(request, headers);
  const productsRequest = new ProductsRequest(request);

  const favorited: FavoritedProduct[] = [];
  let lastRejection = 'no add was attempted';

  for (let pass = 1; pass <= maxPasses && favorited.length < count; pass++) {
    const catalog: FavoritedProduct[] = (
      await (await productsRequest.get()).json()
    ).data;

    for (const product of catalog) {
      if (favorited.length === count) break;
      if (favorited.some((favorite) => favorite.id === product.id)) continue;

      const response = await favoritesRequest.post({ product_id: product.id });
      if (response.status() === 201) {
        favorited.push({ id: product.id, name: product.name });
      } else {
        lastRejection = `${response.status()} ${await response.text()}`;
      }
    }
  }

  expect(
    favorited.length,
    `favorited ${favorited.length} of the requested ${count} products (last rejection: ${lastRejection})`,
  ).toBe(count);

  return favorited;
}
