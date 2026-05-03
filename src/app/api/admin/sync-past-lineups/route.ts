import { timingSafeEqual } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { delay, syncSpecificMatchLineups } from "@/services/sportsdb-sync";

function verifyCronBearer(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (secret === undefined || secret === "") {
    return false;
  }
  const auth = request.headers.get("authorization");
  if (auth === null || !auth.toLowerCase().startsWith("bearer ")) {
    return false;
  }
  const token = auth.slice(7).trim();
  const a = Buffer.from(token, "utf8");
  const b = Buffer.from(secret, "utf8");
  if (a.length !== b.length) {
    return false;
  }
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export type PastLineupSyncItem = Awaited<ReturnType<typeof syncSpecificMatchLineups>> & {
  error?: string;
};

/**
 * GET /api/admin/sync-past-lineups *(temporaire)*  
 * Matchs **`finished`** avec `thesportsdb_event_id` renseigné et **aucune** ligne dans `lineups` :
 * appelle `syncSpecificMatchLineups` pour chacun, avec **500 ms** entre chaque requête TSDB.
 *
 * Auth : identique à `/api/admin/sync-live` (modérateur ou `Authorization: Bearer` + `CRON_SECRET`).
 */
export async function GET(request: Request) {
  const run = async () => {
    const admin = createAdminClient();

    const { data: finishedRows, error: finErr } = await admin
      .from("matches")
      .select("id")
      .eq("status", "finished")
      .not("thesportsdb_event_id", "is", null);

    if (finErr) {
      throw new Error(finErr.message);
    }

    const allIds = (finishedRows ?? []).map((r) => r.id);
    if (allIds.length === 0) {
      return {
        finishedWithEventId: 0,
        candidatesWithoutLineups: 0,
        results: [] as PastLineupSyncItem[],
      };
    }

    const withLineups = new Set<string>();
    const idChunk = 150;
    for (let i = 0; i < allIds.length; i += idChunk) {
      const slice = allIds.slice(i, i + idChunk);
      const { data: luRows, error: luErr } = await admin.from("lineups").select("match_id").in("match_id", slice);
      if (luErr) {
        throw new Error(luErr.message);
      }
      for (const row of luRows ?? []) {
        withLineups.add(row.match_id);
      }
    }

    const candidateIds = allIds.filter((id) => !withLineups.has(id));
    const results: PastLineupSyncItem[] = [];

    for (let i = 0; i < candidateIds.length; i += 1) {
      const id = candidateIds[i]!;
      try {
        const r = await syncSpecificMatchLineups(id);
        results.push(r);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        results.push({
          matchId: id,
          thesportsdb_event_id: null,
          inserted: 0,
          error: msg,
        });
      }
      if (i < candidateIds.length - 1) {
        await delay(500);
      }
    }

    return {
      finishedWithEventId: allIds.length,
      candidatesWithoutLineups: candidateIds.length,
      results,
    };
  };

  if (verifyCronBearer(request)) {
    try {
      const summary = await run();
      return successResponse(summary);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur inconnue";
      return errorResponse(msg, 500);
    }
  }

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

  try {
    const summary = await run();
    return successResponse(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return errorResponse(msg, 500);
  }
}
