import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';

export const LANGUAGES = ['fr', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Device language from the JS runtime's Intl data; no native module and no region or identifier read. */
export function deviceLanguage(): Language {
  const tag = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
  return tag.startsWith('en') ? 'en' : 'fr';
}

void i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, fr: { translation: fr } },
  lng: deviceLanguage(),
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;
