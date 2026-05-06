import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/health
 * Returns system health: active match count, last monitor tick, open market events.
 * Public — no auth required (non-sensitive summary data only).
 */
export async function GET() {
  const admin = createAdminClient();
  const now = new Date();

  const [
    { count: liveMatchCount },
    { count: openEventCount },
    { count: pendingPronosCount },
    { data: recentMatches },
  ] = await Promise.all([
    admin
      .from("matches")
      .select("id", { count: "exact", head: true })
      .in("status", ["first_half", "half_time", "second_half", "paused"]),
    admin
      .from("market_events")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    admin
      .from("pronos")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    admin
      .from("matches")
      .select("id, team_home, team_away, status, start_time")
      .in("status", [
        "first_half",
        "half_time",
        "second_half",
        "paused",
        "upcoming",
      ])
      .lte("start_time", new Date(now.getTime() + 60 * 60 * 1000).toISOString())
      .order("start_time", { ascending: true })
      .limit(5),
  ]);

  return successResponse({
    timestamp: now.toISOString(),
    live_matches: liveMatchCount ?? 0,
    open_market_events: openEventCount ?? 0,
    pending_pronos: pendingPronosCount ?? 0,
    upcoming_matches: recentMatches ?? [],
  });
}
