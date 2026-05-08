import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NotificationsClient from "./NotificationsClient";

export const metadata = { title: "Notifications — VAR TIME" };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "notif_pre_match_5min, notif_pre_match_2h, notif_var_results, notif_prono_results, notif_daily_digest",
    )
    .eq("id", user.id)
    .single();

  return (
    <NotificationsClient
      userId={user.id}
      initialPreMatch5={profile?.notif_pre_match_5min ?? true}
      initialPreMatch2h={profile?.notif_pre_match_2h ?? true}
      initialVarResults={profile?.notif_var_results ?? true}
      initialPronoResults={profile?.notif_prono_results ?? true}
      initialDailyDigest={profile?.notif_daily_digest ?? true}
    />
  );
}
