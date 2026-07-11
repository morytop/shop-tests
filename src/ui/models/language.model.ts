export type LanguageCode = 'DE' | 'EL' | 'EN' | 'ES' | 'FR' | 'NL' | 'TR';

export interface NavLabels {
  home: string;
  categories: string;
  contact: string;
  signIn: string;
}

export interface Language {
  code: LanguageCode;
  name: string;
  navLabels: NavLabels;
}
