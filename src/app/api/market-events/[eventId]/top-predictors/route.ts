import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/** GET /api/market-events/[eventId]/top-predictors
 *  Returns top 5 winners on a resolved market event. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  if (!eventId) return errorResponse("eventId requis", 400);

  const admin = createAdminClient();

  const { data: bets, error } = await admin
    .from("bets")
    .select("user_id, potential_reward")
    .eq("event_id", eventId)
    .eq("status", "won")
    .order("potential_reward", { ascending: false })
    .limit(5);

  if (error) return errorResponse("Erreur récupération", 500);
  if (!bets?.length) return successResponse({ predictors: [] });

  const userIds = bets.map((b) => b.user_id);
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [
      p.id,
      { username: p.username, avatar_url: p.avatar_url },
    ]),
  );

  const predictors = bets.map((b, idx) => ({
    rank: idx + 1,
    user_id: b.user_id,
    username: profileMap.get(b.user_id)?.username ?? "Joueur",
    avatar_url: profileMap.get(b.user_id)?.avatar_url ?? null,
    reward: Math.round(b.potential_reward),
  }));

  return successResponse({ predictors });
}
