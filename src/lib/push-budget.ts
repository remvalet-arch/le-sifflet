import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Admin = SupabaseClient<Database>;

const CRITICAL_TYPES = ["var_alert", "pre_match", "resolution"] as const;
const DAILY_CRITICAL_MAX = 3;

/** Returns the set of userIds who have already hit their daily critical push budget. */
export async function getBudgetExceededUsers(
  admin: Admin,
  userIds: string[],
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data } = await admin
    .from("push_logs")
    .select("user_id")
    .in("user_id", userIds)
    .in("type", [...CRITICAL_TYPES])
    .gte("sent_at", todayStart.toISOString());

  const countMap = new Map<string, number>();
  for (const row of data ?? []) {
    countMap.set(row.user_id, (countMap.get(row.user_id) ?? 0) + 1);
  }

  const exceeded = new Set<string>();
  for (const [uid, count] of countMap) {
    if (count >= DAILY_CRITICAL_MAX) exceeded.add(uid);
  }
  return exceeded;
}

/** Returns the set of userIds who already received a pre_match push for this match. */
export async function getAlreadyNotifiedUsers(
  admin: Admin,
  userIds: string[],
  matchId: string,
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();

  const { data } = await admin
    .from("push_logs")
    .select("user_id")
    .in("user_id", userIds)
    .eq("match_id", matchId)
    .eq("type", "pre_match");

  return new Set((data ?? []).map((r) => r.user_id));
}

/** Logs a batch of sent pushes (already deduped upstream via getAlreadyNotifiedUsers). */
export async function logPushSent(
  admin: Admin,
  entries: Array<{ user_id: string; match_id: string | null; type: string }>,
): Promise<void> {
  if (entries.length === 0) return;
  await admin.from("push_logs").insert(
    entries.map((e) => ({
      user_id: e.user_id,
      match_id: e.match_id,
      type: e.type as
        | "var_alert"
        | "pre_match"
        | "pre_match_2h"
        | "pre_match_30min"
        | "resolution"
        | "digest"
        | "nudge",
    })),
  );
}
