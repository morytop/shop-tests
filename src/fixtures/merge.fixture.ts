import { mergeTests } from '@playwright/test';
import { requestObjectTest } from '@src/api/fixtures/request-object.fixture';
import { adminActionTest } from '@src/ui/fixtures/admin-action.fixture';
import { cartActionTest } from '@src/ui/fixtures/cart-action.fixture';
import { loggedSessionTest } from '@src/ui/fixtures/logged-session.fixture';
import { userActionTest } from '@src/ui/fixtures/user-action.fixture';

// The project-wide test object: page-object fixtures + cart/admin/user actions (UI),
// request-object fixtures (API), and the @logged session refresher merged into one
// `test`, so a spec can pull any of them. cartActionTest and adminActionTest both
// extend the page objects, so those come along too.
export const test = mergeTests(
  cartActionTest,
  adminActionTest,
  userActionTest,
  requestObjectTest,
  loggedSessionTest,
);
export { expect } from '@playwright/test';
