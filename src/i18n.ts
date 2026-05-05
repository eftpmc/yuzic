import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '@/locales/en.json';
import ja from '@/locales/ja.json';
import fr from '@/locales/fr.json';
import zh from '@/locales/zh.json';

const resources = {
  en: { translation: en },
  ja: { translation: ja },
  fr: { translation: fr },
  zh: { translation: zh },
};

if (!i18n.isInitialized) {
  // eslint-disable-next-line import/no-named-as-default-member
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: 'en',
      fallbackLng: 'en',
      compatibilityJSON: 'v4',
      interpolation: {
        escapeValue: false,
      },
    });
}

export default i18n;
