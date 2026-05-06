import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";
import { sendPushToUsers } from "@/lib/push-sender";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/resolve-league-round
 *
 * Résout un round de championnat 1v1 (squad_fixtures → squad_standings).
 * Body: { season_id: string, round_number: number }
 * ou mode auto: { auto: true } → résout tous les rounds actifs dont week_start <= hier.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const { data: profile } = await supabase
    .from("profiles")
    .select("trust_score")
    .eq("id", user.id)
    .single();

  if (!profile || profile.trust_score < MODERATOR_THRESHOLD) {
    return errorResponse("Réservé aux modérateurs", 403);
  }

  const body = (await request.json()) as {
    season_id?: string;
    round_number?: number;
    auto?: boolean;
  };

  const admin = createAdminClient();

  // ── Mode auto : résout tous les rounds actifs dont la semaine est révolue ──
  if (body.auto === true) {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 7);
    const cutoff = yesterday.toISOString().slice(0, 10);

    const { data: activeFixtures, error: fErr } = await admin
      .from("squad_fixtures")
      .select("season_id, round_number")
      .eq("status", "active")
      .lte("week_start", cutoff);

    if (fErr) return errorResponse(fErr.message, 500);

    // Déduplique (season_id, round_number)
    const seen = new Set<string>();
    const rounds: { season_id: string; round_number: number }[] = [];
    for (const f of activeFixtures ?? []) {
      const key = `${f.season_id}:${f.round_number}`;
      if (!seen.has(key)) {
        seen.add(key);
        rounds.push({ season_id: f.season_id, round_number: f.round_number });
      }
    }

    const results: unknown[] = [];
    const errors: string[] = [];
    for (const { season_id, round_number } of rounds) {
      const { data, error } = await admin.rpc("resolve_squad_round", {
        p_season_id: season_id,
        p_round_number: round_number,
      });
      if (error) {
        errors.push(
          `season ${season_id} round ${round_number}: ${error.message}`,
        );
      } else {
        results.push(data);
      }
    }

    return successResponse({
      mode: "auto",
      rounds_processed: rounds.length,
      results,
      errors,
    });
  }

  // ── Mode manuel : season_id + round_number ──
  const { season_id, round_number } = body;
  if (!season_id || !round_number) {
    return errorResponse(
      "season_id et round_number requis (ou auto: true)",
      400,
    );
  }

  const { data, error } = await admin.rpc("resolve_squad_round", {
    p_season_id: season_id,
    p_round_number: round_number,
  });

  if (error) return errorResponse(error.message, 500);

  // Fire-and-forget: send push if season just finished
  const result = data as { season_finished?: boolean } | null;
  if (result?.season_finished) {
    void (async () => {
      try {
        const { data: season } = await admin
          .from("squad_seasons")
          .select("squad_id")
          .eq("id", season_id)
          .single();
        if (!season?.squad_id) return;

        const { data: standings } = await admin
          .from("squad_standings")
          .select("user_id, points")
          .eq("season_id", season_id)
          .order("points", { ascending: false })
          .limit(1);

        const { data: members } = await admin
          .from("squad_members")
          .select("user_id")
          .eq("squad_id", season.squad_id);

        const memberIds = (members ?? []).map((m) => m.user_id);
        const champion = standings?.[0];

        const { data: championProfile } = champion
          ? await admin
              .from("profiles")
              .select("username")
              .eq("id", champion.user_id)
              .single()
          : { data: null };

        await sendPushToUsers(memberIds, {
          title: "🏆 Saison terminée !",
          body: championProfile
            ? `${championProfile.username} est Champion de la ligue !`
            : "Le championnat est terminé — découvre le podium !",
          url: `/ligues/${season.squad_id}`,
        });
      } catch (e) {
        console.error("[resolve-league-round] season-end push failed:", e);
      }
    })();
  }

  return successResponse(data);
}
