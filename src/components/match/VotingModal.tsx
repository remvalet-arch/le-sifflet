"use client";

import { useEffect, useRef } from "react";
import type { MarketEventRow } from "@/types/database";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useVotingMarket } from "@/hooks/useVotingMarket";
import {
  EVENT_CONFIG,
  collectFocusable,
  BetConfirmedView,
  ModalHeader,
  VotingTimer,
  AmountPicker,
  BoosterPicker,
  BinaryButtons,
  StoppageButtons,
} from "@/components/voting/VotingButtons";

const STOPPAGE_OPTIONS = ["1", "2", "3", "4", "5", "6+"] as const;

type Props = {
  event: MarketEventRow;
  siffletsBalance: number;
  userId: string;
  onClose: () => void;
  onBetSuccess: (amountStaked: number) => void;
  squadId?: string | null;
  squadName?: string | null;
  audienceCount?: number;
};

export function VotingModal({
  event,
  siffletsBalance,
  userId,
  onClose,
  onBetSuccess,
  squadId,
  squadName,
  audienceCount,
}: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleId = `vote-title-${event.id}`;
  const descId = `vote-desc-${event.id}`;
  useScrollLock(true);

  const vm = useVotingMarket({
    event,
    siffletsBalance,
    userId,
    onBetSuccess,
    squadId,
    onClose,
  });
  const {
    poolOdds,
    poolStaked,
    oddsLoading,
    secondsLeft,
    expired,
    timerPct,
    timerColor,
    isUrgent,
    minBet,
    canBet,
    half,
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
  } = vm;

  // Focus trap — stays here because it references sheetRef directly
  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null;
    const root = sheetRef.current;
    if (!root) return;
    const focusables = collectFocusable(root);
    (focusables[0] ?? root).focus();
    function onKeyDown(e: KeyboardEvent) {
      const trapRoot = sheetRef.current;
      if (!trapRoot) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const nodes = collectFocusable(trapRoot);
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      prevActive?.focus?.();
    };
  }, [onClose]);

  const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.penalty_check;

  return (
    <div
      className="animate-modal-backdrop fixed inset-0 z-[60] flex items-end justify-center bg-black/75 px-4 pb-24 pt-4 backdrop-blur-sm sm:items-center sm:pb-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="animate-modal-sheet w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl sm:animate-modal-center"
      >
        {betConfirmed && <BetConfirmedView bet={betConfirmed} />}

        <div className={betConfirmed ? "hidden" : "px-6 pb-6 pt-5"}>
          <ModalHeader
            cfg={cfg}
            squadId={squadId}
            squadName={squadName}
            titleId={titleId}
            descId={descId}
            onClose={onClose}
          />

          <VotingTimer
            secondsLeft={secondsLeft}
            expired={expired}
            isUrgent={isUrgent}
            timerPct={timerPct}
            timerColor={timerColor}
            audienceCount={audienceCount}
          />

          <AmountPicker
            amount={amount}
            setAmount={setAmount}
            clamp={clamp}
            minBet={minBet}
            half={half}
            siffletsBalance={siffletsBalance}
            canBet={canBet}
            expired={expired}
          />

          <BoosterPicker
            availableBoosters={availableBoosters}
            selectedBoosterId={selectedBoosterId}
            setSelectedBoosterId={setSelectedBoosterId}
            expired={expired}
          />

          {optimisticVote ? (
            <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-green-500/50 bg-green-500/10 text-green-400">
              <span className="text-xl font-black uppercase tracking-wide">
                Pari Validé !
              </span>
              <span className="text-sm font-bold opacity-80">
                {isStoppage ? `${optimisticVote} min` : optimisticVote}
              </span>
            </div>
          ) : isStoppage ? (
            <StoppageButtons
              options={STOPPAGE_OPTIONS}
              poolOdds={poolOdds}
              amount={amount}
              disabled={!!voteLoading || expired || !canBet || oddsLoading}
              voteLoading={voteLoading}
              onVote={(v) => void handleVote(v)}
            />
          ) : (
            <BinaryButtons
              cfg={cfg}
              poolOdds={poolOdds}
              poolStaked={poolStaked}
              disabled={!!voteLoading || expired || !canBet || oddsLoading}
              voteLoading={voteLoading}
              onVote={(v) => void handleVote(v)}
            />
          )}

          <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
            Répartition des mises en temps réel
          </p>

          {!canBet && !expired && (
            <p className="mt-3 text-center text-xs font-bold text-red-400">
              Solde insuffisant (min. 10 🪙)
            </p>
          )}

          {expired && (
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-2xl border border-white/10 py-3 text-sm font-bold text-zinc-500 transition hover:text-white"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
