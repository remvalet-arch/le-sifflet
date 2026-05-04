"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { MatchCard } from "@/components/lobby/MatchCard";
import { LeagueStandingsTable } from "@/components/lobby/LeagueStandingsTable";
import { TopPlayersList } from "@/components/lobby/TopPlayersList";
import type { MatchRow } from "@/types/database";

type HubTabId = "results" | "standings" | "scorers" | "assists";

const HUB_TABS: { id: HubTabId; label: string }[] = [
  { id: "results", label: "Résultats" },
  { id: "standings", label: "Classement" },
  { id: "scorers", label: "Buteurs" },
  { id: "assists", label: "Passeurs" },
];

function parseRoundNumber(roundShort: string): number {
  const m = /(\d+)/.exec(roundShort);
  return m?.[1] ? parseInt(m[1], 10) : 0;
}

export function LeagueHub({
  leagueApiId,
  initialRound,
}: {
  leagueApiId: number;
  /** Pré-sélectionne une journée (ex : navigation depuis "Toute la J32 →"). */
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
        // Sélectionne la journée la plus récente par défaut
        const rounds = [
          ...new Set(
            rows.map((m) => m.round_short).filter((r): r is string => r !== null),
          ),
        ].sort((a, b) => parseRoundNumber(b) - parseRoundNumber(a));
        setSelectedRound(rounds[0] ?? null);
      }

      setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [leagueApiId, initialRound]);

  // Liste des journées triées du plus récent au plus ancien
  const rounds = useMemo(() => {
    const rs = [
      ...new Set(
        matches
          .map((m) => m.round_short)
          .filter((r): r is string => r !== null),
      ),
    ];
    return rs.sort((a, b) => parseRoundNumber(b) - parseRoundNumber(a));
  }, [matches]);

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

      {/* ── Résultats ────────────────────────────────────────────────────────── */}
      {hubTab === "results" && (
        <>
          {/* Navigation par journée */}
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

              <span className="text-sm font-black tracking-wide text-white">
                {selectedRound ?? "—"}
              </span>

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
            <div className="py-10 text-center text-sm text-zinc-500">
              Chargement des résultats…
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
                  <MatchCard match={m} goalEvents={[]} mpgLayout hasLineups={m.has_lineups} />
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
