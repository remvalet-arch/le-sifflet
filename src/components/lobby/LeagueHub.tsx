"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MatchCard } from "@/components/lobby/MatchCard";
import { LeagueStandingsTable } from "@/components/lobby/LeagueStandingsTable";
import { TopPlayersList } from "@/components/lobby/TopPlayersList";
import type { MatchRow } from "@/types/database";
import { SkeletonMatchCard } from "@/components/ui/SkeletonCard";

type HubTabId = "results" | "standings" | "scorers" | "assists";

const HUB_TABS: { id: HubTabId; label: string }[] = [
  { id: "results", label: "Journées" },
  { id: "standings", label: "Classement" },
  { id: "scorers", label: "Buteurs" },
  { id: "assists", label: "Passeurs" },
];

function toParisDateStr(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("sv-SE", {
    timeZone: "Europe/Paris",
  });
}

/**
 * Construit une map round → max(start_time) pour trier par date réelle.
 * Fonctionne pour les ligues nationales ET les coupes européennes
 * (dont les rounds ont des noms sans numéros : "Quarter-finals", "Final"…).
 */
function buildRoundDateMap(rows: MatchRow[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const m of rows) {
    if (!m.round_short) continue;
    const existing = map.get(m.round_short);
    if (!existing || m.start_time > existing)
      map.set(m.round_short, m.start_time);
  }
  return map;
}

/** Extrait le dernier nombre d'un nom de journée ("Regular Season - 29" → 29, "Final" → null). */
function extractRoundNumber(round: string): number | null {
  const m = round.match(/(\d+)\s*$/);
  return m ? parseInt(m[1]!, 10) : null;
}

/**
 * Rounds triés du plus récent au plus ancien.
 * - Rounds numériques → tri par numéro (évite qu'un match reporté de J29 joué après J33
 *   fasse remonter J29 au-dessus de J33 à cause du MAX(start_time)).
 * - Rounds sans numéro (coupes euro : "Quarter-finals", "Final"…) → tri par date max.
 */
function sortRoundsByDateDesc(rows: MatchRow[]): string[] {
  const dateMap = buildRoundDateMap(rows);
  return [...dateMap.keys()].sort((a, b) => {
    const numA = extractRoundNumber(a);
    const numB = extractRoundNumber(b);
    if (numA !== null && numB !== null) return numB - numA;
    if (numA === null && numB === null)
      return dateMap.get(b)!.localeCompare(dateMap.get(a)!);
    return dateMap.get(b)!.localeCompare(dateMap.get(a)!);
  });
}

/** Date(s) d'une journée au format DD/MM (heure Paris). Plage si multi-jours. */
function roundDateLabel(rows: MatchRow[], round: string): string {
  const matchDates = rows
    .filter((m) => m.round_short === round)
    .map((m) => toParisDateStr(m.start_time))
    .sort();
  if (matchDates.length === 0) return "";
  const fmt = (d: string) => {
    const [, mm, dd] = d.split("-");
    return `${dd}/${mm}`;
  };
  const first = matchDates[0]!;
  const last = matchDates.at(-1)!;
  return first === last ? fmt(first) : `${fmt(first)} – ${fmt(last)}`;
}

function smartDefaultRound(rows: MatchRow[]): string | null {
  if (rows.length === 0) return null;

  const todayParis = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Europe/Paris",
  });
  const now = new Date();

  const roundMap = new Map<string, MatchRow[]>();
  for (const m of rows) {
    if (!m.round_short) continue;
    const list = roundMap.get(m.round_short) ?? [];
    list.push(m);
    roundMap.set(m.round_short, list);
  }

  // Triés du plus récent au plus ancien par date réelle
  const sortedRounds = sortRoundsByDateDesc(rows);

  // 1. Journée avec au moins un match aujourd'hui
  for (const round of sortedRounds) {
    const hasToday = roundMap
      .get(round)!
      .some((m) => toParisDateStr(m.start_time) === todayParis);
    if (hasToday) return round;
  }

  // 2. Journée la plus récente ayant au moins un match passé
  for (const round of sortedRounds) {
    const hasPast = roundMap
      .get(round)!
      .some((m) => new Date(m.start_time) <= now);
    if (hasPast) return round;
  }

  // 3. Fallback : prochaine journée à venir (la plus proche dans le futur)
  return sortedRounds.at(-1) ?? null;
}

export function LeagueHub({
  leagueApiId,
  initialRound,
}: {
  leagueApiId: number;
  initialRound?: string | null;
}) {
  const [hubTab, setHubTab] = useState<HubTabId>("results");
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [selectedRound, setSelectedRound] = useState<string | null>(
    initialRound ?? null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function load() {
      setLoading(true);

      const { data: comp } = await supabase
        .from("competitions")
        .select("id")
        .eq("api_football_league_id", leagueApiId)
        .maybeSingle();

      if (!comp) {
        if (!cancelled) setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("matches")
        .select("*")
        .eq("competition_id", comp.id)
        .not("round_short", "is", null)
        .order("start_time", { ascending: false })
        .limit(500);

      if (cancelled) return;

      const rows = data ?? [];
      setMatches(rows);

      if (!initialRound && rows.length > 0) {
        setSelectedRound(smartDefaultRound(rows));
      }

      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [leagueApiId, initialRound]);

  // Triés du plus récent au plus ancien par date réelle — compatible coupes européennes
  const rounds = useMemo(() => sortRoundsByDateDesc(matches), [matches]);

  const selectedRoundIndex = selectedRound ? rounds.indexOf(selectedRound) : 0;

  function goPrev() {
    const next = rounds[selectedRoundIndex + 1];
    if (next) setSelectedRound(next);
  }

  function goNext() {
    const next = rounds[selectedRoundIndex - 1];
    if (next) setSelectedRound(next);
  }

  const roundMatches = useMemo(
    () =>
      matches
        .filter((m) => m.round_short === selectedRound)
        .sort(
          (a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
        ),
    [matches, selectedRound],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Sous-onglets */}
      <nav
        className="-mx-1 flex gap-1 overflow-x-auto border-b border-white/8 pb-3"
        aria-label="Hub de statistiques"
      >
        {HUB_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setHubTab(t.id)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
              hubTab === t.id
                ? "bg-zinc-700 text-white"
                : "bg-zinc-900/60 text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* ── Journées ─────────────────────────────────────────────────────────── */}
      {hubTab === "results" && (
        <>
          {rounds.length > 0 && (
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900/80 px-2 py-1.5">
              <button
                type="button"
                onClick={goPrev}
                disabled={selectedRoundIndex >= rounds.length - 1}
                aria-label="Journée précédente"
                className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white disabled:pointer-events-none disabled:opacity-25"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>

              <div className="flex flex-col items-center gap-0.5">
                <span className="text-sm font-black tracking-wide text-white">
                  {selectedRound ?? "—"}
                </span>
                {selectedRound && (
                  <span className="text-[11px] font-semibold text-zinc-500">
                    {roundDateLabel(matches, selectedRound)}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={goNext}
                disabled={selectedRoundIndex <= 0}
                aria-label="Journée suivante"
                className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white disabled:pointer-events-none disabled:opacity-25"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonMatchCard key={i} />
              ))}
            </div>
          ) : roundMatches.length === 0 ? (
            <p className="rounded-2xl border border-white/8 bg-zinc-900/60 px-4 py-8 text-center text-sm text-zinc-500">
              {matches.length === 0
                ? "Aucun match en base — lance le script d'import."
                : "Aucun match pour cette journée."}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {roundMatches.map((m) => (
                <li key={m.id}>
                  <MatchCard
                    match={m}
                    goalEvents={[]}
                    mpgLayout
                    hasLineups={m.has_lineups}
                  />
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {/* ── Classement ───────────────────────────────────────────────────────── */}
      {hubTab === "standings" && (
        <LeagueStandingsTable leagueApiId={leagueApiId} />
      )}

      {/* ── Buteurs ──────────────────────────────────────────────────────────── */}
      {hubTab === "scorers" && (
        <TopPlayersList leagueApiId={leagueApiId} type="scorer" />
      )}

      {/* ── Passeurs ─────────────────────────────────────────────────────────── */}
      {hubTab === "assists" && (
        <TopPlayersList leagueApiId={leagueApiId} type="assist" />
      )}
    </div>
  );
}
