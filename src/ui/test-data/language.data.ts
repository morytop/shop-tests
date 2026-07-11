import { Language } from '@src/ui/models/language.model';

/**
 * The seven languages the nav selector offers, in the order it renders them.
 * Production ships Greek on top of the six documented in v5 (TEST_PLAN.md §9).
 *
 * `navLabels` are the app's own translations of the four main-menu items, spot-checked
 * against production (§34). Note Dutch translates neither "Home" nor "Contact", so a
 * language check must not lean on those two labels alone.
 */
export const languages: Language[] = [
  {
    code: 'DE',
    name: 'German',
    navLabels: {
      home: 'Start',
      categories: 'Kategorien',
      contact: 'Kontakt',
      signIn: 'Einloggen',
    },
  },
  {
    code: 'EL',
    name: 'Greek',
    navLabels: {
      home: 'Αρχική',
      categories: 'Κατηγορίες',
      contact: 'Επικοινωνία',
      signIn: 'Σύνδεση',
    },
  },
  {
    code: 'EN',
    name: 'English',
    navLabels: {
      home: 'Home',
      categories: 'Categories',
      contact: 'Contact',
      signIn: 'Sign in',
    },
  },
  {
    code: 'ES',
    name: 'Spanish',
    navLabels: {
      home: 'Inicio',
      categories: 'Categorías',
      contact: 'Contacto',
      signIn: 'Iniciar sesión',
    },
  },
  {
    code: 'FR',
    name: 'French',
    navLabels: {
      home: 'Accueil',
      categories: 'Catégories',
      contact: 'Contact',
      signIn: 'Se connecter',
    },
  },
  {
    code: 'NL',
    name: 'Dutch',
    navLabels: {
      home: 'Home',
      categories: 'Categorieën',
      contact: 'Contact',
      signIn: 'Inloggen',
    },
  },
  {
    code: 'TR',
    name: 'Turkish',
    navLabels: {
      home: 'Anasayfa',
      categories: 'Kategoriler',
      contact: 'İletişim',
      signIn: 'Giriş Yap',
    },
  },
];
