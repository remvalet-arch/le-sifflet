import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export async function generateMetadata() {
  const { getTranslations } = await import("next-intl/server");
  const t = await getTranslations("Meta");
  return { title: t("settings") };
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("default_var_bet_amount, sifflets_balance, streak_freezes_owned")
    .eq("id", user.id)
    .single();

  return (
    <SettingsClient
      userId={user.id}
      initialBetAmount={profile?.default_var_bet_amount ?? 50}
      initialBalance={profile?.sifflets_balance ?? 0}
      initialFreezesOwned={profile?.streak_freezes_owned ?? 0}
    />
  );
}
