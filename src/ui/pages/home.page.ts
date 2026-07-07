import { ProductListPage } from './product-list.page';
import { PAGE_URLS } from '@src/ui/constants/page-urls';

export class HomePage extends ProductListPage {
  readonly PAGE_URL = PAGE_URLS.HOME;
}
