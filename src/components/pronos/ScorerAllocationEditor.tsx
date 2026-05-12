"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PlayerPickerSheet } from "./PlayerPickerSheet";

export type PlayerForSelect = {
  player_name: string;
  position?: string | null;
  cutout_url?: string | null;
  image_url?: string | null;
  odd_anytime?: number | null;
  odd_first?: number | null;
};

type ScorerEntry = { name: string; goals: number };
type ScorersAlloc = { home: ScorerEntry[]; away: ScorerEntry[] };

const CSC_ENTRY: PlayerForSelect = { player_name: "CSC" };

async function fetchPlayersForMatch(
  matchId: string,
  homeTeamId: string | null,
  awayTeamId: string | null,
): Promise<{ home: PlayerForSelect[]; away: PlayerForSelect[] }> {
  const supabase = createClient();

  const [{ data: lineups }, { data: oddsRows }] = await Promise.all([
    supabase
      .from("lineups")
      .select("player_name, team_side, position")
      .eq("match_id", matchId),
    supabase
      .from("player_odds")
      .select("player_name, odd_anytime, odd_first")
      .eq("match_id", matchId),
  ]);

  const oddsMap = new Map((oddsRows ?? []).map((r) => [r.player_name, r]));

  function withOdds(p: PlayerForSelect): PlayerForSelect {
    const o = oddsMap.get(p.player_name);
    if (!o) return p;
    return {
      ...p,
      odd_anytime: o.odd_anytime ?? undefined,
      odd_first: o.odd_first ?? undefined,
    };
  }

  const VALID_POSITIONS = new Set(["A", "M", "D", "G"]);

  if (lineups && lineups.length > 0) {
    const home: ReturnType<typeof withOdds>[] = [];
    const away: ReturnType<typeof withOdds>[] = [];
    for (const r of lineups) {
      if (!VALID_POSITIONS.has(r.position)) continue;
      const entry = withOdds({
        player_name: r.player_name,
        position: r.position,
      });
      if (r.team_side === "home") home.push(entry);
      else if (r.team_side === "away") away.push(entry);
    }
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
  const homeEntries: ReturnType<typeof withOdds>[] = [];
  const awayEntries: ReturnType<typeof withOdds>[] = [];
  for (const p of rows) {
    if (p.team_id === homeTeamId) homeEntries.push(withOdds(p));
    else if (p.team_id === awayTeamId) awayEntries.push(withOdds(p));
  }
  return {
    home: [CSC_ENTRY, ...homeEntries],
    away: [CSC_ENTRY, ...awayEntries],
  };
}

export function expandScorers(scorers: ScorerEntry[], count: number): string[] {
  const slots: string[] = [];
  for (const e of scorers) {
    for (let i = 0; i < e.goals; i++) slots.push(e.name);
  }
  while (slots.length < count) slots.push("");
  return slots.slice(0, count);
}

export function resizeSlots(slots: string[], newCount: number): string[] {
  if (newCount <= 0) return [];
  if (newCount > slots.length)
    return [...slots, ...Array(newCount - slots.length).fill("")];
  return slots.slice(0, newCount);
}

export function aggregateSlots(slots: string[]): ScorerEntry[] {
  const map = new Map<string, number>();
  for (const name of slots) {
    if (name.trim()) map.set(name, (map.get(name) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([name, goals]) => ({ name, goals }));
}

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
      <ChevronRight className="size-4 shrink-0 text-zinc-500" />
    </button>
  );
}

type Props = {
  matchId: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeam: string;
  awayTeam: string;
  homeCount: number;
  awayCount: number;
  isLocked: boolean;
  submitted: boolean;
  initialScorers: ScorersAlloc | null;
  onSlotsChange: (homeSlots: string[], awaySlots: string[]) => void;
};

export function ScorerAllocationEditor({
  matchId,
  homeTeamId,
  awayTeamId,
  homeTeam,
  awayTeam,
  homeCount,
  awayCount,
  isLocked,
  submitted,
  initialScorers,
  onSlotsChange,
}: Props) {
  const [showScorers, setShowScorers] = useState(initialScorers != null);
  const [homeRaw, setHomeRaw] = useState<string[]>(() =>
    initialScorers ? expandScorers(initialScorers.home, homeCount) : [],
  );
  const [awayRaw, setAwayRaw] = useState<string[]>(() =>
    initialScorers ? expandScorers(initialScorers.away, awayCount) : [],
  );

  const homeSlots = resizeSlots(homeRaw, homeCount);
  const awaySlots = resizeSlots(awayRaw, awayCount);

  const [homePlayers, setHomePlayers] = useState<PlayerForSelect[]>([]);
  const [awayPlayers, setAwayPlayers] = useState<PlayerForSelect[]>([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const playersLoadedRef = useRef(false);

  const hasScorerSlots = homeCount > 0 || awayCount > 0;

  useEffect(() => {
    if (!hasScorerSlots || playersLoadedRef.current || submitted) return;
    playersLoadedRef.current = true;
    setPlayersLoading(true);
    void fetchPlayersForMatch(matchId, homeTeamId, awayTeamId).then(
      ({ home, away }) => {
        setHomePlayers(home);
        setAwayPlayers(away);
        setPlayersLoading(false);
      },
    );
  }, [hasScorerSlots, matchId, homeTeamId, awayTeamId, submitted]);

  const [pickerOpen, setPickerOpen] = useState<{
    side: "home" | "away";
    idx: number;
  } | null>(null);

  const scorersFilled =
    homeSlots.some((s) => s !== "") || awaySlots.some((s) => s !== "");
  const scorersComplete =
    !scorersFilled ||
    (homeSlots.every((s) => s !== "") && awaySlots.every((s) => s !== ""));

  // Notify parent when slots change
  useEffect(() => {
    onSlotsChange(homeSlots, awaySlots);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [homeRaw, awayRaw, homeCount, awayCount]);

  if (!hasScorerSlots || isLocked) return null;

  const pickerSide = pickerOpen?.side;
  const pickerPlayers = pickerSide === "home" ? homePlayers : awayPlayers;
  const pickerTitle =
    pickerSide === "home" ? `Buteur — ${homeTeam}` : `Buteur — ${awayTeam}`;

  return (
    <>
      {!showScorers && (
        <button
          type="button"
          onClick={() => setShowScorers(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-600 py-2.5 text-xs font-bold text-zinc-400 transition hover:border-zinc-400 hover:text-zinc-200 active:scale-[0.98]"
        >
          <span className="text-base leading-none">+</span>
          Ajouter les buteurs (Optionnel)
        </button>
      )}

      {showScorers && (
        <div className="mt-4 flex flex-col gap-4">
          {homeCount > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Buteurs {homeTeam}
                {playersLoading && (
                  <span className="ml-2 inline-block size-2.5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300 align-middle" />
                )}
              </span>
              {homeSlots.map((name, idx) => (
                <ScorerSlot
                  key={name ? `home-${name}` : `home-empty-${idx}`}
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
                Buteurs {awayTeam}
                {playersLoading && (
                  <span className="ml-2 inline-block size-2.5 animate-spin rounded-full border-2 border-zinc-600 border-t-zinc-300 align-middle" />
                )}
              </span>
              {awaySlots.map((name, idx) => (
                <ScorerSlot
                  key={name ? `away-${name}` : `away-empty-${idx}`}
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
