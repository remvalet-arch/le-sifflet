/**
 * sync-odds.ts
 *
 * Récupère les cotes 1N2 ("Match Winner") depuis API-Football et met à jour
 * les colonnes `odds_home`, `odds_draw`, `odds_away` des matchs à venir.
 *
 * Usage : npx tsx scripts/sync-odds.ts [--force]
 *   --force : re-sync même si les cotes sont déjà renseignées
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";
import { fetchApiFootball } from "../src/lib/api-football-client";

config({ path: ".env.local" });

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};
const ok = (msg: string) =>
  console.log(`${C.green}${C.bold}  ✓${C.reset}  ${msg}`);
const fail = (msg: string) =>
  console.log(`${C.red}${C.bold}  ✗${C.reset}  ${msg}`);
const info = (msg: string) => console.log(`${C.cyan}  ▸${C.reset}  ${msg}`);
const warn = (msg: string) => console.log(`${C.yellow}  ⚠${C.reset}  ${msg}`);

// ── Types API-Football /odds ──────────────────────────────────────────────────

type OddsValue = { value: string; odd: string };
type OddsBet = { id: number; name: string; values: OddsValue[] };
type OddsBookmaker = { id: number; name: string; bets: OddsBet[] };
type OddsFixture = {
  fixture: { id: number };
  bookmakers: OddsBookmaker[];
};
type OddsResponse = { response: OddsFixture[] };

// ── Constantes ────────────────────────────────────────────────────────────────

const MATCH_WINNER_BET_ID = 1;
const PREFERRED_BOOKMAKER_IDS = [6, 8, 1]; // Bwin, Unibet, 1xBet (ordre de préférence)
const DELAY_MS = 400; // entre chaque appel (1 appel = 1 fixture)

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Extraction cotes depuis la réponse API ────────────────────────────────────

function extractOdds(fixture: OddsFixture): {
  home: number | null;
  draw: number | null;
  away: number | null;
} {
  // Chercher un bookmaker préféré, sinon prendre le premier disponible
  let bookmaker: OddsBookmaker | undefined;
  for (const bid of PREFERRED_BOOKMAKER_IDS) {
    bookmaker = fixture.bookmakers.find((b) => b.id === bid);
    if (bookmaker) break;
  }
  if (!bookmaker) bookmaker = fixture.bookmakers[0];
  if (!bookmaker) return { home: null, draw: null, away: null };

  const matchWinner = bookmaker.bets.find((b) => b.id === MATCH_WINNER_BET_ID);
  if (!matchWinner) return { home: null, draw: null, away: null };

  const homeVal = matchWinner.values.find((v) => v.value === "Home");
  const drawVal = matchWinner.values.find((v) => v.value === "Draw");
  const awayVal = matchWinner.values.find((v) => v.value === "Away");

  const toNum = (v: OddsValue | undefined) => {
    const n = v ? parseFloat(v.odd) : NaN;
    return isNaN(n) ? null : n;
  };

  return { home: toNum(homeVal), draw: toNum(drawVal), away: toNum(awayVal) };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const force = process.argv.includes("--force");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    fail("NEXT_PUBLIC_SUPABASE_URL et/ou SUPABASE_SERVICE_ROLE_KEY manquants");
    process.exit(1);
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey);

  // Récupérer les matchs upcoming avec api_football_id
  let query = supabase
    .from("matches")
    .select("id, api_football_id, team_home, team_away, odds_home")
    .eq("status", "upcoming")
    .not("api_football_id", "is", null)
    .order("start_time", { ascending: true });

  if (!force) {
    query = query.is("odds_home", null);
  }

  const { data: matches, error } = await query;
  if (error) {
    fail(`Erreur Supabase : ${error.message}`);
    process.exit(1);
  }

  info(`${String(matches?.length ?? 0)} match(s) à synchroniser`);
  if (!matches || matches.length === 0) {
    info("Rien à faire. Lance avec --force pour re-sync tous les matchs.");
    return;
  }

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  // L'API-Football /odds n'accepte qu'UN seul fixture par appel
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i]!;
    if (!match.api_football_id) continue;

    info(
      `[${String(i + 1)}/${String(matches.length)}] ${match.team_home} — ${match.team_away} (fixture ${String(match.api_football_id)})`,
    );

    try {
      const data = await fetchApiFootball<OddsResponse>("odds", {
        fixture: String(match.api_football_id),
      });

      const fixtureData = data.response?.[0];

      if (!fixtureData) {
        warn(`Aucune cote disponible`);
        skipped++;
      } else {
        const odds = extractOdds(fixtureData);

        if (odds.home === null && odds.draw === null && odds.away === null) {
          warn(`Cotes présentes mais marché "Match Winner" introuvable`);
          skipped++;
        } else {
          const { error: uErr } = await supabase
            .from("matches")
            .update({
              odds_home: odds.home,
              odds_draw: odds.draw,
              odds_away: odds.away,
            })
            .eq("id", match.id);

          if (uErr) {
            fail(uErr.message);
            errors++;
          } else {
            ok(
              `${String(odds.home ?? "?")} / ${String(odds.draw ?? "?")} / ${String(odds.away ?? "?")}`,
            );
            updated++;
          }
        }
      }
    } catch (err) {
      fail(`Erreur : ${String(err)}`);
      errors++;
    }

    if (i < matches.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(
    `\n${C.bold}Résultat${C.reset} : ${String(updated)} mis à jour, ${String(skipped)} sans cotes, ${String(errors)} erreur(s)\n`,
  );
}

main().catch((err: unknown) => {
  fail(String(err));
  process.exit(1);
});
