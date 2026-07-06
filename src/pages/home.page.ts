import { PAGE_URLS } from '../constants/page-urls';
import { ProductListPage } from './product-list.page';

export class HomePage extends ProductListPage {
  readonly PAGE_URL = PAGE_URLS.HOME;
}
