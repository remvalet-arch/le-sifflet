"use client";
import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n/locale";

const LOCALE_TO_URL: Record<Locale, string> = {
  fr: "/",
  en: "/en",
  es: "/es",
  de: "/de",
  it: "/it",
};

export function LandingLocaleSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Locale;
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; SameSite=lax`;
    router.push(LOCALE_TO_URL[next]);
  }

  return (
    <select
      value={locale}
      onChange={onChange}
      className="cursor-pointer rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-xs font-black uppercase text-zinc-400 outline-none transition hover:border-white/20 hover:text-white"
      aria-label="Change language"
    >
      <option value="fr">FR</option>
      <option value="en">EN</option>
      <option value="es">ES</option>
      <option value="de">DE</option>
      <option value="it">IT</option>
    </select>
  );
}
