/** Supported language codes */
export type LanguageCode = 'en' | 'ja' | 'fr' | 'zh';

export interface LanguageOption {
  /** ISO 639-1 code used by i18next */
  code: LanguageCode;
  /** Native name shown in the selector (e.g. "日本語") */
  nativeName: string;
  /** i18n key under settings.appearance.language */
  translationKey: string;
}

/** All languages the app ships with */
export const AVAILABLE_LANGUAGES: LanguageOption[] = [
  { code: 'en', nativeName: 'English', translationKey: 'settings.appearance.language.english' },
  { code: 'ja', nativeName: '日本語', translationKey: 'settings.appearance.language.japanese' },
  { code: 'fr', nativeName: 'Français', translationKey: 'settings.appearance.language.french' },
  { code: 'zh', nativeName: '中文', translationKey: 'settings.appearance.language.chinese' },
];

/** Look up a language entry by its code */
export const getLanguageByCode = (code: string): LanguageOption | undefined =>
  AVAILABLE_LANGUAGES.find(lang => lang.code === code);

/** Language used when no preference has been stored yet */
export const DEFAULT_LANGUAGE: LanguageCode = 'en';
