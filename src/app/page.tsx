import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vartime.app";

export const HREFLANG_ALTERNATES = {
  canonical: APP_URL,
  languages: {
    fr: `${APP_URL}/`,
    en: `${APP_URL}/en`,
    es: `${APP_URL}/es`,
    de: `${APP_URL}/de`,
    it: `${APP_URL}/it`,
    "x-default": `${APP_URL}/`,
  },
} as const;

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: "fr", namespace: "Landing" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: HREFLANG_ALTERNATES,
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: APP_URL,
      locale: "fr_FR",
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("ogDescription"),
    },
  };
}

export default async function FrLandingPage({ searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/lobby");

  const sp = await searchParams;
  const oauthError =
    sp.error === "oauth"
      ? decodeURIComponent(
          typeof sp.message === "string"
            ? sp.message.replace(/_/g, " ")
            : "Connexion Google échouée.",
        )
      : null;

  const { count: playerCount } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  return (
    <LandingPage
      locale="fr"
      oauthError={oauthError}
      playerCount={playerCount ?? 0}
    />
  );
}
