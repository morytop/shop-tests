import { mergeTests } from '@playwright/test';
import { requestObjectTest } from '@src/api/fixtures/request-object.fixture';
import { adminActionTest } from '@src/ui/fixtures/admin-action.fixture';
import { cartActionTest } from '@src/ui/fixtures/cart-action.fixture';

// The project-wide test object: page-object fixtures + cart actions + admin actions (UI)
// and request-object fixtures (API) merged into one `test`, so a spec can pull any of
// them. cartActionTest and adminActionTest both extend the page objects, so those come
// along too.
export const test = mergeTests(
  cartActionTest,
  adminActionTest,
  requestObjectTest,
);
export { expect } from '@playwright/test';
