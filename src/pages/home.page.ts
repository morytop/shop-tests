import { PAGE_URLS } from '../constants/page-urls';
import { BasePage } from './base.page';
import { Page } from '@playwright/test';

export class HomePage extends BasePage {
  readonly PAGE_URL = PAGE_URLS.HOME;

  constructor(page: Page) {
    super(page);
  }
}
