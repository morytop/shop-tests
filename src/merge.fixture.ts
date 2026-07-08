import { mergeTests } from '@playwright/test';
import { requestObjectTest } from '@src/api/fixtures/request-object.fixture';
import { pageObjectTest } from '@src/ui/fixtures/page-object.fixture';

// The project-wide test object: page-object fixtures (UI) and request-object
// fixtures (API) merged into one `test`, so a spec can pull either kind of fixture.
export const test = mergeTests(pageObjectTest, requestObjectTest);
export { expect } from '@playwright/test';
