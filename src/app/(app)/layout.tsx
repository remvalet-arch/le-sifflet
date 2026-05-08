import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { MigrationBanner } from "@/components/layout/MigrationBanner";
import { LiveRoomProvider } from "@/contexts/LiveRoomContext";
import { sendPushToUsers } from "@/lib/push-sender";
import { DailyRecapChecker } from "@/components/layout/DailyRecapChecker";

async function trackLoginStreak(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<void> {
  const todayStr = new Date().toISOString().slice(0, 10);

  const { data: p } = await supabase
    .from("profiles")
    .select(
      "last_login_date, login_streak, streak_freezes_owned, streak_freezes_used_count",
    )
    .eq("id", userId)
    .single();

  if (!p) return;

  const last = p.last_login_date as string | null;
  if (last === todayStr) return; // Already logged in today

  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const streakContinues = last === yesterday;

  if (!streakContinues && (p.streak_freezes_owned ?? 0) > 0) {
    // Consume a freeze to protect the streak
    await supabase
      .from("profiles")
      .update({
        last_login_date: todayStr,
        streak_freezes_owned: (p.streak_freezes_owned ?? 1) - 1,
        streak_freezes_used_count: (p.streak_freezes_used_count ?? 0) + 1,
      })
      .eq("id", userId);

    // Fire-and-forget push
    void sendPushToUsers([userId], {
      title: "🛡️ Streak sauvé !",
      body: `Un Streak Freeze a été utilisé — ta série de ${p.login_streak ?? 0} jours est préservée.`,
      url: "/profile",
    });
    return;
  }

  const newStreak = streakContinues ? (p.login_streak ?? 0) + 1 : 1;

  await supabase
    .from("profiles")
    .update({ last_login_date: todayStr, login_streak: newStreak })
    .eq("id", userId);
}

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
    .select("username, sifflets_balance, rank, xp")
    .eq("id", user.id)
    .single();

  if (error || !profile) redirect("/?error=profile");

  void trackLoginStreak(supabase, user.id);

  return (
    <LiveRoomProvider>
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-x-hidden bg-zinc-950 shadow-2xl">
        <div className="flex min-h-full flex-1 flex-col text-white">
          <MigrationBanner />
          <DailyRecapChecker />
          <TopBar
            username={profile.username}
            siffletsBalance={profile.sifflets_balance}
            rank={profile.rank}
            xp={profile.xp ?? 0}
            userId={user.id}
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

          <BottomNav userId={user.id} />
        </div>
      </div>
    </LiveRoomProvider>
  );
}
