"use client";

import { useState, useEffect, useCallback } from "react";
import { translations, type Locale, type Translations } from "./translations";

const STORAGE_KEY = "vartime:locale";
const DEFAULT_LOCALE: Locale = "fr";
const CHANGE_EVENT = "vartime:locale-change";

export function useLocale(): {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Translations;
} {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    // Lit la locale stockée via un handler (évite un setState direct dans l'effet)
    const sync = () => {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s === "en" || s === "fr") setLocaleState(s);
    };
    window.addEventListener(CHANGE_EVENT, sync);
    // Dispatch initial pour déclencher sync après montage
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return () => window.removeEventListener(CHANGE_EVENT, sync);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem(STORAGE_KEY, l);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }, []);

  return { locale, setLocale, t: translations[locale] };
}
