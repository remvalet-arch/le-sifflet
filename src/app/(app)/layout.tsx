import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username, sifflets_balance")
    .eq("id", user.id)
    .single();

  if (error || !profile) redirect("/?error=profile");

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 text-white">
      <TopBar
        username={profile.username}
        siffletsBalance={profile.sifflets_balance}
      />

      {/* Scrollable content — clears fixed TopBar and BottomNav */}
      <div
        className="flex flex-1 flex-col"
        style={{
          paddingTop: "calc(3.5rem + env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(3.5rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {children}
      </div>

      <BottomNav />
    </div>
  );
}
