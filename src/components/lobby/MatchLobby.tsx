"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { TOP_LEAGUES, isTopLeagueApiId, topLeagueByApiId, type TopLeagueTabKey } from "@/lib/constants/top-leagues";
import { MatchCard } from "@/components/lobby/MatchCard";
import { isLobbyLiveStatus } from "@/lib/matches";
import type { LobbyMatchRow } from "@/types/lobby";
import { toMatchRow } from "@/types/lobby";
import type { MatchGoalLine } from "@/components/lobby/MatchCard";

type TabId = "direct" | TopLeagueTabKey;

const TABS: { id: TabId; label: string }[] = [
  { id: "direct", label: "Direct" },
  ...TOP_LEAGUES.map((l) => ({ id: l.tabKey, label: l.label })),
];

const LOGO_HOSTS = new Set(["www.thesportsdb.com", "r2.thesportsdb.com", "media.api-sports.io"]);

/** Groupement strict par `api_football_league_id` (données lobby déjà filtrées Top 5 côté requête). */
function leagueGroupKey(m: LobbyMatchRow): string {
  const api = m.competition?.api_football_league_id;
  return api != null ? String(api) : "none";
}

function leagueOrderIndex(apiLeagueId: number | null): number {
  if (apiLeagueId == null) return 999;
  const i = TOP_LEAGUES.findIndex((l) => l.apiFootballLeagueId === apiLeagueId);
  return i === -1 ? 500 : i;
}

type LeagueGroup = {
  groupKey: string;
  displayName: string;
  badge: string | null;
  rows: LobbyMatchRow[];
};

function LeagueBadge({ url, name }: { url: string | null; name: string }) {
  const alt = name ? `${name} — logo` : "Compétition";
  const trimmed = (url ?? "").trim();
  if (trimmed.startsWith("https://") && (() => {
    try {
      return LOGO_HOSTS.has(new URL(trimmed).hostname);
    } catch {
      return false;
    }
  })()) {
    return (
      <Image src={trimmed} alt={alt} width={24} height={24} className="h-6 w-6 shrink-0 object-contain" sizes="24px" />
    );
  }
  if (trimmed.startsWith("http")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={trimmed} alt={alt} className="h-6 w-6 shrink-0 object-contain" />
    );
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-800 text-[10px] text-zinc-500">
      ⚽
    </span>
  );
}

function goalsFromTimeline(m: LobbyMatchRow): MatchGoalLine[] {
  return (m.match_timeline_events ?? [])
    .filter((e) => e.event_type === "goal")
    .map((e) => ({
      minute: e.minute,
      player_name: e.player_name,
      team_side: e.team_side,
    }));
}

function tabLabelForApiId(apiId: number): string {
  return topLeagueByApiId(apiId)?.label ?? `Ligue ${String(apiId)}`;
}

function buildLeagueGroups(rows: LobbyMatchRow[]): LeagueGroup[] {
  const map = new Map<string, LeagueGroup>();
  for (const m of rows) {
    const apiId = m.competition?.api_football_league_id;
    if (apiId == null) continue;
    const key = leagueGroupKey(m);
    const displayName = tabLabelForApiId(apiId);
    const badge = m.competition?.badge_url ?? null;
    let g = map.get(key);
    if (!g) {
      g = { groupKey: key, displayName, badge, rows: [] };
      map.set(key, g);
    }
    g.rows.push(m);
    if (!g.badge && badge) g.badge = badge;
  }
  const list = [...map.values()];
  list.sort((a, b) => {
    const apiA = Number.parseInt(a.groupKey, 10);
    const apiB = Number.parseInt(b.groupKey, 10);
    const oa = leagueOrderIndex(Number.isNaN(apiA) ? null : apiA);
    const ob = leagueOrderIndex(Number.isNaN(apiB) ? null : apiB);
    if (oa !== ob) return oa - ob;
    return a.displayName.localeCompare(b.displayName, "fr");
  });
  for (const g of list) {
    g.rows.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }
  return list;
}

export function MatchLobby({ initialMatches }: { initialMatches: LobbyMatchRow[] }) {
  const [tab, setTab] = useState<TabId>("direct");

  /** API-Football uniquement (61, 39, 140, 135, 78) — aligné requête serveur + filet client. */
  const rows = useMemo(
    () =>
      initialMatches.filter((m) => isTopLeagueApiId(m.competition?.api_football_league_id)),
    [initialMatches],
  );

  const liveMatches = useMemo(
    () => rows.filter((m) => isLobbyLiveStatus(m.status)),
    [rows],
  );

  const directGrouped = useMemo(() => buildLeagueGroups(liveMatches), [liveMatches]);

  const leagueTabMatches = useMemo(() => {
    if (tab === "direct") return [];
    const league = TOP_LEAGUES.find((l) => l.tabKey === tab);
    if (!league) return [];
    return rows
      .filter((m) => m.competition?.api_football_league_id === league.apiFootballLeagueId)
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [rows, tab]);

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-zinc-900 px-6 py-12 text-center text-sm text-zinc-400">
        Aucun match pour cette journée (Top 5 européen).
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <nav
        className="-mx-1 flex gap-1 overflow-x-auto pb-1"
        aria-label="Filtrer par compétition"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-black uppercase tracking-wide transition ${
              tab === t.id
                ? "bg-whistle text-pitch-900"
                : "bg-zinc-800/90 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "direct" ? (
        liveMatches.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-zinc-900/80 px-4 py-8 text-center text-sm font-medium text-zinc-400">
            Aucun match en direct pour le moment.
          </p>
        ) : (
          <div className="flex flex-col gap-8">
            {directGrouped.map((group) => (
              <section key={group.groupKey}>
                <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                  <LeagueBadge url={group.badge} name={group.displayName} />
                  <h2 className="text-sm font-black uppercase tracking-wide text-chalk">{group.displayName}</h2>
                </div>
                <ul className="mt-3 flex flex-col gap-3">
                  {group.rows.map((m) => (
                    <li key={m.id}>
                      <MatchCard
                        match={toMatchRow(m)}
                        goalEvents={goalsFromTimeline(m)}
                        mpgLayout
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )
      ) : leagueTabMatches.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-zinc-900/80 px-4 py-8 text-center text-sm text-zinc-500">
          Aucun match {TABS.find((x) => x.id === tab)?.label ?? ""} pour cette journée.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {leagueTabMatches.map((m) => (
            <li key={m.id}>
              <MatchCard match={toMatchRow(m)} goalEvents={goalsFromTimeline(m)} mpgLayout />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
