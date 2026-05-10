import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { LiguesPageClient } from "@/components/ligues/LiguesPageClient";

export async function generateMetadata() {
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("Meta");
  return { title: t("ligues") };
}

export default async function LiguesPage() {
  const supabase = await createClient();
  const t = await getTranslations("Ligues");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 bg-zinc-950 px-4 py-6">
      <h1 className="text-xl font-black tracking-tight text-white">
        {t("pageTitle")}
      </h1>
      <p className="mt-1 text-xs font-semibold text-zinc-500">
        {t("pageSubtitle")}
      </p>
      <div className="mt-6">
        <LiguesPageClient userId={user.id} />
      </div>
    </main>
  );
}
