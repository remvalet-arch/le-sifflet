/**
 * Ingestion TheSportsDB → Supabase (`competitions`, `teams`, `players`, `matches`, timeline live).
 * Clé API : `SPORTSDB_API_KEY` (fallback `THESPORTSDB_API_KEY`) — v1 (URL) + v2 livescore (header `X-API-KEY`).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, MatchStatus, TimelineEventType } from "@/types/database";

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

/** API v2 (Premium) — clé dans le header `X-API-KEY`. */
async function apiFetchV2<T>(relativePath: string): Promise<T> {
  const key = getApiKey();
  const path = relativePath.replace(/^\//, "");
  const url = `https://www.thesportsdb.com/api/v2/json/${path}`;
  const res = await fetch(url, {
    headers: { "X-API-KEY": key },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`TheSportsDB v2 HTTP ${res.status} sur ${path}`);
  }
  return res.json() as Promise<T>;
}

function delay(ms: number): Promise<void> {
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

function mapPosition(strPosition: string): "G" | "D" | "M" | "A" {
  switch (strPosition) {
    case "Goalkeeper":
      return "G";
    case "Defender":
      return "D";
    case "Midfielder":
      return "M";
    case "Forward":
      return "A";
    default:
      return "M";
  }
}

// ── Types bruts API ───────────────────────────────────────────────────────────

type TsdbLeagueRow = {
  idLeague: string;
  strLeague: string;
  strBadge: string | null;
};

/** Objet équipe TSDB — champs réels variables (US/UK, search vs lookupteam). */
type TsdbTeam = {
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
};

type TsdbTeamSearchRow = TsdbTeam & {
  strSport: string;
};

type TsdbPlayerRow = {
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

/** Ligne `livescore` API v2 (`/livescore/{idLeague}`) — `idEvent` peut être nombre JSON. */
type TsdbV2LivescoreRow = {
  idEvent: string | number;
  idLeague?: string | number;
  strStatus: string;
  intHomeScore: string | number | null;
  intAwayScore: string | number | null;
  strProgress: string | number | null;
};

/** Ligne `timeline` API v1 (`lookuptimeline.php` / `lookupeventtimer.php`). */
type TsdbTimelineRow = {
  idTimeline: string;
  idEvent?: string;
  strTimeline: string | null;
  strTimelineDetail: string | null;
  /** Variante API (debug substitutions). */
  strEventDetail?: string | null;
  strAssist?: string | null;
  strHome: string | null;
  idTeam: string | null;
  strPlayer: string | null;
  intTime: string | null;
};

function pickCutout(p: TsdbPlayerRow): string | null {
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

/**
 * Identifiant d'événement TSDB canonique (aligne string DB, nombre JSON v2, zéros de tête).
 */
function tsdbEventIdFromApi(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number" && Number.isFinite(v)) {
    return String(Math.trunc(v));
  }
  const s = String(v).trim();
  if (s === "") return "";
  if (/^\d+$/.test(s)) {
    return String(parseInt(s, 10));
  }
  return s;
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

async function ensureCompetitionByLeagueId(admin: Admin, leagueId: string): Promise<string> {
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

function mapTeamUpsert(
  t: TsdbTeam | TsdbTeamSearchRow,
  competitionUuid: string,
): Database["public"]["Tables"]["teams"]["Insert"] {
  return {
    competition_id: competitionUuid,
    name: t.strTeam,
    short_name: emptyToNull(t.strTeamShort),
    logo_url: mapTeamLogoUrl(t),
    color_primary: mapTeamColorPrimary(t),
    color_secondary: mapTeamColorSecondary(t),
    equipment_url: emptyToNull(t.strEquipment),
    thesportsdb_team_id: t.idTeam,
  };
}

async function lookupTeamById(idTeam: string): Promise<TsdbTeam> {
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

  const rows: Database["public"]["Tables"]["players"]["Insert"][] = roster.map((p) => ({
    thesportsdb_id: p.idPlayer,
    team_id: teamRow.id,
    team_thesportsdb_id: p.idTeam,
    team_name: teamRow.name,
    player_name: p.strPlayer,
    position: mapPosition(p.strPosition ?? ""),
    cutout_url: pickCutout(p),
    synced_at: new Date().toISOString(),
  }));

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

// ── Live : scores + timeline (v2 livescore + v1 timeline) ───────────────────

/** Statuts `matches` considérés « en jeu » (pas `live`, retiré en migration 0015). */
const ACTIVE_LIVE_SYNC_STATUSES: MatchStatus[] = [
  "first_half",
  "half_time",
  "second_half",
  "paused",
];

function parseMatchMinute(strProgress: string | number | null | undefined): number | null {
  if (strProgress == null || String(strProgress).trim() === "") return null;
  const m = /^(\d+)/.exec(String(strProgress).trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (Number.isNaN(n)) return null;
  return Math.min(120, Math.max(0, n));
}

function coerceLivescoreRow(row: unknown): TsdbV2LivescoreRow | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const idEvent = r.idEvent;
  if (idEvent == null || String(idEvent).trim() === "") return null;
  return {
    idEvent: idEvent as string | number,
    idLeague: r.idLeague as string | number | undefined,
    strStatus: String(r.strStatus ?? ""),
    intHomeScore: (r.intHomeScore ?? null) as string | number | null,
    intAwayScore: (r.intAwayScore ?? null) as string | number | null,
    strProgress: (r.strProgress ?? null) as string | number | null,
  };
}

/** `true` si le coup d'envoi (`start_time`) remonte à au moins `minutes` par rapport à `Date.now()`. */
function matchKickoffAtLeastMinutesAgo(startTimeIso: string, minutes: number): boolean {
  const t = new Date(startTimeIso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t >= minutes * 60 * 1000;
}

/** Détails événement v1 (`lookupevent.php`) — même forme que `events` / `event` dans le JSON. */
async function fetchLookupEventForFallback(tsdbEventId: string): Promise<TsdbMatchEvent | null> {
  try {
    const data = await apiFetch<unknown>(`lookupevent.php?id=${encodeURIComponent(tsdbEventId)}`);
    await delay(THROTTLE_MS);
    const list = extractEventsPayload(data);
    return list[0] ?? null;
  } catch {
    await delay(THROTTLE_MS);
    return null;
  }
}

/**
 * Statuts lookupevent considérés comme clôture (→ `finished` en base).
 * Inclut variantes API + cas limites (report / annulation / abandon). Pas `ns` (voir guillotine 150 min).
 */
function isLookupEventFinishedStatus(strStatus: string): boolean {
  const raw = (strStatus ?? "").trim();
  if (raw === "") return false;

  const k = raw.toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ").trim();
  /** Pas `ns` : les « à venir » ne doivent pas passer `finished` via l’API ; la guillotine temporelle gère les blocages. */
  const apiQuirks = new Set(["postponed", "cancelled", "canceled", "abandoned"]);
  if (apiQuirks.has(k)) return true;

  const u = raw.toUpperCase();
  if (u === "MATCH FINISHED" || u === "FT" || u === "FINISHED") return true;
  return mapTsdbStatusToMatchStatus(raw) === "finished";
}

/** Extrait le tableau livescore v2 (clés variables selon versions / wrappers). */
function extractLivescoreRows(data: unknown): TsdbV2LivescoreRow[] {
  if (!data || typeof data !== "object") return [];
  const d = data as Record<string, unknown>;
  const buckets: unknown[] = [d.livescore, d.events, d.results];
  for (const b of buckets) {
    if (!Array.isArray(b) || b.length === 0) continue;
    const out: TsdbV2LivescoreRow[] = [];
    for (const row of b) {
      const coerced = coerceLivescoreRow(row);
      if (coerced) out.push(coerced);
    }
    if (out.length > 0) return out;
  }
  return [];
}

type MatchRowLive = Pick<
  Database["public"]["Tables"]["matches"]["Row"],
  | "id"
  | "thesportsdb_event_id"
  | "home_team_id"
  | "away_team_id"
  | "team_home"
  | "team_away"
  | "status"
  | "start_time"
>;

async function fetchTeamsTsdbByUuid(
  admin: Admin,
  teamUuids: string[],
): Promise<Map<string, string | null>> {
  const unique = [...new Set(teamUuids.filter(Boolean))];
  const map = new Map<string, string | null>();
  if (unique.length === 0) return map;

  const chunkSize = 100;
  for (let i = 0; i < unique.length; i += chunkSize) {
    const slice = unique.slice(i, i + chunkSize);
    const { data, error } = await admin.from("teams").select("id, thesportsdb_team_id").in("id", slice);
    if (error) {
      throw new Error(`teams by id: ${error.message}`);
    }
    for (const row of data ?? []) {
      map.set(row.id, row.thesportsdb_team_id ?? null);
    }
  }
  return map;
}

/**
 * Timeline buts / cartons / remplacements : essaie `lookupeventtimer.php` puis `lookuptimeline.php`.
 */
async function fetchTimelineRowsForEvent(tsdbEventId: string): Promise<TsdbTimelineRow[]> {
  const paths = [
    `lookupeventtimer.php?id=${encodeURIComponent(tsdbEventId)}`,
    `lookuptimeline.php?id=${encodeURIComponent(tsdbEventId)}`,
  ];
  for (const path of paths) {
    try {
      const data = await apiFetch<{ timeline: TsdbTimelineRow[] | null }>(path);
      await delay(THROTTLE_MS);
      if (Array.isArray(data.timeline) && data.timeline.length > 0) {
        return data.timeline;
      }
    } catch {
      await delay(THROTTLE_MS);
    }
  }
  return [];
}

/** Segment URL-safe pour clé de dédup (évite `idTimeline` instable côté TSDB). */
function slugTimelineKeyPart(s: string, maxLen: number): string {
  const t = s
    .normalize("NFD")
    .replace(/\u0300-\u036f/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, maxLen);
  return t.length > 0 ? t : "x";
}

/**
 * Identifiant stable pour `match_timeline_events.thesportsdb_event_id` (upsert).
 * Basé sur match + minute + type + joueur(s) + détail — pas sur `idTimeline` seul.
 */
function buildTimelineSyncDedupeId(
  matchId: string,
  minute: number,
  eventType: TimelineEventType,
  playerName: string,
  row: TsdbTimelineRow,
): string {
  const matchPart = matchId.replace(/-/g, "").slice(0, 12);
  const playerPart = slugTimelineKeyPart(playerName, 22);
  const detailPart = slugTimelineKeyPart(row.strTimelineDetail ?? "", 18);
  const assistPart = slugTimelineKeyPart(row.strAssist ?? "", 18);
  const tag =
    eventType === "goal"
      ? "goal"
      : eventType === "yellow_card"
        ? "yc"
        : eventType === "red_card"
          ? "rc"
          : "sub";
  const base = `${tag}_${matchPart}_m${minute}_${playerPart}_${detailPart}_${assistPart}`;
  return base.replace(/_+$/g, "").slice(0, 220);
}

function mapTimelineRowToInsert(
  matchId: string,
  homeTsdb: string | null,
  awayTsdb: string | null,
  row: TsdbTimelineRow,
): Database["public"]["Tables"]["match_timeline_events"]["Insert"] | null {
  const rawMin = row.intTime?.trim() ?? "";
  let minute = parseInt(rawMin, 10);
  if (Number.isNaN(minute)) minute = 0;
  minute = Math.min(120, Math.max(0, minute));

  const timeline = (row.strTimeline ?? "").trim().toLowerCase();
  const detail = (row.strTimelineDetail ?? "").trim().toLowerCase();
  const detailFull = (row.strTimelineDetail ?? "").trim();

  let eventType: TimelineEventType | null = null;
  if (timeline === "goal" || detail.includes("goal")) {
    eventType = "goal";
  } else if (timeline === "card") {
    if (detail.includes("red")) eventType = "red_card";
    else if (detail.includes("yellow")) eventType = "yellow_card";
    else return null;
  } else if (timeline === "subst" || timeline.includes("subst")) {
    eventType = "substitution";
  } else {
    return null;
  }

  if (eventType === "substitution") {
    const eventDetail =
      row.strEventDetail != null && String(row.strEventDetail).trim() !== ""
        ? row.strEventDetail
        : row.strTimelineDetail;
    console.log("Substitution détectée:", {
      minute: row.intTime,
      player: row.strPlayer,
      details: eventDetail,
    });
  }

  const idTeam = tsdbTeamKey(row.idTeam);
  let team_side: "home" | "away" = row.strHome?.trim() === "Yes" ? "home" : "away";
  if (homeTsdb && idTeam === homeTsdb) team_side = "home";
  else if (awayTsdb && idTeam === awayTsdb) team_side = "away";

  const name = (row.strPlayer ?? "").trim();
  const player_name = name !== "" ? name : "—";
  const own = detail.includes("own goal") || detailFull.toLowerCase().includes("own goal");

  const thesportsdb_event_id = buildTimelineSyncDedupeId(
    matchId,
    minute,
    eventType,
    player_name,
    row,
  );

  return {
    match_id: matchId,
    event_type: eventType,
    minute,
    team_side,
    player_name,
    is_own_goal: own,
    details: detailFull.length > 0 ? detailFull : null,
    thesportsdb_event_id,
  };
}

export type SyncLiveMatchesResult = {
  activeMatchesLoaded: number;
  livescoreRows: number;
  matchesUpdatedFromLivescore: number;
  timelineRowsUpserted: number;
  timelineRowsSkippedUnmapped: number;
};

/**
 * Synchronise les matchs en base (en cours + **upcoming** dans les 5 prochaines minutes)
 * avec le flux livescore Ligue 1 (TheSportsDB **v2** `livescore/4334`) puis import timeline (**v1**).
 */
export async function syncLiveMatches(): Promise<SyncLiveMatchesResult> {
  const admin = createAdminClient();

  const thresholdIso = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const [inPlayRes, upcomingRes] = await Promise.all([
    admin
      .from("matches")
      .select(
        "id, thesportsdb_event_id, home_team_id, away_team_id, team_home, team_away, status, start_time",
      )
      .in("status", ACTIVE_LIVE_SYNC_STATUSES)
      .not("thesportsdb_event_id", "is", null),
    admin
      .from("matches")
      .select(
        "id, thesportsdb_event_id, home_team_id, away_team_id, team_home, team_away, status, start_time",
      )
      .eq("status", "upcoming")
      .lte("start_time", thresholdIso)
      .not("thesportsdb_event_id", "is", null),
  ]);

  if (inPlayRes.error) {
    throw new Error(inPlayRes.error.message);
  }
  if (upcomingRes.error) {
    throw new Error(upcomingRes.error.message);
  }

  const byId = new Map<string, MatchRowLive>();
  for (const row of [...(inPlayRes.data ?? []), ...(upcomingRes.data ?? [])]) {
    byId.set(row.id, row as MatchRowLive);
  }
  const matches = [...byId.values()];

  if (matches.length === 0) {
    return {
      activeMatchesLoaded: 0,
      livescoreRows: 0,
      matchesUpdatedFromLivescore: 0,
      timelineRowsUpserted: 0,
      timelineRowsSkippedUnmapped: 0,
    };
  }

  const teamUuids: string[] = [];
  for (const m of matches) {
    if (m.home_team_id) teamUuids.push(m.home_team_id);
    if (m.away_team_id) teamUuids.push(m.away_team_id);
  }
  const teamTsdbByUuid = await fetchTeamsTsdbByUuid(admin, teamUuids);

  const v2 = await apiFetchV2<unknown>(`livescore/${LIGUE1_LEAGUE_ID}`);
  await delay(THROTTLE_MS);
  const livescoreList = extractLivescoreRows(v2);
  const byEventId = new Map<string, TsdbV2LivescoreRow>();
  for (const row of livescoreList) {
    const id = tsdbEventIdFromApi(row.idEvent);
    if (!id) continue;
    const leagueOk =
      row.idLeague == null ||
      tsdbEventIdFromApi(row.idLeague) === tsdbEventIdFromApi(LIGUE1_LEAGUE_ID);
    if (!leagueOk) continue;
    byEventId.set(id, row);
  }

  let matchesUpdatedFromLivescore = 0;
  for (const m of matches) {
    const evId = tsdbEventIdFromApi(m.thesportsdb_event_id);
    if (!evId) continue;
    const nomMatch = `${m.team_home} — ${m.team_away}`;
    const live = byEventId.get(evId);
    if (!live) {
      console.log(
        `Sync live: aucune ligne livescore pour idEvent=${evId} (${nomMatch}) — ${byEventId.size} événements dans le flux`,
      );

      const lookedUp = await fetchLookupEventForFallback(evId);
      console.log(
        "[DEBUG FALLBACK] API renvoie pour",
        m.team_home,
        "-> strStatus:",
        lookedUp?.strStatus,
      );

      const isTimeExpired = matchKickoffAtLeastMinutesAgo(m.start_time, 150);
      const isApiFinished =
        lookedUp != null && isLookupEventFinishedStatus(lookedUp.strStatus);

      if (!(isTimeExpired || isApiFinished)) {
        continue;
      }

      const reason = isTimeExpired ? "Délai 150min dépassé" : "API Status";
      console.log(`[CLÔTURE FORCÉE] Match ${m.team_home} terminé. Raison: ${reason}`);

      const fbPatch: Database["public"]["Tables"]["matches"]["Update"] = {
        status: "finished",
        match_minute: null,
      };
      if (lookedUp) {
        fbPatch.home_score = parseScore(lookedUp.intHomeScore);
        fbPatch.away_score = parseScore(lookedUp.intAwayScore);
      }

      const { error: fbErr } = await admin.from("matches").update(fbPatch).eq("id", m.id);

      if (fbErr) {
        throw new Error(`matches update (fallback lookupevent) ${m.id}: ${fbErr.message}`);
      }

      matchesUpdatedFromLivescore += 1;
      continue;
    }

    const homeScore = parseScore(live.intHomeScore);
    const awayScore = parseScore(live.intAwayScore);
    const minute = parseMatchMinute(live.strProgress);
    let mappedStatus = mapTsdbStatusToMatchStatus(live.strStatus);

    if (
      (homeScore > 0 || awayScore > 0) &&
      (mappedStatus === "upcoming" || m.status === "upcoming")
    ) {
      mappedStatus = "first_half";
    }

    console.log(
      `[DEBUG LIVE] Match: ${m.team_home}, API Status: "${live.strStatus}", Mapped to: "${mappedStatus}"`,
    );

    const patch: Database["public"]["Tables"]["matches"]["Update"] = {
      home_score: homeScore,
      away_score: awayScore,
      match_minute: minute,
      status: mappedStatus,
    };

    const { error: upErr } = await admin.from("matches").update(patch).eq("id", m.id);
    if (upErr) {
      throw new Error(`matches update ${m.id}: ${upErr.message}`);
    }
    matchesUpdatedFromLivescore += 1;
  }

  let timelineRowsUpserted = 0;
  let timelineRowsSkippedUnmapped = 0;

  for (const m of matches) {
    const evId = tsdbEventIdFromApi(m.thesportsdb_event_id);
    if (!evId) continue;

    const homeTsdb = m.home_team_id ? (teamTsdbByUuid.get(m.home_team_id) ?? null) : null;
    const awayTsdb = m.away_team_id ? (teamTsdbByUuid.get(m.away_team_id) ?? null) : null;

    const timeline = await fetchTimelineRowsForEvent(evId);
    const inserts: Database["public"]["Tables"]["match_timeline_events"]["Insert"][] = [];

    for (const row of timeline) {
      const ins = mapTimelineRowToInsert(m.id, homeTsdb, awayTsdb, row);
      if (ins) inserts.push(ins);
      else timelineRowsSkippedUnmapped += 1;
    }

    if (inserts.length === 0) continue;

    const chunkSize = 40;
    for (let i = 0; i < inserts.length; i += chunkSize) {
      const chunk = inserts.slice(i, i + chunkSize);
      const { error: tlErr } = await admin
        .from("match_timeline_events")
        .upsert(chunk, { onConflict: "thesportsdb_event_id", ignoreDuplicates: true });
      if (tlErr) {
        throw new Error(`match_timeline_events upsert: ${tlErr.message}`);
      }
      timelineRowsUpserted += chunk.length;
    }
  }

  return {
    activeMatchesLoaded: matches.length,
    livescoreRows: livescoreList.length,
    matchesUpdatedFromLivescore,
    timelineRowsUpserted,
    timelineRowsSkippedUnmapped,
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
