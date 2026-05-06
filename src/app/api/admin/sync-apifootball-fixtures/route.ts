import { timingSafeEqual } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { MODERATOR_THRESHOLD } from "@/lib/constants/permissions";
import { syncApiFootballFixturesForDate } from "@/services/api-football-fixtures-import";

const YMD = /^\d{4}-\d{2}-\d{2}$/;

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

function offsetDate(baseMs: number, days: number): string {
  const d = new Date(baseMs + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

/**
 * GET /api/admin/sync-apifootball-fixtures?date=YYYY-MM-DD
 * GET /api/admin/sync-apifootball-fixtures?lookahead=3   (importe J+1 à J+N)
 *
 * Import des matchs **Top 5 + coupes UEFA** (API-Football).
 * Auth : modérateur Supabase OU Bearer CRON_SECRET (cron-job.org).
 */
export async function GET(request: Request) {
  const isCron = verifyCronBearer(request);

  if (!isCron) {
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
  }

  const apiKey = process.env.API_FOOTBALL_KEY?.trim();
  if (!apiKey || apiKey === "undefined") {
    return errorResponse("API_FOOTBALL_KEY manquante ou vide", 500);
  }

  const url = new URL(request.url);

  // Mode lookahead : importe J+1 à J+N (usage cron quotidien)
  const lookaheadParam = url.searchParams.get("lookahead");
  if (lookaheadParam !== null) {
    const n = Math.min(Math.max(1, parseInt(lookaheadParam, 10) || 1), 7);
    const now = Date.now();
    const results: Record<string, unknown>[] = [];
    for (let i = 1; i <= n; i++) {
      const date = offsetDate(now, i);
      try {
        const summary = await syncApiFootballFixturesForDate(date);
        results.push({ ...summary, date });
      } catch (err) {
        results.push({
          date,
          error: err instanceof Error ? err.message : "Erreur inconnue",
        });
      }
    }
    return successResponse({ lookahead: n, results });
  }

  // Mode date explicite (usage admin manuel)
  const date = url.searchParams.get("date")?.trim() ?? "";
  if (!YMD.test(date)) {
    return errorResponse(
      "Paramètre requis : ?date=YYYY-MM-DD ou ?lookahead=N",
      400,
    );
  }

  try {
    const summary = await syncApiFootballFixturesForDate(date);
    return successResponse(summary);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erreur inconnue";
    return errorResponse(msg, 500);
  }
}
