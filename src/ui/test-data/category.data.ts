import { PAGE_URLS } from '@src/ui/constants/page-urls';
import { Category } from '@src/ui/models/category.model';

export const categories: Category[] = [
  { name: 'Hand Tools', slug: 'hand-tools', url: PAGE_URLS.HAND_TOOLS },
  { name: 'Power Tools', slug: 'power-tools', url: PAGE_URLS.POWER_TOOLS },
  { name: 'Other', slug: 'other', url: PAGE_URLS.OTHER },
  {
    name: 'Special Tools',
    slug: 'special-tools',
    url: PAGE_URLS.SPECIAL_TOOLS,
  },
];
