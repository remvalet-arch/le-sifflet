const API_BASE = `https://www.thesportsdb.com/api/v1/json/${process.env.THESPORTSDB_API_KEY ?? "123"}/`;

// ── Types bruts de l'API ──────────────────────────────────────────────────────

export type TsdbEvent = {
  idEvent: string;
  idLeague: string;
  strHomeTeam: string;
  strAwayTeam: string;
  dateEvent: string;
  strTime: string | null;
  intHomeScore: string | null;
  intAwayScore: string | null;
  strStatus: string;
  strHomeTeamBadge: string | null;
  strAwayTeamBadge: string | null;
};

export type TsdbPlayer = {
  idPlayer: string;
  idTeam: string;
  strPlayer: string;
  strPosition: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`TheSportsDB ${res.status}: ${path}`);
  return res.json() as Promise<T>;
}

// ── Fonctions publiques ───────────────────────────────────────────────────────

/** Détails d'un événement par son ID TheSportsDB (lookupevent.php). */
export async function getEventDetails(eventId: string): Promise<TsdbEvent | null> {
  const data = await apiFetch<{ events: TsdbEvent[] | null }>(`lookupevent.php?id=${eventId}`);
  return data.events?.[0] ?? null;
}

/** Effectif complet d'une équipe par son Team ID (lookup_all_players.php). */
export async function getTeamRoster(teamId: string): Promise<TsdbPlayer[]> {
  const data = await apiFetch<{ player: TsdbPlayer[] | null }>(`lookup_all_players.php?id=${teamId}`);
  return data.player ?? [];
}
