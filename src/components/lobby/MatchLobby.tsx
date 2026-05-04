"use client";

import { useMemo, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  EUROPEAN_CUPS,
  TOP_LEAGUES,
  EUROPEAN_CUP_API_IDS,
  isEuropeanCupApiId,
  isLobbyTrackedLeagueApiId,
  lobbyTrackedLeagueLabel,
  type LobbyTabKey,
} from "@/lib/constants/top-leagues";
import { isNextImageRemoteLogoUrl } from "@/lib/remote-logo-hosts";
import { MatchCard } from "@/components/lobby/MatchCard";
import { LeagueHub } from "@/components/lobby/LeagueHub";
import { isLobbyLiveStatus } from "@/lib/matches";
import type { LobbyMatchRow } from "@/types/lobby";
import { toMatchRow } from "@/types/lobby";
import type { MatchGoalLine } from "@/components/lobby/MatchCard";

/** Ordre des sections « Direct » / Europe : Top 5 puis coupes UEFA. */
const LOBBY_GROUP_ORDER: readonly number[] = [
  ...TOP_LEAGUES.map((l) => l.apiFootballLeagueId),
  ...EUROPEAN_CUPS.map((c) => c.apiFootballLeagueId),
];

const TABS: { id: LobbyTabKey; label: string }[] = [
  { id: "direct", label: "Direct" },
  ...TOP_LEAGUES.map((l) => ({ id: l.tabKey, label: l.label })),
  { id: "europe", label: "Europe" },
];

function tabKeyForLeagueApiId(apiId: number): LobbyTabKey {
  const t = TOP_LEAGUES.find((l) => l.apiFootballLeagueId === apiId);
  if (t) return t.tabKey;
  if (isEuropeanCupApiId(apiId)) return "europe";
  return "direct";
}

function leagueGroupKey(m: LobbyMatchRow): string {
  const api = m.competition?.api_football_league_id;
  return api != null ? String(api) : "none";
}

function leagueOrderIndex(apiLeagueId: number | null): number {
  if (apiLeagueId == null) return 999;
  const i = LOBBY_GROUP_ORDER.indexOf(apiLeagueId);
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
  if (trimmed.startsWith("https://") && isNextImageRemoteLogoUrl(trimmed)) {
    return (
      <Image
        src={trimmed}
        alt={alt}
        width={24}
        height={24}
        className="h-6 w-6 shrink-0 object-contain"
        sizes="24px"
      />
    );
  }
  if (trimmed.startsWith("http")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={trimmed}
        alt={alt}
        className="h-6 w-6 shrink-0 object-contain"
      />
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
    .filter((e) => String(e.event_type ?? "").toLowerCase() === "goal")
    .map((e) => ({
      minute: e.minute,
      player_name: e.player_name,
      team_side: e.team_side,
    }));
}

function tabLabelForApiId(apiId: number): string {
  return lobbyTrackedLeagueLabel(apiId);
}

function buildLeagueGroups(rows: LobbyMatchRow[]): LeagueGroup[] {
  const map = new Map<string, LeagueGroup>();
  for (const m of rows) {
    const apiId = m.competition?.api_football_league_id;
    if (apiId == null) continue;
    const key = leagueGroupKey(m);
    const displayName = tabLabelForApiId(apiId);
    const dbBadge = m.competition?.badge_url ?? null;
    // Fallback CDN API-Football si badge_url absent en base
    const badge =
      dbBadge ??
      `https://media.api-sports.io/football/leagues/${String(apiId)}.png`;
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
    g.rows.sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    );
  }
  return list;
}

function defaultTabForProps(
  viewMode: "day" | "round",
  roundContext: { leagueApiId: number; roundShort: string } | null,
): LobbyTabKey {
  if (viewMode === "round" && roundContext != null) {
    return tabKeyForLeagueApiId(roundContext.leagueApiId);
  }
  return "direct";
}

function roundShortForGroup(group: LeagueGroup): string | null {
  const rs = group.rows
    .map((r) => (r.round_short ?? "").trim())
    .find((s) => s !== "");
  return rs ?? null;
}

function LeagueSectionHeader({
  group,
  showRoundLink,
  roundView,
}: {
  group: LeagueGroup;
  showRoundLink: boolean;
  roundView: boolean;
}) {
  const apiId = group.rows[0]?.competition?.api_football_league_id ?? null;
  const rs = roundShortForGroup(group);
  return (
    <div className="flex items-center justify-between gap-3 border-b-2 border-white/15 pb-3">
      <div className="flex min-w-0 items-center gap-2">
        <LeagueBadge url={group.badge} name={group.displayName} />
        <h2 className="line-clamp-2 min-w-0 flex-1 text-sm font-black uppercase leading-tight tracking-wide text-chalk">
          {group.displayName}
        </h2>
      </div>
      {showRoundLink && !roundView && apiId != null && rs != null && (
        <Link
          href={`/lobby?league=${encodeURIComponent(String(apiId))}&round=${encodeURIComponent(rs)}`}
          className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-whistle hover:underline"
        >
          Toute la {rs} →
        </Link>
      )}
    </div>
  );
}

// ── Vue "Europe" : matchs du jour + Hub par coupe ────────────────────────────

type EuropeHubViewProps = {
  europeGrouped: LeagueGroup[];
  europeRows: LobbyMatchRow[];
  roundView: boolean;
  roundContext: { leagueApiId: number; roundShort: string } | null;
};

function EuropeHubView({
  europeGrouped,
  europeRows,
  roundView,
  roundContext,
}: EuropeHubViewProps) {
  const [selectedCupId, setSelectedCupId] = useState<number>(
    EUROPEAN_CUPS[0].apiFootballLeagueId,
  );
  const selectCup = useCallback((id: number) => setSelectedCupId(id), []);

  return (
    <div className="flex flex-col gap-4">
      {/* Matchs Europe du jour (si présents) */}
      {europeRows.length > 0 && (
        <div className="flex flex-col gap-10">
          {europeGrouped.map((group) => (
            <section
              key={group.groupKey}
              className="rounded-xl border border-white/8 bg-zinc-950/40 px-3 pb-4 pt-3 sm:px-4"
            >
              <LeagueSectionHeader
                group={group}
                showRoundLink
                roundView={roundView}
              />
              <ul className="mt-4 flex flex-col gap-3">
                {group.rows.map((m) => (
                  <li key={m.id}>
                    <MatchCard
                      match={toMatchRow(m)}
                      goalEvents={goalsFromTimeline(m)}
                      mpgLayout
                      hasLineups={m.has_lineups}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Sous-sélecteur de coupe — même pattern que les onglets principaux */}
      <nav
        className="-mx-1 flex gap-1 overflow-x-auto pb-1"
        aria-label="Compétition européenne"
      >
        {EUROPEAN_CUPS.map((cup) => (
          <button
            key={cup.apiFootballLeagueId}
            type="button"
            onClick={() => selectCup(cup.apiFootballLeagueId)}
            className={`shrink-0 rounded-full px-3 py-2 text-xs font-black uppercase tracking-wide transition ${
              selectedCupId === cup.apiFootballLeagueId
                ? "bg-whistle text-pitch-900"
                : "bg-zinc-800/90 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            {cup.label}
          </button>
        ))}
      </nav>

      {/* Hub de la coupe sélectionnée */}
      <LeagueHub
        key={selectedCupId}
        leagueApiId={selectedCupId}
        initialRound={
          roundContext?.leagueApiId === selectedCupId
            ? roundContext.roundShort
            : null
        }
      />
    </div>
  );
}

export function MatchLobby({
  initialMatches,
  viewMode = "day",
  roundContext = null,
  dayFallbackBanner = null,
}: {
  initialMatches: LobbyMatchRow[];
  viewMode?: "day" | "round";
  roundContext?: { leagueApiId: number; roundShort: string } | null;
  /** Liste du jour = auto-forward (aucun match sur le football day). */
  dayFallbackBanner?: { shownDayLabelFr: string } | null;
}) {
  const [tab, setTab] = useState<LobbyTabKey>(() =>
    defaultTabForProps(viewMode, roundContext),
  );

  const rows = useMemo(
    () =>
      initialMatches.filter((m) =>
        isLobbyTrackedLeagueApiId(m.competition?.api_football_league_id),
      ),
    [initialMatches],
  );

  /** Direct : live OU à venir avec compos (pas de finished). */
  const directRows = useMemo(
    () =>
      rows.filter(
        (m) =>
          isLobbyLiveStatus(m.status) ||
          (m.status === "upcoming" && m.has_lineups),
      ),
    [rows],
  );

  const directGrouped = useMemo(
    () => buildLeagueGroups(directRows),
    [directRows],
  );

  const europeRows = useMemo(
    () =>
      rows.filter((m) => {
        const id = m.competition?.api_football_league_id;
        return id != null && EUROPEAN_CUP_API_IDS.includes(id);
      }),
    [rows],
  );

  const europeGrouped = useMemo(
    () => buildLeagueGroups(europeRows),
    [europeRows],
  );

  const roundView = viewMode === "round" && roundContext != null;

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-zinc-900 px-6 py-12 text-center text-sm text-zinc-400">
        Aucun match {roundView ? "pour cette sélection" : "pour cette journée"}{" "}
        (championnats + coupes UEFA).
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {roundView && roundContext != null && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-zinc-900/90 px-3 py-2.5 text-xs text-zinc-400">
          <span>
            Journée{" "}
            <span className="font-mono font-bold text-chalk">
              {roundContext.roundShort}
            </span>
          </span>
          <Link
            href="/lobby"
            className="font-bold uppercase tracking-wide text-whistle hover:underline"
          >
            ← Jour Paris
          </Link>
        </div>
      )}

      {!roundView && dayFallbackBanner != null && (
        <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-xs leading-snug text-amber-100/95">
          <p className="font-black uppercase tracking-wide text-amber-400/95">
            Aujourd&apos;hui : repos
          </p>
          <p className="mt-1 font-medium text-amber-50/90">
            Prochains matchs le{" "}
            <span className="font-bold capitalize text-white">
              {dayFallbackBanner.shownDayLabelFr}
            </span>
          </p>
        </div>
      )}

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
        directRows.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-zinc-900/80 px-4 py-8 text-center text-sm font-medium text-zinc-400">
            Aucun match en direct pour le moment.
          </p>
        ) : (
          <div className="flex flex-col gap-10">
            {directGrouped.map((group) => (
              <section
                key={group.groupKey}
                className="rounded-xl border border-white/8 bg-zinc-950/40 px-3 pb-4 pt-3 sm:px-4"
              >
                <LeagueSectionHeader
                  group={group}
                  showRoundLink
                  roundView={roundView}
                />
                <ul className="mt-4 flex flex-col gap-3">
                  {group.rows.map((m) => (
                    <li key={m.id}>
                      <MatchCard
                        match={toMatchRow(m)}
                        goalEvents={goalsFromTimeline(m)}
                        mpgLayout
                        hasLineups={m.has_lineups}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )
      ) : tab === "europe" ? (
        <EuropeHubView
          europeGrouped={europeGrouped}
          europeRows={europeRows}
          roundView={roundView}
          roundContext={roundContext}
        />
      ) : (
        (() => {
          const league = TOP_LEAGUES.find((l) => l.tabKey === tab);
          if (!league) return null;
          return (
            <LeagueHub
              leagueApiId={league.apiFootballLeagueId}
              initialRound={roundContext?.roundShort ?? null}
            />
          );
        })()
      )}
    </div>
  );
}
