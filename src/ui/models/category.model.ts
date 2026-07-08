export type CategoryName =
  | 'Hand Tools'
  | 'Power Tools'
  | 'Other'
  | 'Special Tools';

export interface Category {
  name: CategoryName;
  slug: string;
}
