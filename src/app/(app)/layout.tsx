import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/layout/Header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username, sifflets_balance")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    redirect("/?error=profile");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-gradient-to-b from-pitch-800 to-pitch-900 text-chalk">
      <AppHeader
        username={profile.username}
        siffletsBalance={profile.sifflets_balance}
      />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
