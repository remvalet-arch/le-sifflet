"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Bell,
  Check,
  ChevronDown,
  ChevronRight,
  Target,
  Minus,
  Share2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { trySubscribePush, isPushSubscribed } from "@/components/pwa/PushOptIn";
import { convertOddToPoints } from "@/lib/odds";
import {
  ScorerAllocationEditor,
  aggregateSlots,
} from "./ScorerAllocationEditor";
import { MatchFilterBar } from "./MatchFilterBar";
import { CompetitionFilter } from "@/components/shared/CompetitionFilter";
import { usePreferredCompetitions } from "@/hooks/usePreferredCompetitions";

type MatchStub = {
  id: string;
  team_home: string;
  team_away: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_logo: string | null;
  away_team_logo: string | null;
  start_time: string;
  competition_id: string | null;
  round_short: string | null;
  status: string;
  home_score?: number | null;
  away_score?: number | null;
  odds_home?: number | null;
  odds_draw?: number | null;
  odds_away?: number | null;
  community_stats?: {
    total_pronos: number;
    community_1_pct: number;
    community_N_pct: number;
    community_2_pct: number;
    home_form: string | null;
    away_form: string | null;
  } | null;
};

export type CompetitionStub = {
  id: string;
  name: string;
  badge_url: string | null;
  api_football_league_id: number | null;
};

type ExistingProno = {
  match_id: string;
  prono_type: string;
  prono_value: string;
  points_earned?: number | null;
  reward_amount?: number | null;
  status?: string | null;
};

type ScorerEntry = { name: string; goals: number };
type ScorersAlloc = { home: ScorerEntry[]; away: ScorerEntry[] };

function parseExistingScore(
  value: string,
): { home: string; away: string } | null {
  const m = /^(\d+)-(\d+)$/.exec(value);
  if (!m) return null;
  return { home: m[1]!, away: m[2]! };
}

function parseExistingScorers(value: string): ScorersAlloc | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "home" in parsed &&
      "away" in parsed
    )
      return parsed as ScorersAlloc;
  } catch {
    // ignore
  }
  return null;
}

function TeamFormPills({ form }: { form: ("W" | "D" | "L" | "unknown")[] }) {
  // Pad with unknown if less than 5
  const paddedForm = [...form];
  while (paddedForm.length < 5) paddedForm.push("unknown");

  return (
    <div className="flex gap-1">
      {paddedForm.slice(0, 5).map((res, i) => {
        if (res === "W") {
          return (
            <div
              key={i}
              className="flex h-3 w-3 items-center justify-center rounded-full bg-green-500"
            >
              <Check className="h-2 w-2 text-white" strokeWidth={4} />
            </div>
          );
        }
        if (res === "L") {
          return (
            <div
              key={i}
              className="flex h-3 w-3 items-center justify-center rounded-full bg-red-500"
            >
              <X className="h-2 w-2 text-white" strokeWidth={4} />
            </div>
          );
        }
        if (res === "D") {
          return (
            <div
              key={i}
              className="flex h-3 w-3 items-center justify-center rounded-full bg-zinc-500"
            >
              <Minus className="h-2 w-2 text-white" strokeWidth={4} />
            </div>
          );
        }
        return (
          <div
            key={i}
            className="flex h-3 w-3 items-center justify-center rounded-full bg-zinc-800 border border-white/10"
          />
        );
      })}
    </div>
  );
}

function parseFormString(
  form: string | null | undefined,
): ("W" | "D" | "L" | "unknown")[] {
  if (!form) return ["unknown", "unknown", "unknown", "unknown", "unknown"];
  // Sometimes API-Football form is oldest first, sometimes newest.
  // Generally it's oldest -> newest. We'll just map 'W', 'D', 'L'.
  const chars = form
    .toUpperCase()
    .replace(/[^WDL]/g, "")
    .split("")
    .reverse(); // Reverse so most recent is first, or keep as is? MPG shows oldest to newest left to right. Let's just map it.
  const mapped: ("W" | "D" | "L" | "unknown")[] = chars
    .map((c) => c as "W" | "D" | "L")
    .reverse();
  return mapped;
}

function TeamLogo({ logo, name }: { logo: string | null; name: string }) {
  if (logo?.startsWith("http")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt={name}
        className="h-10 w-10 object-contain drop-shadow-md"
      />
    );
  }
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-zinc-800 text-sm">
      ⚽
    </span>
  );
}

function ScoreInput({
  value,
  onChange,
  inputRef,
  onFilled,
  disabled,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onFilled?: () => void;
  disabled?: boolean;
  "aria-label": string;
}) {
  return (
    <input
      ref={inputRef}
      type="tel"
      inputMode="numeric"
      maxLength={2}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "").slice(0, 2);
        onChange(v);
        if (v.length >= 1) onFilled?.();
      }}
      className="h-14 w-12 rounded-[10px] border border-white/10 bg-[#2D2D2D] text-center text-xl font-black text-white outline-none ring-0 transition focus:border-amber-500/50 focus:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-zinc-600"
      style={{ fontSize: "16px" }}
      placeholder="?"
    />
  );
}

function MatchPronoCard({
  match,
  existingProno,
  existingScore,
  existingScorers,
  onSubmittedChange,
}: {
  match: MatchStub;
  existingProno: ExistingProno | null;
  existingScore: { home: string; away: string } | null;
  existingScorers: ScorersAlloc | null;
  onSubmittedChange: (submitted: boolean) => void;
}) {
  const [homeScore, setHomeScore] = useState(existingScore?.home ?? "");
  const [awayScore, setAwayScore] = useState(existingScore?.away ?? "");
  const [submitted, setSubmitted] = useState(existingScore != null);
  const [loading, setLoading] = useState(false);

  const homeInt = parseInt(homeScore, 10);
  const awayInt = parseInt(awayScore, 10);
  const homeCount = !isNaN(homeInt) && homeScore !== "" ? homeInt : 0;
  const awayCount = !isNaN(awayInt) && awayScore !== "" ? awayInt : 0;

  const [homeSlots, setHomeSlots] = useState<string[]>([]);
  const [awaySlots, setAwaySlots] = useState<string[]>([]);

  const [nowMs] = useState(() => Date.now());
  const LOCK_BEFORE_MS = 45 * 60 * 1000;
  const isLocked =
    match.status !== "upcoming" ||
    new Date(match.start_time).getTime() - nowMs < LOCK_BEFORE_MS;
  const awayRef = useRef<HTMLInputElement | null>(null);

  const scoresValid =
    homeScore !== "" && awayScore !== "" && !isNaN(homeInt) && !isNaN(awayInt);

  const scorersFilled =
    homeSlots.some((s) => s !== "") || awaySlots.some((s) => s !== "");
  const scorersComplete =
    !scorersFilled ||
    (homeSlots.every((s) => s !== "") && awaySlots.every((s) => s !== ""));
  const canSubmit = scoresValid && scorersComplete;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const homeAgg = aggregateSlots(homeSlots);
      const awayAgg = aggregateSlots(awaySlots);
      const scorersObj =
        homeAgg.length > 0 || awayAgg.length > 0
          ? { home: homeAgg, away: awayAgg }
          : null;

      const { error } = await supabase.rpc("place_match_prono", {
        p_match_id: match.id,
        p_home_score: homeInt,
        p_away_score: awayInt,
        p_scorers_json: scorersObj,
        p_booster_id: null,
      });

      if (error) {
        toast.error(
          error.message.includes("plus disponible")
            ? "Ce match a déjà commencé, trop tard !"
            : `Prono refusé: ${error.message}`,
        );
        return;
      }

      setSubmitted(true);
      onSubmittedChange(true);
      toast.success(
        <span className="flex items-center gap-1.5">
          <Bell className="h-4 w-4 text-whistle" />
          Prono enregistré !
        </span>,
      );

      void isPushSubscribed().then((already) => {
        if (already) return;
        setTimeout(() => {
          toast("🔔 Reçois une alerte au coup d'envoi ?", {
            description: "Active les notifications pour ne rien rater.",
            action: {
              label: "Activer",
              onClick: () => void trySubscribePush(),
            },
            duration: 10000,
          });
        }, 1200);
      });
    } catch {
      toast.error("Connexion perdue, réessaie !");
    } finally {
      setLoading(false);
    }
  }, [
    canSubmit,
    match.id,
    homeInt,
    awayInt,
    homeSlots,
    awaySlots,
    onSubmittedChange,
  ]);

  const kickoff = new Date(match.start_time);
  const relativeTime = (() => {
    const now = new Date();
    const isToday = kickoff.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = kickoff.toDateString() === tomorrow.toDateString();
    const timeStr = kickoff.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (isToday) return `Auj. · ${timeStr}`;
    if (isTomorrow) return `Demain · ${timeStr}`;
    return (
      kickoff.toLocaleDateString("fr-FR", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }) + ` · ${timeStr}`
    );
  })();

  const homeAgg = aggregateSlots(homeSlots);
  const awayAgg = aggregateSlots(awaySlots);
  const hasScorers = homeAgg.length > 0 || awayAgg.length > 0;

  // Finished match result card
  if (match.status === "finished") {
    const hasScore = match.home_score != null && match.away_score != null;
    const isWon = existingProno?.status === "won";
    const isLost = existingProno?.status === "lost";
    const pointsEarned =
      (existingProno?.points_earned ?? 0) > 0
        ? existingProno!.points_earned!
        : (existingProno?.reward_amount ?? 0);
    const hasProno = existingScore != null;

    return (
      <div
        className={`rounded-2xl border px-4 py-4 ${
          isWon
            ? "border-green-500/30 bg-green-500/5 shadow-[0_0_12px_rgba(34,197,94,0.08)]"
            : isLost
              ? "border-red-500/20 bg-zinc-900/50"
              : "border-zinc-700/30 bg-zinc-900/40"
        }`}
      >
        {/* Round label */}
        <div className="mb-3 flex items-center gap-2 overflow-hidden">
          {match.round_short && (
            <span className="min-w-0 truncate text-[10px] font-black uppercase tracking-widest text-zinc-500">
              {match.round_short}
            </span>
          )}
          <span className="ml-auto shrink-0 text-[10px] font-black uppercase tracking-widest text-zinc-500">
            FT
          </span>
        </div>

        {/* Teams + score */}
        <div className="flex items-center gap-2">
          {/* Home team */}
          <div className="flex flex-1 flex-col items-center text-center">
            <TeamLogo logo={match.home_team_logo} name={match.team_home} />
            <span className="mt-1.5 line-clamp-1 text-xs font-bold text-zinc-300">
              {match.team_home}
            </span>
          </div>

          {/* Score block */}
          <div className="flex shrink-0 flex-col items-center gap-1.5 px-2">
            {hasScore ? (
              <div className="flex items-center gap-2">
                <span className="text-3xl font-black tabular-nums text-white">
                  {match.home_score}
                </span>
                <span className="text-xl font-black text-zinc-600">-</span>
                <span className="text-3xl font-black tabular-nums text-white">
                  {match.away_score}
                </span>
              </div>
            ) : (
              <span className="text-lg font-bold text-zinc-500">? - ?</span>
            )}

            {hasProno && (
              <p className="text-[11px] text-zinc-500">
                Prono : {existingScore!.home}-{existingScore!.away}
              </p>
            )}

            {isWon && pointsEarned > 0 ? (
              <span className="rounded-full border border-green-500/30 bg-green-500/15 px-3 py-0.5 text-[11px] font-black text-green-400">
                +{pointsEarned.toLocaleString("fr-FR")} Points
              </span>
            ) : isLost ? (
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-0.5 text-[11px] font-bold text-zinc-500">
                Perdu
              </span>
            ) : !hasProno ? (
              <span className="rounded-full border border-zinc-700/50 bg-zinc-800/60 px-3 py-0.5 text-[11px] font-bold text-zinc-600">
                Pas de prono
              </span>
            ) : null}
          </div>

          {/* Away team */}
          <div className="flex flex-1 flex-col items-center text-center">
            <TeamLogo logo={match.away_team_logo} name={match.team_away} />
            <span className="mt-1.5 line-clamp-1 text-xs font-bold text-zinc-300">
              {match.team_away}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Compact submitted card
  if (submitted) {
    const fmtScorer = (e: { name: string; goals: number }) => {
      const label = e.name === "CSC" ? "🔙 CSC" : e.name;
      return e.goals > 1 ? `${label} (×${e.goals})` : label;
    };
    const scorerText = [
      homeAgg.map(fmtScorer).join(", "),
      awayAgg.map(fmtScorer).join(", "),
    ]
      .filter(Boolean)
      .join(" / ");

    return (
      <div
        className={`flex flex-col gap-0.5 rounded-2xl border ${existingProno?.status === "won" ? "border-green-500/50 bg-green-500/5 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : existingProno?.status === "lost" ? "border-red-500/20 bg-red-500/5" : "border-green-500/20 bg-zinc-900/50"} px-4 py-3 relative overflow-hidden`}
      >
        {existingProno?.status && (
          <div className="absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-black/20 to-transparent pointer-events-none" />
        )}
        <div className="flex items-center gap-2 relative z-10 overflow-hidden">
          <Check
            className={`h-4 w-4 shrink-0 ${existingProno?.status === "lost" ? "text-red-400" : "text-green-400"}`}
          />
          <span className="min-w-0 flex-1 flex items-center gap-1.5 text-sm font-bold text-white overflow-hidden">
            <span className="truncate">{match.team_home}</span>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-800 text-[10px] font-black text-amber-400 shadow-inner">
              {homeScore}
            </div>
            <span className="shrink-0 text-zinc-600 font-bold">-</span>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-800 text-[10px] font-black text-amber-400 shadow-inner">
              {awayScore}
            </div>
            <span className="truncate">{match.team_away}</span>
          </span>
          {!isLocked && (
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                onSubmittedChange(false);
              }}
              className="shrink-0 text-[11px] font-bold text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
            >
              Modifier
            </button>
          )}
        </div>
        {hasScorers && (
          <p className="ml-6 text-[11px] text-zinc-500 relative z-10">
            {scorerText}
          </p>
        )}
        <div className="ml-6 flex items-center justify-between mt-1 relative z-10">
          <p className="text-[11px] capitalize text-zinc-600">{relativeTime}</p>
          <div className="flex items-center gap-3">
            {existingProno?.status === "won" && (
              <span className="text-[11px] font-black text-green-400">
                +
                {(existingProno.points_earned! > 0
                  ? existingProno.points_earned!
                  : existingProno.reward_amount!
                ).toLocaleString("fr-FR")}{" "}
                Points
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                const text = `J'ai prédit ${match.team_home} ${homeScore}-${awayScore} ${match.team_away} sur VAR TIME — et toi ?`;
                const url =
                  typeof window !== "undefined" ? window.location.href : "";
                if (typeof navigator !== "undefined" && navigator.share) {
                  void navigator.share({ text, url });
                } else {
                  void navigator.clipboard.writeText(`${text} ${url}`);
                  toast.success("Prono copié !");
                }
              }}
              className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 hover:text-zinc-300 transition"
              aria-label="Partager mon prono"
            >
              <Share2 className="h-3 w-3" />
              Partager
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`overflow-hidden rounded-2xl border bg-zinc-900/60 px-4 pb-5 pt-4 ${
          isLocked ? "border-zinc-700/30" : "border-white/8"
        }`}
      >
        {/* Match header */}
        <div className="mb-3 flex items-center gap-2 overflow-hidden">
          {match.round_short && (
            <span className="min-w-0 truncate text-[10px] font-black uppercase tracking-widest text-zinc-500">
              {match.round_short}
            </span>
          )}
          <span className="ml-auto shrink-0 text-[10px] capitalize text-zinc-500">
            {relativeTime}
          </span>
        </div>

        {/* Teams + score inputs */}
        <div className="flex items-start justify-between mt-2 mb-2">
          {/* Left Team */}
          <div className="flex min-w-0 flex-1 flex-col items-center overflow-hidden text-center">
            <TeamLogo logo={match.home_team_logo} name={match.team_home} />
            <span className="mt-2 line-clamp-1 w-full text-xs font-bold leading-tight text-white">
              {match.team_home}
            </span>
            <div className="mt-1.5 max-w-full overflow-hidden">
              <TeamFormPills
                form={parseFormString(match.community_stats?.home_form)}
              />
              <p className="mt-0.5 text-[8px] uppercase tracking-widest text-zinc-600">
                5 derniers
              </p>
            </div>
          </div>

          {/* Center Block */}
          <div className="flex flex-col items-center mx-2 shrink-0">
            {/* Inputs */}
            <div className="flex items-center gap-2.5 mb-2.5">
              <ScoreInput
                value={homeScore}
                onChange={(val) => {
                  if (!isLocked) setHomeScore(val);
                }}
                onFilled={() => {
                  if (!isLocked) awayRef.current?.focus();
                }}
                disabled={isLocked}
                aria-label={`Buts ${match.team_home}`}
              />
              <ScoreInput
                value={awayScore}
                onChange={(val) => {
                  if (!isLocked) setAwayScore(val);
                }}
                inputRef={awayRef}
                disabled={isLocked}
                aria-label={`Buts ${match.team_away}`}
              />
            </div>

            {/* Odds Pills (1, N, 2) */}
            {(() => {
              const pts1 = match.odds_home
                ? convertOddToPoints(match.odds_home, 220)
                : 50;
              const ptsN = match.odds_draw
                ? convertOddToPoints(match.odds_draw, 220)
                : 50;
              const pts2 = match.odds_away
                ? convertOddToPoints(match.odds_away, 220)
                : 50;

              const is1 = scoresValid && homeInt > awayInt;
              const isN = scoresValid && homeInt === awayInt;
              const is2 = scoresValid && homeInt < awayInt;

              return (
                <>
                  <div className="flex items-center justify-center gap-1.5">
                    <div
                      className={`flex flex-col items-center justify-center rounded-[6px] px-1.5 py-1 min-w-[2rem] transition-all ${is1 ? "bg-zinc-900 border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.1)]" : "bg-zinc-800/80 border border-white/5"}`}
                    >
                      <span
                        className={`text-[11px] font-black tabular-nums ${is1 ? "text-amber-400" : "text-zinc-400"}`}
                      >
                        {pts1}
                      </span>
                      <span className="text-[8px] text-zinc-600 leading-none">
                        pts si ✓
                      </span>
                    </div>
                    <div
                      className={`flex flex-col items-center justify-center rounded-[6px] px-1.5 py-1 min-w-[2rem] transition-all ${isN ? "bg-zinc-900 border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.1)]" : "bg-zinc-800/80 border border-white/5"}`}
                    >
                      <span
                        className={`text-[11px] font-black tabular-nums ${isN ? "text-amber-400" : "text-zinc-400"}`}
                      >
                        {ptsN}
                      </span>
                      <span className="text-[8px] text-zinc-600 leading-none">
                        pts si ✓
                      </span>
                    </div>
                    <div
                      className={`flex flex-col items-center justify-center rounded-[6px] px-1.5 py-1 min-w-[2rem] transition-all ${is2 ? "bg-zinc-900 border border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.1)]" : "bg-zinc-800/80 border border-white/5"}`}
                    >
                      <span
                        className={`text-[11px] font-black tabular-nums ${is2 ? "text-amber-400" : "text-zinc-400"}`}
                      >
                        {pts2}
                      </span>
                      <span className="text-[8px] text-zinc-600 leading-none">
                        pts si ✓
                      </span>
                    </div>
                  </div>

                  {/* Community Percentages */}
                  {(match.community_stats?.total_pronos ?? 0) >= 10 ? (
                    <div className="flex items-center justify-center gap-1.5 mt-1 opacity-75">
                      <div className="min-w-[2rem] text-center">
                        <span className="text-[10px] font-medium text-zinc-500">
                          {match.community_stats?.community_1_pct ?? 0}%
                        </span>
                      </div>
                      <div className="min-w-[2rem] text-center">
                        <span className="text-[10px] font-medium text-zinc-500">
                          {match.community_stats?.community_N_pct ?? 0}%
                        </span>
                      </div>
                      <div className="min-w-[2rem] text-center">
                        <span className="text-[10px] font-medium text-zinc-500">
                          {match.community_stats?.community_2_pct ?? 0}%
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-center text-[10px] font-black text-amber-400">
                      ⚡ Sois le premier à pronostiquer
                    </p>
                  )}
                </>
              );
            })()}
          </div>

          {/* Right Team */}
          <div className="flex min-w-0 flex-1 flex-col items-center overflow-hidden text-center">
            <TeamLogo logo={match.away_team_logo} name={match.team_away} />
            <span className="mt-2 line-clamp-1 w-full text-xs font-bold leading-tight text-white">
              {match.team_away}
            </span>
            <div className="mt-1.5 max-w-full overflow-hidden">
              <TeamFormPills
                form={parseFormString(match.community_stats?.away_form)}
              />
              <p className="mt-0.5 text-[8px] uppercase tracking-widest text-zinc-600">
                5 derniers
              </p>
            </div>
          </div>
        </div>

        {scoresValid && (
          <ScorerAllocationEditor
            matchId={match.id}
            homeTeamId={match.home_team_id}
            awayTeamId={match.away_team_id}
            homeTeam={match.team_home}
            awayTeam={match.team_away}
            homeCount={homeCount}
            awayCount={awayCount}
            isLocked={isLocked}
            submitted={submitted}
            initialScorers={existingScorers}
            onSlotsChange={(hs, as) => {
              setHomeSlots(hs);
              setAwaySlots(as);
            }}
          />
        )}

        {/* Submit / locked */}
        {match.status === "first_half" ||
        match.status === "second_half" ||
        match.status === "half_time" ||
        match.status === "paused" ? (
          <a
            href={`/match/${match.id}`}
            className="mt-4 flex w-full animate-pulse items-center justify-center gap-2 rounded-xl bg-red-600 py-4 text-sm font-black uppercase tracking-wide text-white shadow-[0_0_20px_rgba(220,38,38,0.5)] transition hover:bg-red-500 active:scale-[0.98]"
          >
            <span className="h-2 w-2 rounded-full bg-white" />
            REJOINDRE LE STADE
          </a>
        ) : isLocked ? (
          <div className="mt-4 flex w-full items-center justify-center rounded-xl bg-zinc-800/50 py-3 text-sm font-black uppercase tracking-wide text-zinc-500">
            Le match a commencé, pronos fermés 🔒
          </div>
        ) : scoresValid ? (
          <button
            type="button"
            disabled={!canSubmit || loading}
            onClick={handleSubmit}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-whistle py-3 text-sm font-black uppercase tracking-wide text-pitch-900 transition hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
          >
            {loading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-pitch-900/40 border-t-pitch-900" />
            ) : (
              <>
                <Target className="h-4 w-4" />
                Valider mon prono
              </>
            )}
          </button>
        ) : null}
      </div>
    </>
  );
}

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
  // Build prono lookup from server data
  const pronoByMatchId = new Map<
    string,
    {
      score: { home: string; away: string } | null;
      scorers: ScorersAlloc | null;
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

  // Build day → competition → matches hierarchy (derived from props, stable order)
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
  // UX8-4: always include today so user can orient themselves in time
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

  // Selected day: first day with an upcoming match missing a prono, else first day
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

  // Accordion open/close state: open sections with pending pronos by default
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

  // Competition filter: empty selectedCompIds = "all"
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

  // Counts per competition for the selected day (for CompetitionFilter badges)
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
      <div className="rounded-2xl border border-dashed border-zinc-700 px-4 py-12 text-center space-y-3">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-2xl">
          🎯
        </div>
        <div>
          <p className="text-sm font-black text-white">
            Aucun match cette semaine
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Les pronos apparaîtront ici dès que des matchs sont programmés.
          </p>
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
            {submittedCount}/{total} matchs pronostiqués
          </span>
          {submittedCount === total && (
            <span className="font-black text-green-400">Complet ✓</span>
          )}
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-whistle transition-all duration-500"
            style={{
              width: `${total > 0 ? (submittedCount / total) * 100 : 0}%`,
            }}
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

      {/* Competition accordions for selected day */}
      {!selectedCompMap && (
        <div className="rounded-2xl border border-dashed border-zinc-700 px-4 py-10 text-center">
          <p className="text-2xl mb-2">📅</p>
          <p className="text-sm font-black text-white">
            Pas de matchs ce jour-là
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Essaie un autre jour ou reviens plus tard.
          </p>
        </div>
      )}
      {selectedCompMap && total === 0 && filterActive && (
        <div className="rounded-2xl border border-dashed border-zinc-700 px-4 py-10 text-center space-y-3">
          <p className="text-2xl">🔍</p>
          <p className="text-sm font-black text-white">
            Aucun match pour tes ligues ce jour-là
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Essaie une autre date ou élargis tes ligues.
          </p>
          <button
            type="button"
            onClick={() => setSelectedCompIds([])}
            className="mt-2 rounded-full border border-white/10 bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-300 hover:text-white transition"
          >
            Voir tous les matchs
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
                  {/* Accordion header */}
                  <div className="flex w-full items-center gap-2.5 px-4 py-3">
                    {/* Logo + nom → lien vers classement lobby */}
                    {lobbyHref ? (
                      <Link
                        href={lobbyHref}
                        className="flex min-w-0 flex-1 items-center gap-2.5 transition active:opacity-70"
                      >
                        {comp?.badge_url?.startsWith("http") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={comp.badge_url}
                            alt={comp.name}
                            className="h-5 w-5 shrink-0 object-contain"
                          />
                        ) : (
                          <span className="shrink-0 text-sm">🏆</span>
                        )}
                        <span className="text-[12px] font-black uppercase tracking-wide text-zinc-300 underline-offset-2 hover:underline">
                          {comp?.name ?? "Autre"}
                        </span>
                      </Link>
                    ) : (
                      <div className="flex min-w-0 flex-1 items-center gap-2.5">
                        <span className="shrink-0 text-sm">🏆</span>
                        <span className="text-[12px] font-black uppercase tracking-wide text-zinc-300">
                          {comp?.name ?? "Autre"}
                        </span>
                      </div>
                    )}
                    {/* Compteur + chevron toggle */}
                    <button
                      type="button"
                      onClick={() => toggleSection(sectionKey)}
                      className="flex shrink-0 items-center gap-1.5 py-1 pl-2 transition active:opacity-70"
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

                  {/* Accordion body */}
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
