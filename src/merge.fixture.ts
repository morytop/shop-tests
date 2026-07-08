import { mergeTests } from '@playwright/test';
import { pageObjectTest } from '@src/ui/fixtures/page-object.fixture';

// The project-wide test object. Page-object fixtures are merged here today; the
// API request-object fixtures join via mergeTests in a later phase.
export const test = mergeTests(pageObjectTest);
export { expect } from '@playwright/test';
