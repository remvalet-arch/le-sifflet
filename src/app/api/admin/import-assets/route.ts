import { timingSafeEqual } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";
import { importLeagueAssets } from "@/services/sportsdb-assets-import";

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
 * GET /api/admin/import-assets?league=French+Ligue+1
 * Import cosmétique TSDB (`search_all_teams` + effectifs) pour la ligue indiquée.
 *
 * Auth : modérateur (session) ou `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const league = searchParams.get("league")?.trim() ?? "";
  if (league === "") {
    return errorResponse(
      "Paramètre requis : ?league=nom_de_la_ligue (ex. French+Ligue+1)",
      400,
    );
  }

  const run = async () => importLeagueAssets(league);

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
