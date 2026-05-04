import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";
import {
  fetchApiFootball,
  getApiFootballSeasonYear,
} from "@/lib/api-football-client";

const SEARCH_MIN_LEN = 3;
/** ≥ 6,5 s entre deux appels API — reste sous le plafond 10 requêtes / minute (plan gratuit). */
const THROTTLE_MS = 6500;
const BATCH_LIMIT = 10;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Retire les accents, ne garde que lettres/chiffres et espaces (recherche API-Football). */
function normalizeTeamSearchQuery(raw: string): string {
  const stripped = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return stripped
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

type ApiFootballTeamsPayload = {
  errors?: unknown;
  response?: Array<{ team?: { id?: number; name?: string } }>;
};

type MapSuccess = {
  teamId: string;
  teamName: string;
  apiFootballId: number;
  apiFootballName: string;
};

type MapFailure = {
  teamId: string;
  teamName: string;
  reason: string;
};

/**
 * GET /api/admin/map-apifootball-teams
 * Mappe jusqu’à **10** équipes sans `api_football_id` par appel (`GET /teams?search=…`).
 * Délai **6,5 s** entre chaque requête API. Auth : modérateur (`trust_score` ≥ seuil).
 */
export async function GET() {
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
    return errorResponse("Accès réservé aux modérateurs", 403);
  }

  const apiKey = process.env.API_FOOTBALL_KEY?.trim();
  if (apiKey === undefined || apiKey === "" || apiKey === "undefined") {
    return errorResponse(
      "API_FOOTBALL_KEY manquante ou vide (voir .env.example)",
      500,
    );
  }

  const admin = createAdminClient();
  const { data: teams, error: listErr } = await admin
    .from("teams")
    .select("id, name")
    .is("api_football_id", null)
    .order("name")
    .limit(BATCH_LIMIT);

  if (listErr) {
    return errorResponse(listErr.message, 500);
  }

  const successes: MapSuccess[] = [];
  const failures: MapFailure[] = [];
  let throttleBeforeNextApi = false;

  for (const row of teams ?? []) {
    const searchQuery = normalizeTeamSearchQuery(row.name ?? "");
    if (searchQuery.length < SEARCH_MIN_LEN) {
      failures.push({
        teamId: row.id,
        teamName: row.name,
        reason: `nom nettoyé trop court pour l’API (minimum ${String(SEARCH_MIN_LEN)} caractères, reçu « ${searchQuery} »)`,
      });
      continue;
    }

    if (throttleBeforeNextApi) {
      await delay(THROTTLE_MS);
    }
    throttleBeforeNextApi = true;

    let payload: ApiFootballTeamsPayload;
    try {
      payload = await fetchApiFootball<ApiFootballTeamsPayload>("/teams", {
        search: searchQuery,
        season: String(getApiFootballSeasonYear()),
      });
    } catch (e) {
      failures.push({
        teamId: row.id,
        teamName: row.name,
        reason: e instanceof Error ? e.message : "Erreur requête API-Football",
      });
      continue;
    }

    if (payload.errors !== undefined && payload.errors !== null) {
      const errStr =
        typeof payload.errors === "object"
          ? JSON.stringify(payload.errors)
          : String(payload.errors);
      if (errStr !== "{}" && errStr !== "[]" && errStr !== "") {
        failures.push({
          teamId: row.id,
          teamName: row.name,
          reason: `API errors: ${errStr}`,
        });
        continue;
      }
    }

    const first = payload.response?.[0]?.team;
    const afId = first?.id;
    if (typeof afId !== "number" || Number.isNaN(afId)) {
      failures.push({
        teamId: row.id,
        teamName: row.name,
        reason: "aucun résultat ou identifiant équipe absent",
      });
      continue;
    }

    const { error: upErr } = await admin
      .from("teams")
      .update({ api_football_id: afId })
      .eq("id", row.id);

    if (upErr) {
      failures.push({
        teamId: row.id,
        teamName: row.name,
        reason: upErr.message,
      });
      continue;
    }

    successes.push({
      teamId: row.id,
      teamName: row.name,
      apiFootballId: afId,
      apiFootballName: (first?.name ?? "").trim() || "(sans nom)",
    });
  }

  const { count: remainingNull, error: countErr } = await admin
    .from("teams")
    .select("id", { count: "exact", head: true })
    .is("api_football_id", null);

  if (countErr) {
    return errorResponse(countErr.message, 500);
  }

  return successResponse({
    processed: (teams ?? []).length,
    mapped: successes.length,
    failed: failures.length,
    remainingToMap: remainingNull ?? 0,
    successes,
    failures,
  });
}
