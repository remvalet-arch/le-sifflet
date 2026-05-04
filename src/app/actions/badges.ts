"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";

export async function checkAndUnlockBadges(userId: string): Promise<string[]> {
  const supabase = createAdminClient();

  const [
    { data: allBadges },
    { data: userBadgesData },
    { data: profile },
    { data: shortBets },
    { data: pronos },
  ] = await Promise.all([
    supabase.from("badges").select("*"),
    supabase.from("user_badges").select("badge_id").eq("user_id", userId),
    supabase.from("profiles").select("trust_score").eq("id", userId).single(),
    supabase
      .from("bets")
      .select("id, status, event_id")
      .eq("user_id", userId)
      .order("placed_at", { ascending: false }),
    supabase
      .from("pronos")
      .select("id, prono_type, status, match_id")
      .eq("user_id", userId),
  ]);

  if (!allBadges) return [];

  const unlockedIds = new Set((userBadgesData ?? []).map((ub) => ub.badge_id));
  const newlyUnlocked: string[] = [];

  const eventIds = [...new Set((shortBets ?? []).map((b) => b.event_id))];
  const lostMatchCounts: Record<string, number> = {};
  if (eventIds.length > 0) {
    const { data: events } = await supabase
      .from("market_events")
      .select("id, match_id")
      .in("id", eventIds);
    const eventMatchMap = new Map(
      (events ?? []).map((e) => [e.id, e.match_id]),
    );
    for (const bet of shortBets ?? []) {
      if (bet.status === "lost") {
        const matchId = eventMatchMap.get(bet.event_id);
        if (matchId)
          lostMatchCounts[matchId] = (lostMatchCounts[matchId] ?? 0) + 1;
      }
    }
  }

  for (const badge of allBadges) {
    if (unlockedIds.has(badge.id)) continue;

    let shouldUnlock = false;

    switch (badge.criteria_type) {
      case "var_streak_3": {
        const resolved = (shortBets ?? []).filter(
          (b) => b.status !== "pending",
        );
        shouldUnlock =
          resolved.length >= 3 &&
          resolved.slice(0, 3).every((b) => b.status === "won");
        break;
      }
      case "exact_score_win":
        shouldUnlock = (pronos ?? []).some(
          (p) => p.prono_type === "exact_score" && p.status === "won",
        );
        break;
      case "moderator_status":
        shouldUnlock = (profile?.trust_score ?? 0) >= MODERATOR_THRESHOLD;
        break;
      case "var_loss_5_same_match":
        shouldUnlock = Object.values(lostMatchCounts).some(
          (count) => count >= 5,
        );
        break;
      case "scorer_win":
        shouldUnlock = (pronos ?? []).some(
          (p) => p.prono_type === "scorer" && p.status === "won",
        );
        break;
      case "login_streak_3":
        break;
    }

    if (shouldUnlock) {
      const { error } = await supabase
        .from("user_badges")
        .insert({ user_id: userId, badge_id: badge.id });
      if (!error) newlyUnlocked.push(badge.slug);
    }
  }

  return newlyUnlocked;
}
