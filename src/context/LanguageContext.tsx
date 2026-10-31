"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LANGUAGE_OPTIONS, normalizeLocale, type Locale } from "../lib/locale";
import { translate, type TranslationKey } from "../lib/i18n";

const STORAGE_KEY = "shiorivia_local_language_v1";
type LanguageState = { locale: Locale; setLocale: (locale: Locale) => void; t: (key: TranslationKey) => string };
const LanguageContext = createContext<LanguageState | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Server and first client render agree; browser preference is detected after hydration.
  const [locale, setLocale] = useState<Locale>("zh-CN");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved && LANGUAGE_OPTIONS.some(option => option.code === saved)) {
        setLocale(saved as Locale);
      } else {
        const preferred = window.navigator.languages?.[0] || window.navigator.language;
        setLocale(normalizeLocale(preferred));
      }
    } catch { setLocale(normalizeLocale(window.navigator.language)); }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
    try { window.localStorage.setItem(STORAGE_KEY, locale); } catch { /* Storage may be blocked. */ }
  }, [locale, ready]);

  const value = useMemo<LanguageState>(() => ({ locale, setLocale, t: (key) => translate(locale, key) }), [locale]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageState {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage requires LanguageProvider");
  return context;
}
