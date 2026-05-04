/**
 * import-league-history.ts
 *
 * Aspiration massive des stats d'une ligue depuis API-Football :
 *   1. Classement      → league_standings
 *   2. Top buteurs     → league_top_players (type='scorer')
 *   3. Top passeurs    → league_top_players (type='assist')
 *   4. Toutes les fixtures → upsert MASSIF dans `matches`, puis syncApiFootballMatch
 *      sur chaque match terminé déjà en base.
 *
 * Usage :
 *   npx tsx scripts/import-league-history.ts <leagueId> [season]
 *
 * Exemples :
 *   npx tsx scripts/import-league-history.ts 61 2024   # Ligue 1, 2024/25
 *   npx tsx scripts/import-league-history.ts 39        # Premier League, saison courante
 */

import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  fetchApiFootball,
  getApiFootballSeasonYear,
} from "../src/lib/api-football-client";
import {
  syncApiFootballMatch,
  mapApiFootballFixtureStatusShort,
  roundShortFromFixtureRow,
} from "../src/services/api-football-sync";
import type { Database } from "../src/types/database";

config({ path: ".env.local" });

// ── CLI args ──────────────────────────────────────────────────────────────────

const [rawLeague, rawSeason] = process.argv.slice(2);
const leagueId = parseInt(rawLeague ?? "", 10);
const season = rawSeason ? parseInt(rawSeason, 10) : getApiFootballSeasonYear();

if (isNaN(leagueId) || leagueId <= 0) {
  console.error(
    "\nUsage : npx tsx scripts/import-league-history.ts <leagueId> [season]",
    "\nExemple : npx tsx scripts/import-league-history.ts 61 2024\n",
  );
  process.exit(1);
}

// ── Couleurs console ──────────────────────────────────────────────────────────

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

const log = {
  ok: (msg: string) => console.log(`${C.green}  ✓${C.reset}  ${msg}`),
  warn: (msg: string) => console.log(`${C.yellow}  ⚠${C.reset}  ${msg}`),
  err: (msg: string) => console.log(`${C.red}  ✗${C.reset}  ${msg}`),
  info: (msg: string) => console.log(`${C.cyan}  ▸${C.reset}  ${msg}`),
  title: (msg: string) =>
    console.log(`\n${C.bold}${C.cyan}══ ${msg} ══${C.reset}`),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const DELAY_MS = 200;
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Types réponses API-Football ───────────────────────────────────────────────

interface ApiStandingEntry {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  all: { played: number };
  form: string | null;
  group?: string;
}

interface ApiPlayerEntry {
  player: { id: number; name: string; photo: string };
  statistics: Array<{
    team: { logo: string };
    goals: { total: number | null; assists: number | null };
    games: { appearences: number | null };
  }>;
}

interface ApiFixtureEntry {
  fixture: { id: number; date: string; status: { short: string } };
  league: { round: string | null };
  teams: {
    home: { id: number; name: string; logo: string };
    away: { id: number; name: string; logo: string };
  };
  goals: { home: number | null; away: number | null };
}

// ── Client Supabase admin ─────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error(
    `${C.red}ERREUR : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY requis dans .env.local${C.reset}`,
  );
  process.exit(1);
}

const db = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Étape 1 : Classement ──────────────────────────────────────────────────────

async function importStandings(): Promise<void> {
  log.title("1/4 · Classement");

  const payload = await fetchApiFootball<{
    response: Array<{ league: { standings: ApiStandingEntry[][] } }>;
  }>("standings", { league: String(leagueId), season: String(season) });

  const groups = payload.response?.[0]?.league?.standings ?? [];

  if (groups.length === 0 || groups.flat().length === 0) {
    log.warn("Aucun classement disponible pour cette ligue / saison");
    return;
  }

  // Les coupes renvoient plusieurs sous-tableaux (un par groupe ou par phase)
  const rows = groups.flatMap((group) => {
    const groupName: string | null =
      group.length > 0 && group[0]?.group ? String(group[0].group) : null;
    return group.map((s) => ({
      league_id: leagueId,
      season,
      rank: s.rank,
      team_id: s.team.id,
      team_name: s.team.name,
      team_logo: s.team.logo || null,
      points: s.points,
      goals_diff: s.goalsDiff,
      played: s.all.played,
      form: s.form ?? null,
      group_name: groupName,
      updated_at: new Date().toISOString(),
    }));
  });

  const { error } = await db
    .from("league_standings")
    .upsert(rows, { onConflict: "league_id,season,team_id" });

  if (error) throw new Error(`league_standings upsert: ${error.message}`);
  log.ok(`${rows.length} équipes upsertées`);
}

// ── Étape 2 : Top buteurs ─────────────────────────────────────────────────────

async function importTopScorers(): Promise<void> {
  log.title("2/4 · Buteurs");

  const payload = await fetchApiFootball<{ response: ApiPlayerEntry[] }>(
    "players/topscorers",
    { league: String(leagueId), season: String(season) },
  );

  const entries = payload.response ?? [];

  if (entries.length === 0) {
    log.warn("Aucun buteur disponible");
    return;
  }

  const rows = entries.map((entry, idx) => ({
    league_id: leagueId,
    season,
    type: "scorer" as const,
    rank: idx + 1,
    player_id: entry.player.id,
    player_name: entry.player.name,
    player_photo: entry.player.photo || null,
    team_logo: entry.statistics[0]?.team.logo || null,
    goals_or_assists_count: entry.statistics[0]?.goals.total ?? 0,
    played_matches: entry.statistics[0]?.games.appearences ?? 0,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await db
    .from("league_top_players")
    .upsert(rows, { onConflict: "league_id,season,type,player_id" });

  if (error) throw new Error(`league_top_players scorers upsert: ${error.message}`);
  log.ok(`${rows.length} buteurs upsertés`);
}

// ── Étape 3 : Top passeurs ────────────────────────────────────────────────────

async function importTopAssists(): Promise<void> {
  log.title("3/4 · Passeurs décisifs");

  const payload = await fetchApiFootball<{ response: ApiPlayerEntry[] }>(
    "players/topassists",
    { league: String(leagueId), season: String(season) },
  );

  const entries = payload.response ?? [];

  if (entries.length === 0) {
    log.warn("Aucun passeur disponible");
    return;
  }

  const rows = entries.map((entry, idx) => ({
    league_id: leagueId,
    season,
    type: "assist" as const,
    rank: idx + 1,
    player_id: entry.player.id,
    player_name: entry.player.name,
    player_photo: entry.player.photo || null,
    team_logo: entry.statistics[0]?.team.logo || null,
    goals_or_assists_count: entry.statistics[0]?.goals.assists ?? 0,
    played_matches: entry.statistics[0]?.games.appearences ?? 0,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await db
    .from("league_top_players")
    .upsert(rows, { onConflict: "league_id,season,type,player_id" });

  if (error) throw new Error(`league_top_players assists upsert: ${error.message}`);
  log.ok(`${rows.length} passeurs upsertés`);
}

// ── Étape 4 : Upsert matches + sync matchs terminés ──────────────────────────

async function importFixtures(): Promise<void> {
  log.title("4/4 · Fixtures → upsert matches + sync terminés");

  // 4a. Récupère l'UUID de la compétition en base
  const { data: comp } = await db
    .from("competitions")
    .select("id")
    .eq("api_football_league_id", leagueId)
    .maybeSingle();

  if (!comp) {
    log.warn(
      `Compétition api_football_league_id=${leagueId} absente en base. ` +
      "Lance d'abord l'import de fixtures via l'admin pour créer la compétition.",
    );
  }
  const competitionId = comp?.id ?? null;

  // 4b. Récupère toutes les fixtures de la saison
  await delay(DELAY_MS);
  const payload = await fetchApiFootball<{ response: ApiFixtureEntry[] }>(
    "fixtures",
    { league: String(leagueId), season: String(season) },
  );

  const allFixtures = payload.response ?? [];
  log.info(`${allFixtures.length} fixtures récupérées depuis API-Football`);

  if (allFixtures.length === 0) {
    log.warn("Aucune fixture disponible — vérif leagueId / season");
    return;
  }

  // 4c. Résolution + auto-upsert des équipes manquantes
  const allTeamApiIds = Array.from(
    new Set(
      allFixtures.flatMap((f) => [f.teams.home.id, f.teams.away.id]).filter((id) => id > 0),
    ),
  );

  // Fetch teams already in DB
  const teamMap = new Map<number, string>();
  if (allTeamApiIds.length > 0) {
    const CHUNK = 100;
    for (let i = 0; i < allTeamApiIds.length; i += CHUNK) {
      const { data } = await db
        .from("teams")
        .select("id, api_football_id")
        .in("api_football_id", allTeamApiIds.slice(i, i + CHUNK));
      for (const row of data ?? []) {
        if (row.api_football_id != null) teamMap.set(row.api_football_id, row.id);
      }
    }
  }

  // Auto-upsert des équipes absentes (si compétition connue)
  if (competitionId) {
    const missingTeamIds = allTeamApiIds.filter((id) => !teamMap.has(id));
    const teamInfoMap = new Map<number, { name: string; logo: string }>();
    for (const f of allFixtures) {
      teamInfoMap.set(f.teams.home.id, { name: f.teams.home.name, logo: f.teams.home.logo });
      teamInfoMap.set(f.teams.away.id, { name: f.teams.away.name, logo: f.teams.away.logo });
    }
    let autoUpserted = 0;
    for (const apiId of missingTeamIds) {
      const info = teamInfoMap.get(apiId);
      if (!info) continue;
      const syntheticId = `apifb-team-${apiId}`;
      const { data: upserted } = await db
        .from("teams")
        .upsert(
          {
            thesportsdb_team_id: syntheticId,
            name: info.name,
            api_football_id: apiId,
            logo_url: info.logo || null,
            competition_id: competitionId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "thesportsdb_team_id" },
        )
        .select("id, api_football_id")
        .single();
      if (upserted?.api_football_id != null) {
        teamMap.set(upserted.api_football_id, upserted.id);
        autoUpserted++;
      }
    }
    if (autoUpserted > 0) log.ok(`${autoUpserted} équipes auto-upsertées`);
  }

  // 4d. Upsert MASSIF de toutes les fixtures dans `matches`
  const matchRows = allFixtures
    .filter((f) => f.fixture.id > 0 && f.teams.home.name && f.teams.away.name)
    .map((f) => ({
      api_football_id: f.fixture.id,
      start_time: f.fixture.date,
      team_home: f.teams.home.name,
      team_away: f.teams.away.name,
      home_score: f.goals.home ?? 0,
      away_score: f.goals.away ?? 0,
      status: mapApiFootballFixtureStatusShort(f.fixture.status.short),
      round_short: roundShortFromFixtureRow(f as unknown as Record<string, unknown>),
      home_team_logo: f.teams.home.logo || null,
      away_team_logo: f.teams.away.logo || null,
      competition_id: competitionId,
      home_team_id: teamMap.get(f.teams.home.id) ?? null,
      away_team_id: teamMap.get(f.teams.away.id) ?? null,
    }));

  // Upsert par batch de 200 pour éviter les payloads trop lourds
  const BATCH = 200;
  let upserted = 0;
  for (let i = 0; i < matchRows.length; i += BATCH) {
    const batch = matchRows.slice(i, i + BATCH);
    const { error: upErr } = await db
      .from("matches")
      .upsert(batch, { onConflict: "api_football_id" });
    if (upErr) throw new Error(`matches upsert batch ${String(i)}: ${upErr.message}`);
    upserted += batch.length;
    process.stdout.write(
      `${C.gray}  Upsert matches ${upserted}/${matchRows.length}…${C.reset}\r`,
    );
  }
  console.log("");
  log.ok(`${upserted} matches upsertés en base`);

  // 4e. Récupère les IDs internes des matchs terminés
  const finishedApiIds = allFixtures
    .filter((f) => FINISHED_STATUSES.has(f.fixture.status.short))
    .map((f) => f.fixture.id);

  log.info(`${finishedApiIds.length} matchs terminés parmi les ${allFixtures.length} fixtures`);

  if (finishedApiIds.length === 0) {
    log.warn("Aucun match terminé — rien à synchroniser (events/compos/stats)");
    return;
  }

  const { data: dbMatches, error: dbErr } = await db
    .from("matches")
    .select("id, api_football_id")
    .in("api_football_id", finishedApiIds);

  if (dbErr) throw new Error(`fetch matches terminés: ${dbErr.message}`);

  const toSync = dbMatches ?? [];
  log.info(`${toSync.length} matchs terminés en base à synchroniser (events + compos + stats)`);

  // 4f. syncApiFootballMatch sur chaque match terminé
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  const total = toSync.length;

  for (let i = 0; i < total; i++) {
    const m = toSync[i]!;
    const progress = `${String(i + 1).padStart(String(total).length)}/${total}`;

    process.stdout.write(
      `${C.gray}  Sync ${progress}  fixture #${m.api_football_id}…${C.reset}\r`,
    );

    await delay(DELAY_MS);

    try {
      const result = await syncApiFootballMatch(m.id);

      if (result.skippedReason) {
        skipCount++;
        if (result.skippedReason !== "missing_api_football_team_id") {
          log.warn(`Sync ${progress}  fixture #${m.api_football_id} — skipped: ${result.skippedReason}`);
        }
      } else {
        successCount++;
        if ((i + 1) % 10 === 0 || i === total - 1) {
          log.ok(
            `Sync ${progress}  ` +
            `compos:${result.lineupsInserted} events:${result.timelineUpserted} stats:${result.statisticsUpserted}`,
          );
        }
      }
    } catch (err) {
      errorCount++;
      log.err(
        `Sync ${progress}  fixture #${m.api_football_id} — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  console.log("");
  log.ok(`Terminé — ${successCount} sync / ${skipCount} skippés / ${errorCount} erreurs`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(
    `\n${C.bold}📊  Le Sifflet — Import Hub Stats${C.reset}`,
    `\n${C.gray}    Ligue : ${leagueId}  ·  Saison : ${season}${C.reset}`,
    `\n${C.gray}    Supabase : ${SUPABASE_URL}${C.reset}`,
  );
  console.log("─".repeat(55));

  await importStandings();
  await delay(DELAY_MS);

  await importTopScorers();
  await delay(DELAY_MS);

  await importTopAssists();
  await delay(DELAY_MS);

  await importFixtures();

  console.log(`\n${C.green}${C.bold}✅  Import complet !${C.reset}\n`);
}

main().catch((err: unknown) => {
  console.error(`\n${C.red}${C.bold}ERREUR FATALE :${C.reset}`, err);
  process.exit(1);
});
