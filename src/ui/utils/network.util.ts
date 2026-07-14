import { Page, Response } from '@playwright/test';

export interface WaitForApiOptions {
  /** Narrow the match to one HTTP verb (e.g. the GET refetch vs the POST write on the same path). */
  method?: string;
  /**
   * Require a 2xx response. Opt-in: waits that deliberately capture error
   * responses (failed logins, duplicate-favorite 409s) must leave this off.
   */
  ok?: boolean;
}

/**
 * Wait for a response whose URL pathname ends with `path`. Matching on
 * `new URL(...).pathname` rather than `url().includes(...)` keeps query strings
 * and unrelated URL segments from satisfying the wait. Paths come from the
 * shared `API_PATHS` endpoint map (`@src/api/utils/api.util`).
 */
export function waitForApi(
  page: Page,
  path: string,
  options: WaitForApiOptions = {},
): Promise<Response> {
  return page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname.endsWith(path) &&
      (options.method === undefined ||
        response.request().method() === options.method) &&
      (!options.ok || response.ok()),
  );
}
