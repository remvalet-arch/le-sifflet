"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Bell, Check, ChevronDown, ChevronRight, Target } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { trySubscribePush, isPushSubscribed } from "@/components/pwa/PushOptIn";
import { format, formatRelative, isToday, isTomorrow } from "date-fns";
import { fr } from "date-fns/locale";
import { PlayerPickerSheet } from "./PlayerPickerSheet";

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
};

export type CompetitionStub = {
  id: string;
  name: string;
  badge_url: string | null;
};

type ExistingProno = {
  match_id: string;
  prono_type: string;
  prono_value: string;
};

type ScorerEntry = { name: string; goals: number };
type ScorersAlloc = { home: ScorerEntry[]; away: ScorerEntry[] };

export type PlayerForSelect = {
  player_name: string;
  position?: string | null;
  cutout_url?: string | null;
  image_url?: string | null;
};

const CSC_ENTRY: PlayerForSelect = { player_name: "CSC" };

async function fetchPlayersForMatch(
  matchId: string,
  homeTeamId: string | null,
  awayTeamId: string | null,
): Promise<{ home: PlayerForSelect[]; away: PlayerForSelect[] }> {
  const supabase = createClient();

  const { data: lineups } = await supabase
    .from("lineups")
    .select("player_name, team_side, position")
    .eq("match_id", matchId);

  const VALID_POSITIONS = new Set(["A", "M", "D", "G"]);

  if (lineups && lineups.length > 0) {
    const home = lineups
      .filter((r) => r.team_side === "home" && VALID_POSITIONS.has(r.position))
      .map((r) => ({ player_name: r.player_name, position: r.position }));
    const away = lineups
      .filter((r) => r.team_side === "away" && VALID_POSITIONS.has(r.position))
      .map((r) => ({ player_name: r.player_name, position: r.position }));
    return { home: [CSC_ENTRY, ...home], away: [CSC_ENTRY, ...away] };
  }

  const teamIds = [homeTeamId, awayTeamId].filter(Boolean) as string[];
  if (teamIds.length === 0) return { home: [CSC_ENTRY], away: [CSC_ENTRY] };

  const { data: players } = await supabase
    .from("players")
    .select("player_name, team_id, position, cutout_url, image_url")
    .in("team_id", teamIds)
    .not("team_thesportsdb_id", "is", null)
    .neq("team_thesportsdb_id", "")
    .in("position", ["A", "M", "D", "G"]);

  const rows = players ?? [];
  return {
    home: [CSC_ENTRY, ...rows.filter((p) => p.team_id === homeTeamId)],
    away: [CSC_ENTRY, ...rows.filter((p) => p.team_id === awayTeamId)],
  };
}

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

/** Expand `ScorerEntry[]` (goals count per player) to a flat array of names. */
function expandScorers(scorers: ScorerEntry[], count: number): string[] {
  const slots: string[] = [];
  for (const e of scorers) {
    for (let i = 0; i < e.goals; i++) slots.push(e.name);
  }
  while (slots.length < count) slots.push("");
  return slots.slice(0, count);
}

/** Resize a slot array: preserve existing names, truncate or pad with "". */
function resizeSlots(slots: string[], newCount: number): string[] {
  if (newCount <= 0) return [];
  if (newCount > slots.length)
    return [...slots, ...Array(newCount - slots.length).fill("")];
  return slots.slice(0, newCount);
}

/** Aggregate flat slot names into ScorerEntry[] for the RPC. */
function aggregateSlots(slots: string[]): ScorerEntry[] {
  const map = new Map<string, number>();
  for (const name of slots) {
    if (name.trim()) map.set(name, (map.get(name) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([name, goals]) => ({ name, goals }));
}

function TeamLogo({ logo, name }: { logo: string | null; name: string }) {
  if (logo?.startsWith("http")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo} alt={name} className="h-8 w-8 object-contain" />
    );
  }
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm">
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
      className="h-12 w-12 rounded-xl border border-white/15 bg-zinc-900 text-center text-xl font-black text-white outline-none ring-0 transition focus:border-whistle focus:ring-1 focus:ring-whistle/40 disabled:cursor-not-allowed disabled:opacity-50"
      placeholder="–"
    />
  );
}

/** A tappable pill to select a player for one goal slot. */
function ScorerSlot({
  name,
  slotIndex,
  total,
  onTap,
  disabled,
}: {
  name: string;
  slotIndex: number;
  total: number;
  onTap: () => void;
  disabled?: boolean;
}) {
  const label = name.trim() ? name : "Sélectionner…";
  const filled = name.trim() !== "";

  const ordinal = total > 1 ? ` (${slotIndex + 1}e but)` : "";

  return (
    <button
      type="button"
      onClick={onTap}
      disabled={disabled}
      aria-label={`Buteur ${slotIndex + 1}${ordinal}`}
      className={`flex min-h-[48px] w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
        filled
          ? "border-whistle/30 bg-whistle/5 text-white"
          : "border-white/10 bg-zinc-800/40 text-zinc-500"
      }`}
    >
      <span className="text-sm font-bold">{label}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
    </button>
  );
}

function MatchPronoCard({
  match,
  existingScore,
  existingScorers,
  onSubmittedChange,
}: {
  match: MatchStub;
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

  // Raw selections: grow as user picks players. Slots are derived via resizeSlots(raw, count).
  // No effects needed — slots are always computed from score count.
  const [homeRaw, setHomeRaw] = useState<string[]>(() =>
    existingScorers ? expandScorers(existingScorers.home, homeCount) : [],
  );
  const [awayRaw, setAwayRaw] = useState<string[]>(() =>
    existingScorers ? expandScorers(existingScorers.away, awayCount) : [],
  );
  const homeSlots = resizeSlots(homeRaw, homeCount);
  const awaySlots = resizeSlots(awayRaw, awayCount);

  // Players
  const [homePlayers, setHomePlayers] = useState<PlayerForSelect[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<PlayerForSelect[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const playersLoadedRef = useRef(false);
  const hasScorerSlots = homeCount > 0 || awayCount > 0;

  useEffect(() => {
    if (!hasScorerSlots || playersLoadedRef.current || submitted) return;
    playersLoadedRef.current = true;
    setPlayersLoading(true);
    void fetchPlayersForMatch(
      match.id,
      match.home_team_id,
      match.away_team_id,
    ).then(({ home, away }) => {
      setHomePlayers(home);
      setAwayPlayers(away);
      setPlayersLoading(false);
    });
  }, [
    hasScorerSlots,
    match.id,
    match.home_team_id,
    match.away_team_id,
    submitted,
  ]);

  // Which slot is the picker open for
  const [pickerOpen, setPickerOpen] = useState<{
    side: "home" | "away";
    idx: number;
  } | null>(null);

  const isLocked = match.status !== "upcoming";
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
  const relativeTime = formatRelative(kickoff, new Date(), { locale: fr });

  // Compact submitted card
  if (submitted) {
    const homeAgg = aggregateSlots(homeSlots);
    const awayAgg = aggregateSlots(awaySlots);
    const hasScorers = homeAgg.length > 0 || awayAgg.length > 0;
    const scorerText = [
      homeAgg
        .map((e) => (e.goals > 1 ? `${e.name} (×${e.goals})` : e.name))
        .join(", "),
      awayAgg
        .map((e) => (e.goals > 1 ? `${e.name} (×${e.goals})` : e.name))
        .join(", "),
    ]
      .filter(Boolean)
      .join(" / ");

    return (
      <div className="flex flex-col gap-0.5 rounded-2xl border border-green-500/20 bg-zinc-900/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 shrink-0 text-green-400" />
          <span className="flex-1 text-sm font-bold text-white">
            {match.team_home}{" "}
            <span className="font-black text-whistle">
              {homeScore}–{awayScore}
            </span>{" "}
            {match.team_away}
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
          <p className="ml-6 text-[11px] text-zinc-500">{scorerText}</p>
        )}
        <p className="ml-6 text-[11px] capitalize text-zinc-600">
          {relativeTime}
        </p>
      </div>
    );
  }

  // Player picker sheet (one for home, one for away — rendered once, toggled by pickerOpen)
  const pickerSide = pickerOpen?.side;
  const pickerPlayers = pickerSide === "home" ? homePlayers : awayPlayers;
  const pickerTitle =
    pickerSide === "home"
      ? `Buteur — ${match.team_home}`
      : `Buteur — ${match.team_away}`;

  return (
    <>
      <div
        className={`rounded-2xl border bg-zinc-900/60 px-4 pb-5 pt-4 ${
          isLocked ? "border-zinc-700/30" : "border-white/8"
        }`}
      >
        {/* Match header */}
        <div className="mb-3 flex items-center justify-between">
          {match.round_short && (
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              {match.round_short}
            </span>
          )}
          <span className="ml-auto text-[10px] capitalize text-zinc-500">
            {relativeTime}
          </span>
        </div>

        {/* Teams + score inputs */}
        <div className="flex items-center gap-3">
          <div className="flex flex-1 flex-col items-center gap-1.5">
            <TeamLogo logo={match.home_team_logo} name={match.team_home} />
            <span className="line-clamp-2 text-center text-[11px] font-bold leading-tight text-white">
              {match.team_home}
            </span>
          </div>

          <div className="flex items-center gap-2">
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
            <span className="text-lg font-black text-zinc-600">–</span>
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

          <div className="flex flex-1 flex-col items-center gap-1.5">
            <TeamLogo logo={match.away_team_logo} name={match.team_away} />
            <span className="line-clamp-2 text-center text-[11px] font-bold leading-tight text-white">
              {match.team_away}
            </span>
          </div>
        </div>

        {/* Scorer slots — auto-generated from score */}
        {scoresValid && (homeCount > 0 || awayCount > 0) && (
          <div className="mt-4 flex flex-col gap-4">
            {homeCount > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Buteurs {match.team_home}
                  {playersLoading && (
                    <span className="ml-2 inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300 align-middle" />
                  )}
                </span>
                {homeSlots.map((name, idx) => (
                  <ScorerSlot
                    key={idx}
                    name={name}
                    slotIndex={idx}
                    total={homeCount}
                    onTap={() =>
                      !playersLoading && setPickerOpen({ side: "home", idx })
                    }
                    disabled={isLocked || playersLoading}
                  />
                ))}
              </div>
            )}

            {awayCount > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Buteurs {match.team_away}
                  {playersLoading && (
                    <span className="ml-2 inline-block h-2.5 w-2.5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300 align-middle" />
                  )}
                </span>
                {awaySlots.map((name, idx) => (
                  <ScorerSlot
                    key={idx}
                    name={name}
                    slotIndex={idx}
                    total={awayCount}
                    onTap={() =>
                      !playersLoading && setPickerOpen({ side: "away", idx })
                    }
                    disabled={isLocked || playersLoading}
                  />
                ))}
              </div>
            )}

            {scorersFilled && !scorersComplete && (
              <p className="text-[11px] text-amber-400">
                Complète tous les buteurs ou laisse-les tous vides.
              </p>
            )}
          </div>
        )}

        {/* Submit / locked */}
        {isLocked ? (
          <div className="mt-4 flex w-full items-center justify-center rounded-xl bg-zinc-800/50 py-3 text-sm font-black uppercase tracking-wide text-zinc-500">
            Le match a commencé, pronos fermés 🔒
          </div>
        ) : (
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
        )}
      </div>

      {/* Player picker bottom sheet */}
      <PlayerPickerSheet
        open={pickerOpen !== null}
        onClose={() => setPickerOpen(null)}
        title={pickerTitle}
        playersList={pickerPlayers}
        onSelect={(name) => {
          if (!pickerOpen) return;
          const { side, idx } = pickerOpen;
          if (side === "home") {
            setHomeRaw((prev) => {
              const next = [...prev];
              while (next.length <= idx) next.push("");
              next[idx] = name;
              return next;
            });
          } else {
            setAwayRaw((prev) => {
              const next = [...prev];
              while (next.length <= idx) next.push("");
              next[idx] = name;
              return next;
            });
          }
          setPickerOpen(null);
        }}
      />
    </>
  );
}

/** Returns a stable day key (YYYY-MM-DD) in Paris timezone. */
function getDayKey(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("fr-CA", {
    timeZone: "Europe/Paris",
  });
}

/** Short label for the day pill (2 lines: abbrev + date number). */
function getDayPill(dayKey: string): { abbrev: string; num: string } {
  const [y, mo, d] = dayKey.split("-").map(Number);
  const date = new Date(y!, mo! - 1, d!);
  if (isToday(date)) return { abbrev: "Auj.", num: "" };
  if (isTomorrow(date)) return { abbrev: "Dem.", num: "" };
  return {
    abbrev: format(date, "EEE", { locale: fr }), // "mer."
    num: format(date, "d", { locale: fr }), // "7"
  };
}

/** Full day label shown above the competition list. */
function getDayFullLabel(dayKey: string): string {
  const [y, mo, d] = dayKey.split("-").map(Number);
  const date = new Date(y!, mo! - 1, d!);
  if (isToday(date)) return "Aujourd'hui";
  if (isTomorrow(date)) return "Demain";
  return format(date, "EEEE d MMMM", { locale: fr });
}

export function PronosticsHubClient({
  matches,
  existingPronos,
  competitions,
}: {
  matches: MatchStub[];
  existingPronos: ExistingProno[];
  competitions: CompetitionStub[];
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

  // Selected day: first day that has at least one pending prono, else first day
  const [selectedDay, setSelectedDay] = useState<string>(() => {
    return (
      dayOrder.find((dk) => {
        const cm = dayMap.get(dk)!;
        return Array.from(cm.values()).some((ms) =>
          ms.some((m) => pronoByMatchId.get(m.id)?.score == null),
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

  const [submittedCount, setSubmittedCount] = useState(
    () => matches.filter((m) => pronoByMatchId.get(m.id)?.score != null).length,
  );

  function toggleSection(key: SectionKey) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const total = matches.length;

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-zinc-900/50 px-4 py-12 text-center">
        <Target
          className="mx-auto mb-3 h-10 w-10 text-zinc-700"
          strokeWidth={1.5}
        />
        <p className="text-sm font-bold text-zinc-400">
          Aucun match à venir dans les 7 prochains jours.
        </p>
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

      {/* Day navbar — horizontal scroll */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {dayOrder.map((dk) => {
          const cm = dayMap.get(dk)!;
          const dayTotal = Array.from(cm.values()).reduce(
            (s, ms) => s + ms.length,
            0,
          );
          const dayDone = Array.from(cm.values()).reduce(
            (s, ms) =>
              s +
              ms.filter((m) => pronoByMatchId.get(m.id)?.score != null).length,
            0,
          );
          const allDone = dayDone === dayTotal;
          const isSelected = dk === selectedDay;
          const pill = getDayPill(dk);

          return (
            <button
              key={dk}
              type="button"
              onClick={() => setSelectedDay(dk)}
              className={`relative flex shrink-0 flex-col items-center rounded-2xl px-4 py-2.5 transition active:scale-[0.96] ${
                isSelected
                  ? "bg-whistle text-pitch-900"
                  : "bg-zinc-800/70 text-zinc-400 hover:bg-zinc-800"
              }`}
            >
              <span className="text-[11px] font-black capitalize leading-tight">
                {pill.abbrev}
              </span>
              {pill.num && (
                <span
                  className={`text-[13px] font-black leading-tight tabular-nums ${
                    isSelected ? "text-pitch-900" : "text-zinc-300"
                  }`}
                >
                  {pill.num}
                </span>
              )}
              {/* Done indicator dot */}
              <span
                className={`mt-1 h-1 w-1 rounded-full transition-colors ${
                  allDone
                    ? isSelected
                      ? "bg-pitch-900/50"
                      : "bg-green-400"
                    : isSelected
                      ? "bg-pitch-900/30"
                      : "bg-zinc-600"
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Selected day label */}
      {selectedDay && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-black uppercase tracking-widest text-chalk capitalize">
            {getDayFullLabel(selectedDay)}
          </span>
          {selectedCompMap && (
            <>
              <span className="text-[10px] text-zinc-500">
                {Array.from(selectedCompMap.values()).reduce(
                  (s, ms) =>
                    s +
                    ms.filter((m) => pronoByMatchId.get(m.id)?.score != null)
                      .length,
                  0,
                )}
                /
                {Array.from(selectedCompMap.values()).reduce(
                  (s, ms) => s + ms.length,
                  0,
                )}
              </span>
              <div className="h-px flex-1 bg-white/8" />
            </>
          )}
        </div>
      )}

      {/* Competition accordions for selected day */}
      {selectedCompMap && (
        <div className="flex flex-col gap-2">
          {Array.from(selectedCompMap.entries()).map(
            ([compId, groupMatches]) => {
              const comp =
                compId !== "__none__" ? competitionMap.get(compId) : null;
              const sectionKey: SectionKey = `${selectedDay}::${compId}`;
              const isOpen = expanded.has(sectionKey);
              const sectionDone = groupMatches.filter(
                (m) => pronoByMatchId.get(m.id)?.score != null,
              ).length;
              const sectionTotal = groupMatches.length;
              const allDone = sectionDone === sectionTotal;

              return (
                <div
                  key={sectionKey}
                  className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900/40"
                >
                  {/* Accordion header */}
                  <button
                    type="button"
                    onClick={() => toggleSection(sectionKey)}
                    className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition active:bg-white/5"
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
                    <span className="flex-1 text-[12px] font-black uppercase tracking-wide text-zinc-300">
                      {comp?.name ?? "Autre"}
                    </span>
                    <span
                      className={`shrink-0 text-[11px] font-bold tabular-nums ${
                        allDone ? "text-green-400" : "text-zinc-500"
                      }`}
                    >
                      {sectionDone}/{sectionTotal}
                    </span>
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-zinc-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
                    )}
                  </button>

                  {/* Accordion body */}
                  {isOpen && (
                    <div className="flex flex-col gap-2 border-t border-white/5 px-3 pb-3 pt-2">
                      {groupMatches.map((m) => {
                        const p = pronoByMatchId.get(m.id);
                        return (
                          <MatchPronoCard
                            key={m.id}
                            match={m}
                            existingScore={p?.score ?? null}
                            existingScorers={p?.scorers ?? null}
                            onSubmittedChange={(submitted) => {
                              setSubmittedCount((prev) =>
                                submitted ? prev + 1 : Math.max(0, prev - 1),
                              );
                            }}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}
