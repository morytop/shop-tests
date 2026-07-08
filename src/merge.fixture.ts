import { mergeTests } from '@playwright/test';
import { requestObjectTest } from '@src/api/fixtures/request-object.fixture';
import { cartActionTest } from '@src/ui/fixtures/cart-action.fixture';

// The project-wide test object: page-object fixtures + cart actions (UI) and
// request-object fixtures (API) merged into one `test`, so a spec can pull any of
// them. cartActionTest already re-exports the page objects (it extends them).
export const test = mergeTests(cartActionTest, requestObjectTest);
export { expect } from '@playwright/test';
