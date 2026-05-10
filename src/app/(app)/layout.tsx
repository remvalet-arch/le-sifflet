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
    .select("username, rank, xp")
    .eq("id", user.id)
    .single();

  if (error || !profile) redirect("/?error=profile");

  void trackLoginStreak(supabase, user.id);

  // Vérifie les DMs non lus (threads où mon read_at est avant last_message_at)
  const { data: unreadThreads } = await supabase
    .from("direct_message_threads")
    .select("id, user_a_id, user_a_read_at, user_b_read_at, last_message_at")
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .not("last_message_at", "is", null)
    .limit(20);

  const hasUnreadDm = (unreadThreads ?? []).some((t) => {
    if (!t.last_message_at) return false;
    const myReadAt =
      t.user_a_id === user.id ? t.user_a_read_at : t.user_b_read_at;
    return myReadAt === null || t.last_message_at > myReadAt;
  });

  return (
    <LiveRoomProvider>
      {/* Shell layout: position:fixed inset-0 takes the shell out of document flow
          entirely — body has zero scrollable content so Next.js scroll restoration
          and any window.scrollTo() calls never shift the BottomNav in PWA mode.
          max-w-md + mx-auto (left:0 right:0) centers on wide screens. */}
      <div className="fixed inset-0 mx-auto flex max-w-md flex-col overflow-hidden bg-zinc-950 shadow-2xl">
        <DailyRecapChecker />
        <TopBar
          username={profile.username}
          rank={profile.rank}
          xp={profile.xp ?? 0}
          userId={user.id}
          hasUnreadDm={hasUnreadDm}
        />

        <main className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden text-white">
          <MigrationBanner />
          {children}
        </main>

        <BottomNav userId={user.id} />
      </div>
    </LiveRoomProvider>
  );
}
