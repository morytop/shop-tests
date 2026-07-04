import { Pages, pages } from './pages';
import { test as base } from '@playwright/test';

export const test = base.extend<Pages>({
  ...pages,
});
