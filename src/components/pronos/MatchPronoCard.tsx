"use client";

import { useState, useRef, useCallback } from "react";
import { Bell, Check, Minus, Share2, Target, X } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { trySubscribePush, isPushSubscribed } from "@/components/pwa/PushOptIn";
import { convertOddToPoints } from "@/lib/odds";
import { trackPronoPlaced } from "@/lib/analytics";
import { classifyMatchTier } from "@/lib/matchTier";
import {
  ScorerAllocationEditor,
  aggregateSlots,
} from "./ScorerAllocationEditor";
import { BoosterPickerForPronos } from "./BoosterPickerForPronos";

const BCP47_LOCALE: Record<string, string> = {
  fr: "fr-FR",
  en: "en-GB",
  es: "es-ES",
  de: "de-DE",
  it: "it-IT",
};

export type MatchStub = {
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

export type ExistingProno = {
  match_id: string;
  prono_type: string;
  prono_value: string;
  points_earned?: number | null;
  reward_amount?: number | null;
  status?: string | null;
};

type ScorerEntry = { name: string; goals: number };
type ScorersAlloc = { home: ScorerEntry[]; away: ScorerEntry[] };

export function parseExistingScore(
  value: string,
): { home: string; away: string } | null {
  const m = /^(\d+)-(\d+)$/.exec(value);
  if (!m) return null;
  return { home: m[1]!, away: m[2]! };
}

export function parseExistingScorers(value: string): ScorersAlloc | null {
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
  const paddedForm = [...form];
  while (paddedForm.length < 5) paddedForm.push("unknown");

  return (
    <div className="flex gap-1">
      {paddedForm.slice(0, 5).map((res, i) => {
        if (res === "W") {
          return (
            <div
              key={i}
              className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-green-500"
            >
              <Check className="h-1.5 w-1.5 text-white" strokeWidth={4} />
            </div>
          );
        }
        if (res === "L") {
          return (
            <div
              key={i}
              className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-500"
            >
              <X className="h-1.5 w-1.5 text-white" strokeWidth={4} />
            </div>
          );
        }
        if (res === "D") {
          return (
            <div
              key={i}
              className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-zinc-500"
            >
              <Minus className="h-1.5 w-1.5 text-white" strokeWidth={4} />
            </div>
          );
        }
        return (
          <div
            key={i}
            className="flex h-2.5 w-2.5 items-center justify-center rounded-full border border-white/10 bg-zinc-800"
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
  const chars = form
    .toUpperCase()
    .replace(/[^WDL]/g, "")
    .split("")
    .reverse();
  const mapped: ("W" | "D" | "L" | "unknown")[] = chars
    .map((c) => c as "W" | "D" | "L")
    .reverse();
  return mapped;
}

function TeamLogo({ logo, name }: { logo: string | null; name: string }) {
  if (logo?.startsWith("http")) {
    return (
      <Image
        src={logo}
        alt={name}
        width={40}
        height={40}
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

export function MatchPronoCard({
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
  const t = useTranslations("Pronos");
  const locale = useLocale();
  const bcp47 = BCP47_LOCALE[locale] ?? "fr-FR";

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
  const [selectedBoosterId, setSelectedBoosterId] = useState<string | null>(
    null,
  );

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
        p_booster_id: selectedBoosterId,
      });

      if (error) {
        toast.error(
          error.message.includes("plus disponible")
            ? t("pronoTooLate")
            : `Prono refusé: ${error.message}`,
        );
        return;
      }

      setSubmitted(true);
      onSubmittedChange(true);
      trackPronoPlaced({
        match_id: match.id,
        match_tier: classifyMatchTier({
          team_home: match.team_home,
          team_away: match.team_away,
          competition_id: match.competition_id ?? "",
        }),
        prono_type:
          homeAgg.length > 0 || awayAgg.length > 0
            ? "scorer_allocation"
            : "exact_score",
        booster_applied: null,
        is_first_prono_of_session: !submitted,
      });
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
            description: t("enableNotifDesc"),
            action: {
              label: t("enableNotif"),
              onClick: () => void trySubscribePush(),
            },
            duration: 10000,
          });
        }, 1200);
      });
    } catch {
      toast.error(t("connectionLost"));
    } finally {
      setLoading(false);
    }
  }, [
    canSubmit,
    match.id,
    match.team_home,
    match.team_away,
    match.competition_id,
    homeInt,
    awayInt,
    homeSlots,
    awaySlots,
    selectedBoosterId,
    submitted,
    onSubmittedChange,
    t,
  ]);

  const kickoff = new Date(match.start_time);
  const relativeTime = (() => {
    const now = new Date();
    const isToday = kickoff.toDateString() === now.toDateString();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = kickoff.toDateString() === tomorrow.toDateString();
    const timeStr = kickoff.toLocaleTimeString(bcp47, {
      hour: "2-digit",
      minute: "2-digit",
    });
    if (isToday) return timeStr;
    const weekday = kickoff
      .toLocaleDateString(bcp47, { weekday: "short" })
      .replace(/\.$/, "");
    const day = weekday.charAt(0).toUpperCase() + weekday.slice(1);
    if (isTomorrow) return `Dem. ${timeStr}`;
    return `${day}. ${timeStr}`;
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

        <div className="flex items-center gap-2">
          <div className="flex flex-1 flex-col items-center text-center">
            <TeamLogo logo={match.home_team_logo} name={match.team_home} />
            <span className="mt-1.5 line-clamp-1 text-xs font-bold text-zinc-300">
              {match.team_home}
            </span>
          </div>

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
                +{pointsEarned.toLocaleString(bcp47)} Points
              </span>
            ) : isLost ? (
              <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-0.5 text-[11px] font-bold text-zinc-500">
                Perdu
              </span>
            ) : !hasProno ? (
              <span className="rounded-full border border-zinc-700/50 bg-zinc-800/60 px-3 py-0.5 text-[11px] font-bold text-zinc-600">
                {t("noProno")}
              </span>
            ) : null}
          </div>

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
        className={`relative flex flex-col gap-0.5 overflow-hidden rounded-2xl border px-4 py-3 ${existingProno?.status === "won" ? "border-green-500/50 bg-green-500/5 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : existingProno?.status === "lost" ? "border-red-500/20 bg-red-500/5" : "border-green-500/20 bg-zinc-900/50"}`}
      >
        {existingProno?.status && (
          <div className="pointer-events-none absolute right-0 top-0 h-full w-24 bg-gradient-to-l from-black/20 to-transparent" />
        )}
        <div className="relative z-10 flex items-center gap-2 overflow-hidden">
          <Check
            className={`h-4 w-4 shrink-0 ${existingProno?.status === "lost" ? "text-red-400" : "text-green-400"}`}
          />
          <span className="flex min-w-0 flex-1 items-center gap-1.5 overflow-hidden text-sm font-bold text-white">
            <span className="truncate">{match.team_home}</span>
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-zinc-800 text-[10px] font-black text-amber-400 shadow-inner">
              {homeScore}
            </div>
            <span className="shrink-0 font-bold text-zinc-600">-</span>
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
              {t("editProno")}
            </button>
          )}
        </div>
        {hasScorers && (
          <p className="relative z-10 ml-6 text-[11px] text-zinc-500">
            {scorerText}
          </p>
        )}
        <div className="relative z-10 ml-6 mt-1 flex items-center justify-between">
          <p className="text-[11px] capitalize text-zinc-600">{relativeTime}</p>
          <div className="flex items-center gap-3">
            {existingProno?.status === "won" && (
              <span className="text-[11px] font-black text-green-400">
                +
                {(existingProno.points_earned! > 0
                  ? existingProno.points_earned!
                  : existingProno.reward_amount!
                ).toLocaleString(bcp47)}{" "}
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
              className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 transition hover:text-zinc-300"
              aria-label="Partager mon prono"
            >
              <Share2 className="h-3 w-3" />
              {t("shareProno")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div
        className={`overflow-hidden rounded-2xl border bg-zinc-900/60 px-4 pb-3 pt-3 ${
          isLocked ? "border-zinc-700/30" : "border-white/8"
        }`}
      >
        <div className="mb-2 flex items-center gap-2 overflow-hidden">
          {match.round_short && (
            <span className="min-w-0 truncate text-[10px] font-black uppercase tracking-widest text-zinc-500">
              {match.round_short}
            </span>
          )}
          <span className="ml-auto shrink-0 text-[10px] capitalize text-zinc-500">
            {relativeTime}
          </span>
        </div>

        <div className="mb-1 mt-1 flex items-start justify-between">
          <div className="flex min-w-0 flex-1 flex-col items-center overflow-hidden text-center">
            <TeamLogo logo={match.home_team_logo} name={match.team_home} />
            <span className="mt-1.5 line-clamp-1 w-full text-sm font-bold leading-tight text-white">
              {match.team_home}
            </span>
            <div className="mt-1.5 max-w-full overflow-hidden">
              <TeamFormPills
                form={parseFormString(match.community_stats?.home_form)}
              />
            </div>
          </div>

          <div className="mx-2 flex shrink-0 flex-col items-center">
            {isLocked ? (
              <div className="flex flex-col items-center gap-2 px-2 py-2 text-center">
                {match.status === "first_half" ||
                match.status === "second_half" ||
                match.status === "half_time" ||
                match.status === "paused" ||
                match.status === "extra_time" ||
                match.status === "penalties" ? (
                  <>
                    <span className="block h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                    <p className="text-[11px] font-black uppercase tracking-widest text-red-400">
                      En direct
                    </p>
                  </>
                ) : (
                  <>
                    <span className="text-xl">🔒</span>
                    <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
                      Pronos fermés
                    </p>
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="mb-1.5 flex items-center gap-2">
                  <ScoreInput
                    value={homeScore}
                    onChange={setHomeScore}
                    onFilled={() => awayRef.current?.focus()}
                    aria-label={`Buts ${match.team_home}`}
                  />
                  <ScoreInput
                    value={awayScore}
                    onChange={setAwayScore}
                    inputRef={awayRef}
                    aria-label={`Buts ${match.team_away}`}
                  />
                </div>

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
                  const isFirstProno =
                    (match.community_stats?.total_pronos ?? 0) === 0;

                  return (
                    <>
                      <p className="mb-1 text-[9px] uppercase tracking-widest text-zinc-600">
                        Gain potentiel
                      </p>
                      <div className="flex items-center justify-center gap-1">
                        {[
                          { pts: pts1, active: is1 },
                          { pts: ptsN, active: isN },
                          { pts: pts2, active: is2 },
                        ].map(({ pts, active }, idx) => (
                          <div
                            key={idx}
                            className={`flex min-w-[1.8rem] items-center justify-center rounded-[5px] px-1.5 py-0.5 transition-all ${active ? "border border-amber-500/50 bg-zinc-900 shadow-[0_0_6px_rgba(245,158,11,0.1)]" : "border border-white/5 bg-zinc-800/80"}`}
                          >
                            <span
                              className={`text-[10px] font-black tabular-nums ${active ? "text-amber-400" : "text-zinc-500"}`}
                            >
                              {pts}
                            </span>
                          </div>
                        ))}
                      </div>

                      {isFirstProno ? (
                        <span className="mt-1.5 inline-flex items-center gap-0.5 rounded-full border border-whistle/30 bg-whistle/10 px-1.5 py-0.5 text-[8px] font-black text-whistle">
                          {t("firstToPredict")}
                        </span>
                      ) : (
                        <div className="mt-1 flex items-center justify-center gap-1 opacity-70">
                          {[
                            match.community_stats?.community_1_pct ?? 0,
                            match.community_stats?.community_N_pct ?? 0,
                            match.community_stats?.community_2_pct ?? 0,
                          ].map((pct, idx) => (
                            <div
                              key={idx}
                              className="min-w-[1.8rem] text-center"
                            >
                              <span className="text-[9px] font-medium text-zinc-500">
                                {pct}%
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-center overflow-hidden text-center">
            <TeamLogo logo={match.away_team_logo} name={match.team_away} />
            <span className="mt-1.5 line-clamp-1 w-full text-sm font-bold leading-tight text-white">
              {match.team_away}
            </span>
            <div className="mt-1.5 max-w-full overflow-hidden">
              <TeamFormPills
                form={parseFormString(match.community_stats?.away_form)}
              />
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
          <div className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-800/50 py-3 text-[11px] font-black uppercase tracking-widest text-zinc-500">
            🔒 Pronos fermés — départ dans moins d&apos;une heure
          </div>
        ) : scoresValid ? (
          <>
            <BoosterPickerForPronos
              selectedBoosterId={selectedBoosterId}
              onSelect={setSelectedBoosterId}
              disabled={loading}
            />
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
                  {t("submitProno")}
                </>
              )}
            </button>
          </>
        ) : null}
      </div>
    </>
  );
}
