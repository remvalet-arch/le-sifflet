"use client";

import { useLocale } from "next-intl";

export const BCP47_MAP: Record<string, string> = {
  fr: "fr-FR",
  en: "en-GB",
  es: "es-ES",
  de: "de-DE",
  it: "it-IT",
};

/** Returns the BCP-47 locale string matching the current next-intl locale. */
export function useBcp47(): string {
  const locale = useLocale();
  return BCP47_MAP[locale] ?? "fr-FR";
}
