"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { MatchFilterBar } from "./MatchFilterBar";
import { CompetitionFilter } from "@/components/shared/CompetitionFilter";
import { usePreferredCompetitions } from "@/hooks/usePreferredCompetitions";
import {
  MatchPronoCard,
  parseExistingScore,
  parseExistingScorers,
  type MatchStub,
  type ExistingProno,
} from "./MatchPronoCard";

export type CompetitionStub = {
  id: string;
  name: string;
  badge_url: string | null;
  api_football_league_id: number | null;
};

/** Returns a stable day key (YYYY-MM-DD) in Paris timezone. */
function getDayKey(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("fr-CA", {
    timeZone: "Europe/Paris",
  });
}

/**
 * Agrège tous les pronos d'un match en un seul objet pour l'affichage.
 * Si au moins un prono est gagné → status "won" + somme des points gagnés.
 * Sinon → prono le plus significatif (exact_score en priorité).
 */
function compositeProno(
  pronos: ExistingProno[],
  matchId: string,
): ExistingProno | null {
  const mp = pronos.filter((p) => p.match_id === matchId);
  if (mp.length === 0) return null;
  const wonPronos = mp.filter((p) => p.status === "won");
  if (wonPronos.length > 0) {
    const totalPoints = wonPronos.reduce(
      (sum, p) => sum + (p.points_earned ?? 0),
      0,
    );
    return { ...wonPronos[0], points_earned: totalPoints };
  }
  return mp.find((p) => p.prono_type === "exact_score") ?? mp[0];
}

export function PronosticsHubClient({
  matches,
  existingPronos,
  competitions,
  preferredCompetitions = [],
}: {
  matches: MatchStub[];
  existingPronos: ExistingProno[];
  competitions: CompetitionStub[];
  preferredCompetitions?: string[];
}) {
  const t = useTranslations("Pronos");
  // Build prono lookup from server data
  const pronoByMatchId = new Map<
    string,
    {
      score: { home: string; away: string } | null;
      scorers: ReturnType<typeof parseExistingScorers>;
    }
  >();
  for (const p of existingPronos) {
    const entry = pronoByMatchId.get(p.match_id) ?? {
      score: null,
      scorers: null,
    };
    if (p.prono_type === "exact_score")
      entry.score = parseExistingScore(p.prono_value);
    else if (p.prono_type === "scorer_allocation")
      entry.scorers = parseExistingScorers(p.prono_value);
    pronoByMatchId.set(p.match_id, entry);
  }

  const competitionMap = new Map(competitions.map((c) => [c.id, c]));

  const { preferences: selectedCompIds, setPreferences: setSelectedCompIds } =
    usePreferredCompetitions(preferredCompetitions);

  type SectionKey = string; // `${dayKey}::${compId}`
  const dayOrder: string[] = [];
  const dayMap = new Map<string, Map<string, MatchStub[]>>();
  for (const m of matches) {
    const dayKey = getDayKey(m.start_time);
    const compId = m.competition_id ?? "__none__";
    if (!dayMap.has(dayKey)) {
      dayOrder.push(dayKey);
      dayMap.set(dayKey, new Map());
    }
    const compMap = dayMap.get(dayKey)!;
    if (!compMap.has(compId)) compMap.set(compId, []);
    compMap.get(compId)!.push(m);
  }
  // Always include today so user can orient themselves in time
  const todayKey = new Date().toISOString().slice(0, 10);
  if (!dayMap.has(todayKey)) {
    const todayDate = new Date(todayKey);
    const insertIdx = dayOrder.findIndex((dk) => new Date(dk) > todayDate);
    dayOrder.splice(
      insertIdx === -1 ? dayOrder.length : insertIdx,
      0,
      todayKey,
    );
    dayMap.set(todayKey, new Map());
  }

  const [selectedDay, setSelectedDay] = useState<string>(() => {
    return (
      dayOrder.find((dk) => {
        const cm = dayMap.get(dk)!;
        return Array.from(cm.values()).some((ms) =>
          ms.some(
            (m) =>
              m.status === "upcoming" &&
              pronoByMatchId.get(m.id)?.score == null,
          ),
        );
      }) ??
      dayOrder[0] ??
      ""
    );
  });

  const [expanded, setExpanded] = useState<Set<SectionKey>>(() => {
    const open = new Set<SectionKey>();
    for (const [dayKey, compMap] of dayMap) {
      for (const [compId, ms] of compMap) {
        const allDone = ms.every(
          (m) => pronoByMatchId.get(m.id)?.score != null,
        );
        if (!allDone) open.add(`${dayKey}::${compId}`);
      }
    }
    return open;
  });

  const [localSubmittedIds, setLocalSubmittedIds] = useState<Set<string>>(
    new Set(),
  );

  function isMatchDone(matchId: string): boolean {
    return (
      localSubmittedIds.has(matchId) ||
      pronoByMatchId.get(matchId)?.score != null
    );
  }

  function toggleSection(key: SectionKey) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const filterActive = selectedCompIds.length > 0;
  const filteredMatches = filterActive
    ? matches.filter(
        (m) =>
          m.competition_id != null &&
          selectedCompIds.includes(m.competition_id),
      )
    : matches;

  const total = filteredMatches.length;
  const submittedCount = filteredMatches.filter((m) =>
    isMatchDone(m.id),
  ).length;
  const pct = total > 0 ? (submittedCount / total) * 100 : 0;
  const [animatedPct, setAnimatedPct] = useState(0);
  useEffect(() => {
    setTimeout(() => setAnimatedPct(pct), 0);
  }, [pct]);

  const countsForSelectedDay = (() => {
    const map: Record<string, number> = {};
    if (!selectedDay) return map;
    for (const [dayKey, compMap] of dayMap) {
      if (dayKey !== selectedDay) continue;
      for (const [compId, ms] of compMap) {
        if (compId !== "__none__") map[compId] = ms.length;
      }
    }
    return map;
  })();

  if (matches.length === 0) {
    return (
      <div className="space-y-3 rounded-2xl border border-dashed border-zinc-700 px-4 py-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-2xl">
          🎯
        </div>
        <div>
          <p className="text-sm font-black text-white">
            {t("noMatchesWeekTitle")}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{t("noMatchesWeekDesc")}</p>
        </div>
      </div>
    );
  }

  const selectedCompMap = dayMap.get(selectedDay);

  return (
    <div className="flex flex-col gap-4">
      {/* Global progress bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-bold text-zinc-400">
            {submittedCount} pronostiqué{submittedCount !== 1 ? "s" : ""}
            <span className="mx-1.5 text-zinc-600">·</span>
            <span className="text-zinc-500">
              {total - submittedCount} restant
              {total - submittedCount !== 1 ? "s" : ""}
            </span>
          </span>
          {submittedCount === total && (
            <span className="font-black text-green-400">
              {t("progressComplete")}
            </span>
          )}
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${
              pct > 50 ? "bg-yellow-400" : "bg-zinc-600"
            }`}
            style={{ width: `${animatedPct}%` }}
          />
        </div>
      </div>

      <MatchFilterBar
        dayOrder={dayOrder}
        dayMap={dayMap}
        selectedDay={selectedDay}
        onSelectedDayChange={setSelectedDay}
        isMatchDone={isMatchDone}
      />

      {competitions.length > 1 && (
        <CompetitionFilter
          competitions={competitions}
          selectedIds={selectedCompIds}
          onChange={setSelectedCompIds}
          showCounts={countsForSelectedDay}
        />
      )}

      {!selectedCompMap && (
        <div className="rounded-2xl border border-dashed border-zinc-700 px-4 py-10 text-center">
          <p className="mb-2 text-2xl">📅</p>
          <p className="text-sm font-black text-white">
            {t("noMatchesDayTitle")}
          </p>
          <p className="mt-1 text-xs text-zinc-500">{t("noMatchesDayDesc")}</p>
        </div>
      )}
      {selectedCompMap && total === 0 && filterActive && (
        <div className="space-y-3 rounded-2xl border border-dashed border-zinc-700 px-4 py-10 text-center">
          <p className="text-2xl">🔍</p>
          <p className="text-sm font-black text-white">
            {t("noMatchesFilterTitle")}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {t("noMatchesFilterDesc")}
          </p>
          <button
            type="button"
            onClick={() => setSelectedCompIds([])}
            className="mt-2 rounded-full border border-white/10 bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-300 transition hover:text-white"
          >
            {t("showAllMatches")}
          </button>
        </div>
      )}
      {selectedCompMap && (
        <div className="flex flex-col gap-2">
          {Array.from(selectedCompMap.entries())
            .filter(([compId]) =>
              filterActive ? selectedCompIds.includes(compId) : true,
            )
            .map(([compId, groupMatches]) => {
              const comp =
                compId !== "__none__" ? competitionMap.get(compId) : null;
              const sectionKey: SectionKey = `${selectedDay}::${compId}`;
              const isOpen = expanded.has(sectionKey);
              const sectionDone = groupMatches.filter((m) =>
                isMatchDone(m.id),
              ).length;
              const sectionTotal = groupMatches.length;
              const allDone = sectionDone === sectionTotal;
              const roundShort =
                groupMatches.find((m) => m.round_short)?.round_short ?? null;
              const lobbyHref =
                comp?.api_football_league_id && roundShort
                  ? `/lobby?league=${comp.api_football_league_id}&round=${encodeURIComponent(roundShort)}`
                  : null;

              return (
                <div
                  key={sectionKey}
                  className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/40"
                >
                  <div className="flex w-full items-center gap-2.5 px-4 py-3">
                    {lobbyHref ? (
                      <Link
                        href={lobbyHref}
                        className="flex min-w-0 items-center gap-2.5 transition active:opacity-70"
                      >
                        {comp?.badge_url?.startsWith("http") ? (
                          <Image
                            src={comp.badge_url}
                            alt={comp.name}
                            width={20}
                            height={20}
                            className="h-5 w-5 shrink-0 object-contain"
                          />
                        ) : (
                          <span className="shrink-0 text-sm">🏆</span>
                        )}
                        <span className="text-[12px] font-black uppercase tracking-wide text-zinc-300 underline-offset-2 hover:underline">
                          {comp?.name ?? t("competitionFallback")}
                        </span>
                      </Link>
                    ) : (
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="shrink-0 text-sm">🏆</span>
                        <span className="text-[12px] font-black uppercase tracking-wide text-zinc-300">
                          {comp?.name ?? t("competitionFallback")}
                        </span>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleSection(sectionKey)}
                      className="ml-auto flex flex-1 items-center justify-end gap-1.5 py-1 pl-2 transition active:opacity-70"
                    >
                      <span
                        className={`text-[11px] font-bold tabular-nums ${
                          allDone ? "text-green-400" : "text-zinc-500"
                        }`}
                      >
                        {sectionDone}/{sectionTotal}
                      </span>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-zinc-500" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-zinc-500" />
                      )}
                    </button>
                  </div>

                  {isOpen && (
                    <div className="flex flex-col gap-2 border-t border-white/5 px-3 pb-3 pt-2">
                      {groupMatches.map((m) => {
                        const p = pronoByMatchId.get(m.id);
                        return (
                          <MatchPronoCard
                            key={m.id}
                            match={m}
                            existingProno={compositeProno(existingPronos, m.id)}
                            existingScore={p?.score ?? null}
                            existingScorers={p?.scorers ?? null}
                            onSubmittedChange={(submitted) => {
                              setLocalSubmittedIds((prev) => {
                                const next = new Set(prev);
                                if (submitted) next.add(m.id);
                                else next.delete(m.id);
                                return next;
                              });
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
