import { PageUrl } from '@src/ui/constants/page-urls';

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
