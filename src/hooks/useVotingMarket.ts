"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { LIVE_BETTING_WINDOW_SECONDS } from "@/lib/constants/odds";
import type { MarketEventRow, BoosterCatalogRow } from "@/types/database";
import { getMinBetForBalance } from "@/lib/economy/min-bet";
import { trackBetPlaced, type BoosterSlug } from "@/lib/analytics";

const DEFAULT_ODD = 2;

function parseOddsRows(
  rows: { option: string; implied_multiplier: number }[] | null,
): Record<string, number> {
  if (!rows?.length) return {};
  const result: Record<string, number> = {};
  for (const r of rows) {
    const m = Number(r.implied_multiplier);
    if (!Number.isFinite(m) || m < 1) continue;
    result[r.option] = m;
  }
  return result;
}

function isStoppageType(type: MarketEventRow["type"]): boolean {
  return type === "stoppage_ht" || type === "stoppage_ft";
}

export type BetPlacedInfo = {
  eventId: string;
  eventType: MarketEventRow["type"];
  option: string;
  label: string;
  staked: number;
};

type Props = {
  event: MarketEventRow;
  siffletsBalance: number;
  userId: string;
  onClose: () => void;
  onBetSuccess: (amountStaked: number) => void;
  onBetPlaced?: (info: BetPlacedInfo) => void;
  squadId?: string | null;
};

export type BetConfirmed = {
  option: string;
  label: string;
  multiplier: number;
  staked: number;
  boosterName?: string;
};

export type VotingMarketState = {
  poolOdds: Record<string, number>;
  poolStaked: Record<string, number>;
  oddsLoading: boolean;
  elapsed: number;
  secondsLeft: number;
  expired: boolean;
  timerPct: number;
  timerColor: string;
  isUrgent: boolean;
  minBet: number;
  canBet: boolean;
  half: number;
  defaultAmount: number;
  amount: number;
  setAmount: (v: number) => void;
  clamp: (v: number) => number;
  voteLoading: string | null;
  optimisticVote: string | null;
  betConfirmed: BetConfirmed | null;
  availableBoosters: { inv_id: string; booster: BoosterCatalogRow }[];
  selectedBoosterId: string | null;
  setSelectedBoosterId: (id: string | null) => void;
  handleVote: (v: string) => Promise<void>;
  isStoppage: boolean;
};

export function useVotingMarket({
  event,
  siffletsBalance,
  userId,
  onBetSuccess,
  onBetPlaced,
  squadId,
  onClose,
}: Props): VotingMarketState {
  const supabase = createClient();
  const isStoppage = isStoppageType(event.type);
  const betRankRef = useRef(0);

  const [poolOdds, setPoolOdds] = useState<Record<string, number>>({});
  const [poolStaked, setPoolStaked] = useState<Record<string, number>>({});
  const [oddsLoading, setOddsLoading] = useState(true);

  const refreshOdds = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_event_odds", {
      p_event_id: event.id,
    });
    if (error) {
      console.error("[VotingModal] get_event_odds", error.message);
      return;
    }
    const nextOdds = parseOddsRows(data ?? null);
    setPoolOdds(nextOdds);
    const nextStaked: Record<string, number> = {};
    for (const r of data ?? []) {
      const staked = Number(
        (r as { option: string; pool_staked: number }).pool_staked ?? 0,
      );
      nextStaked[(r as { option: string; pool_staked: number }).option] =
        staked;
    }
    setPoolStaked(nextStaked);
    setTimeout(() => setOddsLoading(false), 0);
  }, [event.id, supabase]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshOdds();
    const id = setInterval(() => {
      void refreshOdds();
    }, 2000);
    return () => {
      clearInterval(id);
    };
  }, [refreshOdds]);

  const createdMs = useMemo(
    () => new Date(event.created_at).getTime(),
    [event.created_at],
  );
  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - createdMs) / 1000)),
  );
  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.max(0, Math.floor((Date.now() - createdMs) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [createdMs]);

  const secondsLeft = Math.max(0, LIVE_BETTING_WINDOW_SECONDS - elapsed);
  const expired = elapsed >= LIVE_BETTING_WINDOW_SECONDS;
  const timerPct = (secondsLeft / LIVE_BETTING_WINDOW_SECONDS) * 100;
  const isUrgent = secondsLeft <= 10 && secondsLeft > 0 && !expired;
  const timerColor =
    secondsLeft > 45
      ? "bg-green-500"
      : secondsLeft > 15
        ? "bg-yellow-400"
        : "bg-red-500";

  useEffect(() => {
    if (!isUrgent) return;
    const id = setInterval(() => {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([100]);
      }
    }, 3000);
    return () => clearInterval(id);
  }, [isUrgent]);

  const minBet = getMinBetForBalance(siffletsBalance);
  const canBet = siffletsBalance >= minBet;
  const half = Math.max(minBet, Math.floor(siffletsBalance / 2));
  const defaultAmount = Math.min(
    Math.max(minBet, Math.floor(siffletsBalance * 0.1)),
    siffletsBalance,
  );
  const [amount, setAmount] = useState(defaultAmount);

  function clamp(v: number) {
    return Math.min(Math.max(minBet, v), siffletsBalance);
  }

  const [voteLoading, setVoteLoading] = useState<string | null>(null);
  const [optimisticVote, setOptimisticVote] = useState<string | null>(null);
  const [betConfirmed, setBetConfirmed] = useState<BetConfirmed | null>(null);

  const [availableBoosters, setAvailableBoosters] = useState<
    { inv_id: string; booster: BoosterCatalogRow }[]
  >([]);
  const [selectedBoosterId, setSelectedBoosterId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    void supabase
      .from("user_boosters_inventory")
      .select("id, booster_id, consumed_at, boosters_catalog(*)")
      .is("consumed_at", null)
      .then(({ data }) => {
        if (!data) return;
        const items = data
          .filter((r) => r.boosters_catalog)
          .map((r) => ({
            inv_id: r.id,
            booster: r.boosters_catalog as unknown as BoosterCatalogRow,
          }));
        setTimeout(() => setAvailableBoosters(items), 0);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void supabase
      .from("bets")
      .select("chosen_option, amount_staked, potential_reward")
      .eq("event_id", event.id)
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const label = isStoppage
          ? `${data.chosen_option} min`
          : data.chosen_option;
        const impliedMultiplier =
          data.amount_staked > 0
            ? data.potential_reward / data.amount_staked
            : DEFAULT_ODD;
        setBetConfirmed({
          option: data.chosen_option,
          label,
          multiplier: impliedMultiplier,
          staked: data.amount_staked,
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, userId]);

  async function handleVote(v: string) {
    if (voteLoading || expired || !canBet || oddsLoading) return;
    const staked = clamp(amount);
    const multiplier = poolOdds[v] ?? DEFAULT_ODD;
    const selectedBooster = selectedBoosterId
      ? (availableBoosters.find((b) => b.booster.id === selectedBoosterId)
          ?.booster ?? null)
      : null;
    setVoteLoading(v);
    setOptimisticVote(v);
    try {
      const res = await fetch("/api/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          chosen_option: v,
          amount_staked: staked,
          multiplier,
          squad_id: squadId ?? null,
          booster_id: selectedBoosterId ?? null,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: unknown;
        error?: string;
      };
      if (!res.ok) {
        setOptimisticVote(null);
        toast.error(json.error ?? "Erreur inattendue");
        return;
      }
      betRankRef.current++;
      trackBetPlaced({
        match_id: event.match_id,
        market_id: event.id,
        market_type: event.type,
        chosen_option: v,
        amount_staked: staked,
        booster_applied: (selectedBooster?.effect_type as BoosterSlug) ?? null,
        is_first_bet_of_session: betRankRef.current === 1,
        bet_rank_in_session: betRankRef.current,
        via_quick_bet: false,
      });
      onBetSuccess(staked);
      const label = isStoppage ? `${v} min` : v;
      setBetConfirmed({
        option: v,
        label,
        multiplier,
        staked,
        boosterName: selectedBooster?.name,
      });
      toast.success(
        `✅ Pari enregistré — ${label.toUpperCase()} · ${staked.toLocaleString("fr-FR")} 🪙`,
      );
      onBetPlaced?.({
        eventId: event.id,
        eventType: event.type,
        option: v,
        label,
        staked,
      });
      if (selectedBoosterId) {
        setTimeout(() => {
          setAvailableBoosters((prev) =>
            prev.filter((b, i) => {
              if (b.booster.id === selectedBoosterId) {
                const firstIdx = prev.findIndex(
                  (x) => x.booster.id === selectedBoosterId,
                );
                return i !== firstIdx;
              }
              return true;
            }),
          );
          setSelectedBoosterId(null);
        }, 0);
      }
      setTimeout(() => onClose(), 1800);
    } catch {
      setOptimisticVote(null);
      toast.error("Connexion perdue, réessaie !");
    } finally {
      setVoteLoading(null);
    }
  }

  return {
    poolOdds,
    poolStaked,
    oddsLoading,
    elapsed,
    secondsLeft,
    expired,
    timerPct,
    timerColor,
    isUrgent,
    minBet,
    canBet,
    half,
    defaultAmount,
    amount,
    setAmount,
    clamp,
    voteLoading,
    optimisticVote,
    betConfirmed,
    availableBoosters,
    selectedBoosterId,
    setSelectedBoosterId,
    handleVote,
    isStoppage,
  };
}
