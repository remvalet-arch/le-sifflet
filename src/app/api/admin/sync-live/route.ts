import { timingSafeEqual } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";
import { syncLiveMatches } from "@/services/sportsdb-sync";

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

/**
 * GET /api/admin/sync-live
 * Scores + minute + statut (livescore v2 L1) et timeline TSDB (v1) pour les matchs en cours en base.
 *
 * Auth :
 * - **Modérateur** : session Supabase, `trust_score` ≥ `MODERATOR_THRESHOLD`.
 * - **Cron Vercel** : `Authorization: Bearer <CRON_SECRET>` (variable `CRON_SECRET` dans le projet Vercel / `.env.local`).
 */
export async function GET(request: Request) {
  if (verifyCronBearer(request)) {
    try {
      const summary = await syncLiveMatches();
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
    const summary = await syncLiveMatches();
    return successResponse(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return errorResponse(msg, 500);
  }
}
