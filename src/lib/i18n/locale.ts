import { cookies } from "next/headers";

export const locales = ["fr", "en", "es", "de", "it"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "fr";

const COOKIE_NAME = "NEXT_LOCALE";

export async function getUserLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(COOKIE_NAME)?.value as Locale;
  return locales.includes(locale) ? locale : defaultLocale;
}

export async function setUserLocale(locale: Locale) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, locale);
}
