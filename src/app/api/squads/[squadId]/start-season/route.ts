import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * Génère le calendrier round-robin "cercle tournant" pour N membres.
 * Retourne les paires (homeIdx, awayIdx) pour chaque round.
 * Pour N membres → N-1 rounds aller × 2 avec home/away inversés pour le retour.
 */
function generateRoundRobin(
  memberIds: string[],
): { home: string; away: string }[][] {
  const n = memberIds.length;
  if (n < 2) return [];

  // Si nombre impair, on ne devrait pas arriver ici (validé en amont),
  // mais on ajoute un "bye" fictif pour robustesse.
  const ids = n % 2 === 0 ? [...memberIds] : [...memberIds, "__bye__"];
  const size = ids.length;
  const rounds: { home: string; away: string }[][] = [];

  for (let round = 0; round < size - 1; round++) {
    const pairs: { home: string; away: string }[] = [];
    for (let i = 0; i < size / 2; i++) {
      const home = ids[i]!;
      const away = ids[size - 1 - i]!;
      if (home !== "__bye__" && away !== "__bye__") {
        pairs.push({ home, away });
      }
    }
    rounds.push(pairs);

    // Rotation : on fixe ids[0] et on tourne ids[1..size-1]
    const last = ids[size - 1]!;
    for (let i = size - 1; i > 1; i--) ids[i] = ids[i - 1]!;
    ids[1] = last;
  }

  // Retour : on inverse home/away
  const retour = rounds.map((r) =>
    r.map(({ home, away }) => ({ home: away, away: home })),
  );
  return [...rounds, ...retour];
}

/** Retourne le lundi (ISO date) de la semaine contenant `d`. */
function getMondayOf(d: Date): Date {
  const day = d.getDay(); // 0=dim, 1=lun, ...
  const diff = (day + 6) % 7; // jours depuis lundi
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - diff);
  monday.setUTCHours(0, 0, 0, 0);
  return monday;
}

/**
 * POST /api/squads/[squadId]/start-season
 *
 * Lance le mode championnat d'une squad en game_mode = 'braquage'.
 * Génère un calendrier round-robin complet (aller + retour) mappé sur des
 * semaines calendaires à partir du lundi suivant la date de lancement.
 * Réservé au propriétaire de la squad.
 */
export async function POST(
  _request: Request,
  context: { params: Promise<{ squadId: string }> },
) {
  const { squadId } = await context.params;
  if (!squadId) return errorResponse("squadId manquant", 400);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return errorResponse("Non authentifié", 401);

  const admin = createAdminClient();

  // ── 1. Vérifications ────────────────────────────────────────────────────────
  const { data: squad, error: sqErr } = await admin
    .from("squads")
    .select("id, owner_id, game_mode, name")
    .eq("id", squadId)
    .single();

  if (sqErr || !squad) return errorResponse("Squad introuvable", 404);
  if (squad.owner_id !== user.id)
    return errorResponse("Réservé au propriétaire", 403);
  if (squad.game_mode !== "braquage")
    return errorResponse("La squad n'est pas en mode 1v1", 400);

  // Vérifier qu'aucune saison active n'existe
  const { data: existingSeason } = await admin
    .from("squad_seasons")
    .select("id, status")
    .eq("squad_id", squadId)
    .in("status", ["pending", "active"])
    .maybeSingle();

  if (existingSeason)
    return errorResponse("Une saison est déjà en cours ou en attente", 409);

  // ── 2. Charger les membres ───────────────────────────────────────────────────
  const { data: members, error: mErr } = await admin
    .from("squad_members")
    .select("user_id")
    .eq("squad_id", squadId);

  if (mErr) return errorResponse(mErr.message, 500);
  const memberIds = (members ?? []).map((m) => m.user_id);

  if (memberIds.length < 2)
    return errorResponse(
      "Il faut au moins 2 membres pour lancer une saison",
      400,
    );
  if (memberIds.length % 2 !== 0)
    return errorResponse(
      `Nombre de membres impair (${memberIds.length}). Attends qu'un membre supplémentaire rejoigne.`,
      400,
    );
  if (memberIds.length > 18)
    return errorResponse("Maximum 18 membres en mode 1v1", 400);

  // ── 3. Générer le calendrier ─────────────────────────────────────────────────
  const allRounds = generateRoundRobin(memberIds);
  const totalRounds = allRounds.length;

  // Le premier round commence le lundi de la semaine prochaine
  const now = new Date();
  const thisMonday = getMondayOf(now);
  const nextMonday = new Date(thisMonday);
  nextMonday.setUTCDate(thisMonday.getUTCDate() + 7);

  // ── 4. Créer la saison ───────────────────────────────────────────────────────
  const { data: season, error: sErr } = await admin
    .from("squad_seasons")
    .insert({
      squad_id: squadId,
      status: "active",
      total_rounds: totalRounds,
      current_round: 1,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (sErr || !season)
    return errorResponse(sErr?.message ?? "Erreur création saison", 500);

  // ── 5. Insérer les fixtures ──────────────────────────────────────────────────
  const fixtureRows = allRounds.flatMap((pairs, roundIdx) => {
    const weekStart = new Date(nextMonday);
    weekStart.setUTCDate(nextMonday.getUTCDate() + roundIdx * 7);
    const weekStartStr = weekStart.toISOString().slice(0, 10);

    return pairs.map(({ home, away }) => ({
      season_id: season.id,
      round_number: roundIdx + 1,
      week_start: weekStartStr,
      home_member_id: home,
      away_member_id: away,
      status: (roundIdx === 0 ? "active" : "upcoming") as
        | "upcoming"
        | "active"
        | "finished",
    }));
  });

  const { error: fErr } = await admin
    .from("squad_fixtures")
    .insert(fixtureRows);
  if (fErr) {
    // Rollback : supprimer la saison créée
    await admin.from("squad_seasons").delete().eq("id", season.id);
    return errorResponse(fErr.message, 500);
  }

  // ── 6. Initialiser le classement ─────────────────────────────────────────────
  const standingRows = memberIds.map((uid) => ({
    season_id: season.id,
    user_id: uid,
  }));

  const { error: stErr } = await admin
    .from("squad_standings")
    .insert(standingRows);
  if (stErr) {
    await admin.from("squad_seasons").delete().eq("id", season.id);
    return errorResponse(stErr.message, 500);
  }

  return successResponse({
    season_id: season.id,
    total_rounds: totalRounds,
    fixtures_count: fixtureRows.length,
    first_week_start: fixtureRows[0]?.week_start,
  });
}
