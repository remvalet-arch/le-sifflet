import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendPushToUsers } from "@/lib/push-sender";
import { log } from "@/lib/logger";

export const dynamic = "force-dynamic";

function verifyCronBearer(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (!auth?.toLowerCase().startsWith("bearer ")) return false;
  const token = auth.slice(7).trim();
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * POST /api/cron/transition-season
 *
 * Runs on the 1st of each month at 00:00 UTC (vercel.json cron).
 * 1. Archives the current season standings.
 * 2. Rolls over 10% of season_points to the new season.
 * 3. Creates the next month's season record.
 * 4. Sends personalised push notifications to all players with a rank.
 */
export async function POST(request: Request) {
  if (!verifyCronBearer(request)) {
    return errorResponse("Non autorisé", 401);
  }

  const admin = createAdminClient();

  // 1. Run the transition RPC
  const { data: result, error: rpcErr } = await admin.rpc("transition_season");
  if (rpcErr) {
    log.error("transition-season", "RPC error", rpcErr.message);
    return errorResponse("Erreur lors de la transition de saison", 500);
  }

  log.info(
    "transition-season",
    `${result?.old_season} → ${result?.new_season}, ${result?.archived} archivés`,
  );

  // 2. Send personalised push to archived players (fire-and-forget)
  void (async () => {
    try {
      // Fetch the archives for the season that just ended
      const { data: archives } = await admin
        .from("season_archives")
        .select(
          "user_id, final_rank, final_points, final_rank_label, season_id",
        )
        .eq(
          "season_id",
          (
            await admin
              .from("seasons")
              .select("id")
              .eq("slug", result?.old_season as string)
              .single()
          ).data?.id ?? "",
        )
        .order("final_rank", { ascending: true });

      if (!archives?.length) return;

      // Get old and new season labels
      const { data: oldSeason } = await admin
        .from("seasons")
        .select("label")
        .eq("slug", result?.old_season as string)
        .single();
      const { data: newSeason } = await admin
        .from("seasons")
        .select("label")
        .eq("slug", result?.new_season as string)
        .single();

      const oldLabel = oldSeason?.label ?? "la saison";
      const newLabel = newSeason?.label ?? "la nouvelle saison";

      // Send individual push with rank info
      await Promise.allSettled(
        archives.map((a) =>
          sendPushToUsers([a.user_id], {
            title: `🏆 ${oldLabel} terminée !`,
            body: `Tu finis ${a.final_rank_label} avec ${a.final_points} pts. ${newLabel} commence MAINTENANT !`,
            url: "/leaderboard",
          }),
        ),
      );

      log.info(
        "transition-season",
        `pushes envoyés à ${archives.length} joueurs`,
      );
    } catch (e) {
      log.error("transition-season", "push failed", e);
    }
  })();

  return successResponse({
    ok: true,
    old_season: result?.old_season,
    new_season: result?.new_season,
    archived: result?.archived,
  });
}
