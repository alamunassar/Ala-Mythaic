import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  getDirection,
  getTranslations,
  loadLanguage,
  saveLanguage,
  type Language,
  type TextDirection,
  type TranslationDictionary,
} from './translations';

interface I18nContextValue {
  lang: Language;
  dir: TextDirection;
  setLang: (next: Language) => void;
  tr: TranslationDictionary;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => loadLanguage());

  const dir = getDirection(lang);

  useEffect(() => {
    saveLanguage(lang);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
      document.documentElement.dir = dir;
      document.title = getTranslations(lang).meta.title;
    }
  }, [lang, dir]);

  const setLang = (next: Language) => {
    saveLanguage(next);
    setLangState(next);
  };

  const value = useMemo<I18nContextValue>(
    () => ({
      lang,
      dir,
      setLang,
      tr: getTranslations(lang),
    }),
    [lang, dir],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return {
      lang: 'ar',
      dir: 'rtl',
      setLang: () => undefined,
      tr: getTranslations('ar'),
    };
  }
  return ctx;
}
