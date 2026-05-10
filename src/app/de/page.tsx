import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { HREFLANG_ALTERNATES } from "@/app/page";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://vartime.app";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations({ locale: "de", namespace: "Landing" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: { ...HREFLANG_ALTERNATES, canonical: `${APP_URL}/de` },
    openGraph: {
      title: t("ogTitle"),
      description: t("ogDescription"),
      url: `${APP_URL}/de`,
      locale: "de_DE",
    },
    twitter: {
      card: "summary_large_image",
      title: t("ogTitle"),
      description: t("ogDescription"),
    },
  };
}

export default async function DeLandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/lobby");

  return <LandingPage locale="de" />;
}
