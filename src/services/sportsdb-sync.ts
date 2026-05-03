/**
 * Ingestion TheSportsDB → Supabase (`competitions`, `teams`, `players`, `matches`, timeline TSDB hors live, lineups TSDB hors live).
 * Clé API : `SPORTSDB_API_KEY` (fallback `THESPORTSDB_API_KEY`) — v1 (URL). Sync live : `syncLiveMatches` → API-Football (`API_FOOTBALL_KEY`).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { mapPosition } from "@/lib/map-tsdb-position";
import { SYNC_LIVE_MAX_MATCHES_PER_RUN, syncApiFootballMatch } from "@/services/api-football-sync";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MatchStatus } from "@/types/database";

export { mapPosition };

type Admin = SupabaseClient<Database>;

const LIGUE1_LEAGUE_ID = "4334";
const THROTTLE_MS = 550;

/** idTeam TSDB des 3 clubs VIP (Arsenal, Bayern, Atlético) — alignés ActionDrawer / import VIP. */
const VIP_EVENTS_TEAM_IDS = ["133604", "133664", "133738"] as const;

type TeamRowForMatch = Pick<
  Database["public"]["Tables"]["teams"]["Row"],
  "id" | "thesportsdb_team_id" | "name" | "competition_id" | "logo_url" | "color_primary"
>;

const VIP_TEAM_SEARCHES: { searchTerm: string; pick: (teams: TsdbTeamSearchRow[]) => TsdbTeamSearchRow | undefined }[] = [
  {
    searchTerm: "Arsenal",
    pick: (teams) =>
      teams.find((t) => t.strSport === "Soccer" && t.strTeam === "Arsenal") ??
      teams.find((t) => t.strSport === "Soccer" && t.strTeam.includes("Arsenal")),
  },
  {
    searchTerm: "Bayern Munich",
    pick: (teams) =>
      teams.find((t) => t.strSport === "Soccer" && t.strTeam.includes("Bayern") && t.strTeam.includes("Munich")) ??
      teams.find((t) => t.strSport === "Soccer" && t.strTeam.includes("Bayern")),
  },
  {
    searchTerm: "Atletico Madrid",
    pick: (teams) =>
      teams.find(
        (t) =>
          t.strSport === "Soccer" &&
          (t.strTeam.includes("Atlético") || t.strTeam.includes("Atletico")) &&
          t.strTeam.includes("Madrid"),
      ) ?? teams.find((t) => t.strSport === "Soccer" && t.strTeam.includes("Atletico")),
  },
];

// ── API ───────────────────────────────────────────────────────────────────────

function getApiKey(): string {
  const raw = process.env.SPORTSDB_API_KEY ?? process.env.THESPORTSDB_API_KEY;
  if (raw === undefined || raw === null) {
    throw new Error("Clé API manquante");
  }
  const k = raw.trim();
  if (k === "" || k === "undefined") {
    throw new Error("Clé API manquante");
  }
  return k;
}

/**
 * URL canonique : https://www.thesportsdb.com/api/v1/json/{KEY}/{endpoint}
 * (un seul slash entre la clé et le fichier PHP ; path sans slash initial).
 */
function buildSportsdbUrl(endpointPath: string): string {
  const key = getApiKey();
  const path = endpointPath.replace(/^\//, "");
  return `https://www.thesportsdb.com/api/v1/json/${encodeURIComponent(key)}/${path}`;
}

async function apiFetch<T>(path: string): Promise<T> {
  const url = buildSportsdbUrl(path);
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`TheSportsDB HTTP ${res.status} sur ${path}`);
  }
  return res.json() as Promise<T>;
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function emptyToNull(s: string | null | undefined): string | null {
  if (s == null || s.trim() === "") return null;
  return s.trim();
}

/** Première valeur string non vide parmi des clés possibles (casse API TSDB). */
function pickTeamField(team: object, ...keys: string[]): string | null {
  const o = team as Record<string, unknown>;
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string") {
      const t = v.trim();
      if (t !== "") return t;
    }
  }
  return null;
}

function mapTeamLogoUrl(team: TsdbTeam | TsdbTeamSearchRow): string | null {
  return emptyToNull(pickTeamField(team, "strTeamBadge", "strBadge"));
}

function mapTeamColorPrimary(team: TsdbTeam | TsdbTeamSearchRow): string | null {
  return emptyToNull(
    pickTeamField(team, "strTeamColour1", "strTeamColor1", "strColour1"),
  );
}

function mapTeamColorSecondary(team: TsdbTeam | TsdbTeamSearchRow): string | null {
  return emptyToNull(
    pickTeamField(team, "strTeamColour2", "strTeamColor2", "strColour2"),
  );
}

// ── Types bruts API ───────────────────────────────────────────────────────────

type TsdbLeagueRow = {
  idLeague: string;
  strLeague: string;
  strBadge: string | null;
};

/** Objet équipe TSDB — champs réels variables (US/UK, search vs lookupteam). */
export type TsdbTeam = {
  idTeam: string;
  idLeague: string;
  strTeam: string;
  strTeamShort?: string | null;
  strTeamBadge?: string | null;
  strBadge?: string | null;
  strTeamColor1?: string | null;
  strTeamColour1?: string | null;
  strColour1?: string | null;
  strTeamColor2?: string | null;
  strTeamColour2?: string | null;
  strColour2?: string | null;
  strEquipment?: string | null;
  strStadium?: string | null;
  strStadiumThumb?: string | null;
};

type TsdbTeamSearchRow = TsdbTeam & {
  strSport: string;
};

export type TsdbPlayerRow = {
  idPlayer: string;
  idTeam: string;
  strPlayer: string;
  strPosition: string | null;
  strThumb: string | null;
  strCutout: string | null;
};

/** Événement / match — champs utiles eventsnext(league).php */
type TsdbMatchEvent = {
  idEvent: string;
  idLeague: string;
  idHomeTeam: string;
  idAwayTeam: string;
  strHomeTeam: string;
  strAwayTeam: string;
  dateEvent: string;
  strTime: string | null;
  strTimestamp?: string | null;
  strStatus: string;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
};

export function pickCutout(p: TsdbPlayerRow): string | null {
  return emptyToNull(p.strCutout) ?? emptyToNull(p.strThumb);
}

function extractEventsPayload(data: unknown): TsdbMatchEvent[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  const ev = d.events ?? d.event;
  if (Array.isArray(ev)) return ev as TsdbMatchEvent[];
  if (ev && typeof ev === "object") return [ev as TsdbMatchEvent];
  return [];
}

function tsdbTeamKey(id: string | undefined | null): string {
  if (id == null || String(id).trim() === "") return "";
  return String(id).trim();
}

function parseScore(s: string | number | null | undefined): number {
  if (s == null || String(s).trim() === "") return 0;
  const n = parseInt(String(s), 10);
  return Number.isNaN(n) ? 0 : n;
}

/** ISO 8601 pour `matches.start_time` — aligné sur `syncMatchData` (UTC suffix Z). */
function parseStartTimeIso(ev: TsdbMatchEvent): string {
  const ts = ev.strTimestamp?.trim();
  if (ts) {
    const d = new Date(ts);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  const timePart = ev.strTime?.trim();
  if (timePart) {
    const raw = `${ev.dateEvent}T${timePart}Z`;
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date(`${ev.dateEvent}T12:00:00Z`).toISOString();
}

/**
 * Mappe `strStatus` TheSportsDB (v1 + v2 livescore) vers `MatchStatus` (snake_case DB).
 * Comparaison insensible à la casse ; tirets / espaces normalisés.
 */
function mapTsdbStatusToMatchStatus(strStatus: string): MatchStatus {
  const raw = (strStatus ?? "").trim();
  if (raw === "") return "upcoming";

  const k = raw.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();

  const firstHalf = new Set([
    "1h",
    "1st half",
    "first half",
    "in progress",
    "live",
  ]);
  const halfTime = new Set(["ht", "half time"]);
  const secondHalf = new Set([
    "2h",
    "2nd half",
    "second half",
    "extra time",
    "et",
  ]);
  const finished = new Set([
    "ft",
    "full time",
    "finished",
    "aet",
    "pen",
    "match finished",
  ]);
  const upcoming = new Set(["ns", "not started", "scheduled"]);

  if (finished.has(k)) return "finished";
  if (upcoming.has(k)) return "upcoming";
  if (firstHalf.has(k)) return "first_half";
  if (halfTime.has(k)) return "half_time";
  if (secondHalf.has(k)) return "second_half";

  if (k.includes("finished") || k.includes("full time")) return "finished";
  if (k.includes("half time") || k === "halftime") return "half_time";
  if (k.includes("second half") || k.includes("2nd half")) return "second_half";
  if (k.includes("first half") || k.includes("1st half") || k.includes("in progress")) {
    return "first_half";
  }
  if (k.includes("not started")) return "upcoming";

  return "upcoming";
}

// ── Supabase helpers ──────────────────────────────────────────────────────────

export async function ensureCompetitionByLeagueId(admin: Admin, leagueId: string): Promise<string> {
  const data = await apiFetch<{ leagues: TsdbLeagueRow[] | null }>(`lookupleague.php?id=${leagueId}`);
  const league = data.leagues?.[0];
  if (!league) {
    throw new Error(`Ligue TheSportsDB ${leagueId} introuvable (lookupleague).`);
  }

  const { data: row, error } = await admin
    .from("competitions")
    .upsert(
      {
        name: league.strLeague,
        badge_url: emptyToNull(league.strBadge),
        thesportsdb_league_id: league.idLeague,
      },
      { onConflict: "thesportsdb_league_id" },
    )
    .select("id")
    .single();

  if (error || !row) {
    throw new Error(error?.message ?? "upsert competitions sans retour");
  }
  return row.id;
}

export function mapTeamUpsert(
  t: TsdbTeam | TsdbTeamSearchRow,
  competitionUuid: string,
): Database["public"]["Tables"]["teams"]["Insert"] {
  const kit1 = mapTeamColorPrimary(t);
  const kit2 = mapTeamColorSecondary(t);
  return {
    competition_id: competitionUuid,
    name: t.strTeam,
    short_name: emptyToNull(t.strTeamShort),
    logo_url: mapTeamLogoUrl(t),
    color_primary: kit1,
    color_secondary: kit2,
    equipment_url: emptyToNull(t.strEquipment),
    team_color_1: kit1,
    team_color_2: kit2,
    stadium_name: emptyToNull(pickTeamField(t, "strStadium", "strLocation")),
    stadium_thumb: emptyToNull(pickTeamField(t, "strStadiumThumb")),
    thesportsdb_team_id: t.idTeam,
  };
}

export async function lookupTeamById(idTeam: string): Promise<TsdbTeam> {
  const data = await apiFetch<{ teams: TsdbTeam[] | null }>(`lookupteam.php?id=${encodeURIComponent(idTeam)}`);
  const t = data.teams?.[0];
  if (!t) {
    throw new Error(`lookupteam.php?id=${idTeam} : aucune équipe`);
  }
  return t;
}

// ── Fonctions publiques ───────────────────────────────────────────────────────

export type Ligue1SyncResult = {
  competitionId: string;
  teamsUpserted: number;
};

/**
 * Importe toutes les équipes de la Ligue 1 dans `teams` via `search_all_teams.php`
 * (libellé ligue « French Ligue 1 »). La ligne `competitions` reste alignée sur l’id TSDB 4334 (`lookupleague`).
 */
export async function fetchAndUpsertLigue1(): Promise<Ligue1SyncResult> {
  const admin = createAdminClient();
  const competitionId = await ensureCompetitionByLeagueId(admin, LIGUE1_LEAGUE_ID);
  await delay(THROTTLE_MS);

  const ligueQuery = encodeURIComponent("French Ligue 1");
  const data = await apiFetch<{ teams: (TsdbTeam & { strSport?: string })[] | null }>(
    `search_all_teams.php?l=${ligueQuery}`,
  );
  const teams = (data.teams ?? []).filter((t) => !t.strSport || t.strSport === "Soccer");
  let teamsUpserted = 0;

  for (const t of teams) {
    console.log("Team Data check:", t.strTeam, {
      badge: (t as TsdbTeam).strTeamBadge,
      c1: (t as TsdbTeam).strTeamColour1,
    });
    const row = mapTeamUpsert(t, competitionId);
    const { error } = await admin
      .from("teams")
      .upsert(row, { onConflict: "thesportsdb_team_id", ignoreDuplicates: false });
    if (error) {
      throw new Error(`teams L1 upsert ${t.idTeam}: ${error.message}`);
    }
    teamsUpserted += 1;
    await delay(THROTTLE_MS);
  }

  return { competitionId, teamsUpserted };
}

export type VipTeamSyncResult = {
  searchTerm: string;
  thesportsdbTeamId: string;
  strTeam: string;
  competitionId: string;
};

/**
 * Recherche et upsert Arsenal, Bayern Munich, Atlético Madrid (effectif TSDB).
 * Flux : `searchteams.php?t=…` pour la recherche initiale, puis `lookupteam.php?id=…` pour le détail (couleurs, équipement).
 */
export async function fetchAndUpsertVIPTeams(): Promise<VipTeamSyncResult[]> {
  const admin = createAdminClient();
  const results: VipTeamSyncResult[] = [];

  for (const { searchTerm, pick } of VIP_TEAM_SEARCHES) {
    await delay(THROTTLE_MS);
    const data = await apiFetch<{ teams: TsdbTeamSearchRow[] | null }>(
      `searchteams.php?t=${encodeURIComponent(searchTerm)}`,
    );
    const list = data.teams ?? [];
    const chosen = pick(list);
    if (!chosen) {
      throw new Error(`Aucune équipe trouvée pour la recherche « ${searchTerm} » (searchteams).`);
    }

    await delay(THROTTLE_MS);
    const fullTeam = await lookupTeamById(chosen.idTeam);

    const competitionId = await ensureCompetitionByLeagueId(admin, fullTeam.idLeague);
    await delay(THROTTLE_MS);

    const row = mapTeamUpsert(fullTeam, competitionId);
    const { error } = await admin
      .from("teams")
      .upsert(row, { onConflict: "thesportsdb_team_id", ignoreDuplicates: false });
    if (error) {
      throw new Error(`teams VIP upsert ${fullTeam.idTeam}: ${error.message}`);
    }

    results.push({
      searchTerm,
      thesportsdbTeamId: fullTeam.idTeam,
      strTeam: fullTeam.strTeam,
      competitionId,
    });
    await delay(THROTTLE_MS);
  }

  return results;
}

export type RosterSyncResult = {
  thesportsdbTeamId: string;
  supabaseTeamId: string;
  playersUpserted: number;
};

/**
 * Synchronise l'effectif TheSportsDB vers `players`.
 * @param thesportsdbTeamId — `idTeam` TheSportsDB (ex. passé à `lookup_all_players.php?id=`).
 */
export async function syncRosterForTeam(thesportsdbTeamId: string): Promise<RosterSyncResult> {
  const admin = createAdminClient();

  const { data: teamRow, error: teamErr } = await admin
    .from("teams")
    .select("id, name")
    .eq("thesportsdb_team_id", thesportsdbTeamId)
    .maybeSingle();

  if (teamErr) {
    throw new Error(teamErr.message);
  }
  if (!teamRow) {
    throw new Error(
      `Équipe TheSportsDB ${thesportsdbTeamId} absente de public.teams — importer les équipes d'abord.`,
    );
  }

  await delay(THROTTLE_MS);
  const data = await apiFetch<{ player: TsdbPlayerRow[] | null }>(
    `lookup_all_players.php?id=${encodeURIComponent(thesportsdbTeamId)}`,
  );
  const roster = data.player ?? [];

  const rows: Database["public"]["Tables"]["players"]["Insert"][] = roster.map((p) => {
    const img = pickCutout(p);
    return {
      thesportsdb_id: p.idPlayer,
      team_id: teamRow.id,
      team_thesportsdb_id: p.idTeam,
      team_name: teamRow.name,
      player_name: p.strPlayer,
      position: mapPosition(p.strPosition ?? ""),
      cutout_url: img,
      image_url: img,
      synced_at: new Date().toISOString(),
    };
  });

  if (rows.length === 0) {
    return { thesportsdbTeamId, supabaseTeamId: teamRow.id, playersUpserted: 0 };
  }

  const chunkSize = 80;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await admin.from("players").upsert(chunk, { onConflict: "thesportsdb_id" });
    if (error) {
      throw new Error(`players upsert chunk ${thesportsdbTeamId}: ${error.message}`);
    }
    await delay(THROTTLE_MS);
  }

  return {
    thesportsdbTeamId,
    supabaseTeamId: teamRow.id,
    playersUpserted: rows.length,
  };
}

// ── Phase 2 : calendrier `matches` ────────────────────────────────────────────

/**
 * Charge toutes les lignes `teams` nécessaires en **une requête par chunk** (pas de N+1).
 */
async function fetchTeamsMap(admin: Admin, tsdbTeamIds: string[]): Promise<Map<string, TeamRowForMatch>> {
  const unique = [...new Set(tsdbTeamIds.map(tsdbTeamKey).filter(Boolean))];
  const map = new Map<string, TeamRowForMatch>();
  if (unique.length === 0) return map;

  const chunkSize = 100;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const slice = unique.slice(i, i + chunkSize);
    const { data, error } = await admin
      .from("teams")
      .select("id, thesportsdb_team_id, name, competition_id, logo_url, color_primary")
      .in("thesportsdb_team_id", slice);
    if (error) {
      throw new Error(`teams map: ${error.message}`);
    }
    for (const row of data ?? []) {
      if (row.thesportsdb_team_id) {
        map.set(row.thesportsdb_team_id, row);
      }
    }
  }
  return map;
}

function eventToMatchInsert(
  event: TsdbMatchEvent,
  teamMap: Map<string, TeamRowForMatch>,
): Database["public"]["Tables"]["matches"]["Insert"] | null {
  const homeKey = tsdbTeamKey(event.idHomeTeam);
  const awayKey = tsdbTeamKey(event.idAwayTeam);
  if (!homeKey || !awayKey) return null;

  const home = teamMap.get(homeKey);
  const away = teamMap.get(awayKey);
  if (!home || !away) return null;

  const idEv = tsdbTeamKey(event.idEvent);
  if (!idEv) return null;

  return {
    thesportsdb_event_id: idEv,
    team_home: event.strHomeTeam,
    team_away: event.strAwayTeam,
    start_time: parseStartTimeIso(event),
    status: mapTsdbStatusToMatchStatus(event.strStatus),
    home_score: parseScore(event.intHomeScore),
    away_score: parseScore(event.intAwayScore),
    home_team_id: home.id,
    away_team_id: away.id,
    competition_id: home.competition_id,
    home_team_logo: emptyToNull(event.strHomeTeamBadge) ?? home.logo_url,
    away_team_logo: emptyToNull(event.strAwayTeamBadge) ?? away.logo_url,
    home_team_color: home.color_primary,
    away_team_color: away.color_primary,
  };
}

function dedupeEventsById(events: TsdbMatchEvent[]): TsdbMatchEvent[] {
  const map = new Map<string, TsdbMatchEvent>();
  for (const e of events) {
    const id = tsdbTeamKey(e.idEvent);
    if (id) map.set(id, e);
  }
  return [...map.values()];
}

export type SyncUpcomingMatchesResult = {
  /** Événements TSDB retenus après fusion L1 + VIP (dédupliqués par idEvent) */
  eventsConsidered: number;
  /** Lignes effectivement upsert dans `matches` */
  matchesUpserted: number;
  /** Matchs ignorés (équipe domicile ou extérieur absente de `public.teams`, ou idEvent vide) */
  skippedNoTeams: number;
};

/**
 * Synchronise les prochains matchs TheSportsDB vers `public.matches` (upsert sur `thesportsdb_event_id`).
 * - Ligue 1 : `eventsnextleague.php?id=4334`
 * - VIP : `eventsnext.php?id=` pour Arsenal / Bayern / Atlético (idTeam TSDB)
 */
export async function syncUpcomingMatches(): Promise<SyncUpcomingMatchesResult> {
  const admin = createAdminClient();

  const dataL1 = await apiFetch<unknown>(`eventsnextleague.php?id=${LIGUE1_LEAGUE_ID}`);
  await delay(THROTTLE_MS);
  const eventsL1 = extractEventsPayload(dataL1);

  const eventsVip: TsdbMatchEvent[] = [];
  for (const teamId of VIP_EVENTS_TEAM_IDS) {
    const dataV = await apiFetch<unknown>(`eventsnext.php?id=${encodeURIComponent(teamId)}`);
    eventsVip.push(...extractEventsPayload(dataV));
    await delay(THROTTLE_MS);
  }

  const merged = dedupeEventsById([...eventsL1, ...eventsVip]);
  const teamIds: string[] = [];
  for (const e of merged) {
    teamIds.push(tsdbTeamKey(e.idHomeTeam), tsdbTeamKey(e.idAwayTeam));
  }

  const teamMap = await fetchTeamsMap(admin, teamIds);

  const rows: Database["public"]["Tables"]["matches"]["Insert"][] = [];
  let skippedNoTeams = 0;
  for (const e of merged) {
    const row = eventToMatchInsert(e, teamMap);
    if (row) rows.push(row);
    else skippedNoTeams += 1;
  }

  const chunkSize = 25;
  let matchesUpserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await admin.from("matches").upsert(chunk, { onConflict: "thesportsdb_event_id" });
    if (error) {
      throw new Error(`matches upsert: ${error.message}`);
    }
    matchesUpserted += chunk.length;
  }

  return {
    eventsConsidered: merged.length,
    matchesUpserted,
    skippedNoTeams,
  };
}

// ── Live : API-Football (fixtures, lineups, events) ───────────────────────────

/** Statuts `matches` considérés « en jeu » (pas `live`, retiré en migration 0015). */
const ACTIVE_LIVE_SYNC_STATUSES: MatchStatus[] = [
  "first_half",
  "half_time",
  "second_half",
  "paused",
];

type MatchRowApiLive = Pick<
  Database["public"]["Tables"]["matches"]["Row"],
  "id" | "home_team_id" | "away_team_id" | "team_home" | "team_away" | "status" | "start_time"
>;

async function fetchTeamsApiFootballByUuid(
  admin: Admin,
  teamUuids: string[],
): Promise<Map<string, number | null>> {
  const map = new Map<string, number | null>();
  const unique = [...new Set(teamUuids.filter(Boolean))];
  if (unique.length === 0) return map;
  const chunkSize = 100;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const slice = unique.slice(i, i + chunkSize);
    const { data, error } = await admin.from("teams").select("id, api_football_id").in("id", slice);
    if (error) throw new Error(`teams api_football_id: ${error.message}`);
    for (const row of data ?? []) {
      map.set(row.id, row.api_football_id);
    }
  }
  return map;
}

export type SyncLiveMatchesResult = {
  /** Nombre de matchs candidats (en jeu + à venir ≤ 5 min), avant filtre API-Football équipes. */
  activeMatchesLoaded: number;
  /** Toujours 0 (champ conservé pour compat réponses JSON / monitoring). */
  livescoreRows: number;
  /** Matchs effectivement passés à `syncApiFootballMatch` cette exécution (plafonné). */
  matchesConsideredForSync: number;
  /** Matchs synchronisés sans `skippedReason` côté API-Football. */
  matchesUpdatedFromLivescore: number;
  timelineRowsUpserted: number;
  timelineRowsSkippedUnmapped: number;
  lineupRowsInserted: number;
  /** Candidats exclus : `home_team_id` / `away_team_id` ou `api_football_id` équipe manquant. */
  matchesSkippedNoApiFootballTeams: number;
};

/**
 * Synchronise les matchs en base (en cours + **upcoming** dans les 5 prochaines minutes)
 * via **API-Football** : fixture, scores, `lineups`, `match_timeline_events` (`syncApiFootballMatch`).
 */
export async function syncLiveMatches(): Promise<SyncLiveMatchesResult> {
  const admin = createAdminClient();

  const thresholdIso = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const [inPlayRes, upcomingRes] = await Promise.all([
    admin
      .from("matches")
      .select("id, home_team_id, away_team_id, team_home, team_away, status, start_time")
      .in("status", ACTIVE_LIVE_SYNC_STATUSES),
    admin
      .from("matches")
      .select("id, home_team_id, away_team_id, team_home, team_away, status, start_time")
      .eq("status", "upcoming")
      .lte("start_time", thresholdIso),
  ]);

  if (inPlayRes.error) {
    throw new Error(inPlayRes.error.message);
  }
  if (upcomingRes.error) {
    throw new Error(upcomingRes.error.message);
  }

  const byId = new Map<string, MatchRowApiLive>();
  for (const row of [...(inPlayRes.data ?? []), ...(upcomingRes.data ?? [])]) {
    byId.set(row.id, row as MatchRowApiLive);
  }
  const candidates = [...byId.values()];

  if (candidates.length === 0) {
    return {
      activeMatchesLoaded: 0,
      livescoreRows: 0,
      matchesConsideredForSync: 0,
      matchesUpdatedFromLivescore: 0,
      timelineRowsUpserted: 0,
      timelineRowsSkippedUnmapped: 0,
      lineupRowsInserted: 0,
      matchesSkippedNoApiFootballTeams: 0,
    };
  }

  const teamUuids: string[] = [];
  for (const m of candidates) {
    if (m.home_team_id) teamUuids.push(m.home_team_id);
    if (m.away_team_id) teamUuids.push(m.away_team_id);
  }
  const apiByTeam = await fetchTeamsApiFootballByUuid(admin, teamUuids);

  const eligible = candidates.filter((m) => {
    if (!m.home_team_id || !m.away_team_id) return false;
    return apiByTeam.get(m.home_team_id) != null && apiByTeam.get(m.away_team_id) != null;
  });

  const skippedNoApi = candidates.length - eligible.length;
  const matches = eligible.slice(0, SYNC_LIVE_MAX_MATCHES_PER_RUN);

  let matchesUpdatedFromLivescore = 0;
  let timelineRowsUpserted = 0;
  const timelineRowsSkippedUnmapped = 0;
  let lineupRowsInserted = 0;

  for (let i = 0; i < matches.length; i += 1) {
    const m = matches[i]!;
    const r = await syncApiFootballMatch(m.id, { leadingDelayMs: i > 0 ? 6500 : 0 });
    if (!r.skippedReason) {
      matchesUpdatedFromLivescore += 1;
    } else {
      console.log(
        `[sync live API-Football] match ${m.id} (${m.team_home} — ${m.team_away}) skip: ${r.skippedReason}`,
      );
    }
    timelineRowsUpserted += r.timelineUpserted;
    lineupRowsInserted += r.lineupsInserted;
  }

  return {
    activeMatchesLoaded: candidates.length,
    livescoreRows: 0,
    matchesConsideredForSync: matches.length,
    matchesUpdatedFromLivescore,
    timelineRowsUpserted,
    timelineRowsSkippedUnmapped,
    lineupRowsInserted,
    matchesSkippedNoApiFootballTeams: skippedNoApi,
  };
}

export type SyncSpecificMatchLineupsResult = {
  matchId: string;
  /** Conservé pour compat ; le live utilise `apiFootballFixtureId`. */
  thesportsdb_event_id: string | null;
  inserted: number;
  skippedReason?:
    | "match_not_found"
    | "no_thesportsdb_event_id"
    | "missing_home_or_away_team_id"
    | "missing_api_football_team_id"
    | "fixture_not_found"
    | "fixture_ambiguous";
  apiFootballFixtureId?: number | null;
};

/**
 * Sync **un** match via API-Football (compositions + timeline + score), même interface que l’ancien import TSDB lineups.
 */
export async function syncSpecificMatchLineups(matchId: string): Promise<SyncSpecificMatchLineupsResult> {
  const r = await syncApiFootballMatch(matchId);
  return {
    matchId: r.matchId,
    thesportsdb_event_id: null,
    inserted: r.lineupsInserted,
    skippedReason: r.skippedReason,
    apiFootballFixtureId: r.fixtureId,
  };
}

export type InitialSyncSummary = {
  ligue1: Ligue1SyncResult;
  vip: VipTeamSyncResult[];
  rosters?: RosterSyncResult[];
};

/**
 * Chaîne complète : Ligue 1 + VIP, optionnellement tous les rosters des équipes en base.
 */
export async function runInitialSync(options: { rosters: boolean }): Promise<InitialSyncSummary> {
  const ligue1 = await fetchAndUpsertLigue1();
  const vip = await fetchAndUpsertVIPTeams();

  if (!options.rosters) {
    return { ligue1, vip };
  }

  const admin = createAdminClient();
  const { data: allTeams, error } = await admin.from("teams").select("thesportsdb_team_id");
  if (error) {
    throw new Error(error.message);
  }

  const rosters: RosterSyncResult[] = [];
  for (const t of allTeams ?? []) {
    if (!t.thesportsdb_team_id) continue;
    rosters.push(await syncRosterForTeam(t.thesportsdb_team_id));
  }

  return { ligue1, vip, rosters };
}
