import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { successResponse, errorResponse } from "@/lib/api-response";
import { fetchApiFootball } from "@/lib/api-football-client";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type OddsValue = { value: string; odd: string };
type OddsBet = { id: number; name: string; values: OddsValue[] };
type OddsBookmaker = { id: number; name: string; bets: OddsBet[] };
type OddsFixture = { fixture: { id: number }; bookmakers: OddsBookmaker[] };
type OddsResponse = { response: OddsFixture[] };

const MATCH_WINNER_BET_ID = 1;
const PREFERRED_BOOKMAKER_IDS = [6, 8, 1];
const DELAY_MS = 400;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

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

function extractOdds(fixture: OddsFixture): {
  home: number | null;
  draw: number | null;
  away: number | null;
} {
  let bookmaker: OddsBookmaker | undefined;
  for (const bid of PREFERRED_BOOKMAKER_IDS) {
    bookmaker = fixture.bookmakers.find((b) => b.id === bid);
    if (bookmaker) break;
  }
  if (!bookmaker) bookmaker = fixture.bookmakers[0];
  if (!bookmaker) return { home: null, draw: null, away: null };

  const matchWinner = bookmaker.bets.find((b) => b.id === MATCH_WINNER_BET_ID);
  if (!matchWinner) return { home: null, draw: null, away: null };

  const toNum = (v: OddsValue | undefined) => {
    const n = v ? parseFloat(v.odd) : NaN;
    return isNaN(n) ? null : n;
  };

  return {
    home: toNum(matchWinner.values.find((v) => v.value === "Home")),
    draw: toNum(matchWinner.values.find((v) => v.value === "Draw")),
    away: toNum(matchWinner.values.find((v) => v.value === "Away")),
  };
}

/**
 * GET /api/cron/sync-odds
 *
 * Récupère les cotes 1N2 depuis API-Football pour tous les matchs upcoming
 * dont odds_home est NULL. Tournée une fois par semaine (lundi 6h UTC).
 *
 * Auth : Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: Request) {
  if (!verifyCronBearer(request)) {
    return errorResponse("Non autorisé", 401);
  }

  const admin = createAdminClient();

  const { data: matches, error } = await admin
    .from("matches")
    .select("id, api_football_id, team_home, team_away")
    .eq("status", "upcoming")
    .not("api_football_id", "is", null)
    .is("odds_home", null)
    .order("start_time", { ascending: true });

  if (error) return errorResponse(`Supabase : ${error.message}`, 500);
  if (!matches || matches.length === 0) {
    return successResponse({ updated: 0, skipped: 0, errors: 0 });
  }

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]!;
    if (!match.api_football_id) continue;

    try {
      const data = await fetchApiFootball<OddsResponse>("odds", {
        fixture: String(match.api_football_id),
      });

      const fixtureData = data.response?.[0];
      if (!fixtureData) {
        skipped++;
      } else {
        const odds = extractOdds(fixtureData);
        if (odds.home === null && odds.draw === null && odds.away === null) {
          skipped++;
        } else {
          const { error: uErr } = await admin
            .from("matches")
            .update({
              odds_home: odds.home,
              odds_draw: odds.draw,
              odds_away: odds.away,
            })
            .eq("id", match.id);

          if (uErr) {
            errors++;
          } else {
            updated++;
          }
        }
      }
    } catch {
      errors++;
    }

    if (i < matches.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  return successResponse({
    total: matches.length,
    updated,
    skipped,
    errors,
  });
}
