"use server";

import { setUserLocale, type Locale } from "@/lib/i18n/locale";

export async function switchLocale(locale: Locale) {
  await setUserLocale(locale);
}
