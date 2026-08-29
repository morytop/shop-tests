import { PageUrl } from '@src/ui/utils/page-urls.util';

export type CategoryName =
  | 'Hand Tools'
  | 'Power Tools'
  | 'Other'
  | 'Special Tools';

export interface Category {
  name: CategoryName;
  slug: string;
  url: PageUrl;
}
