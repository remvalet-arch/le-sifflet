"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { MarketEventRow } from "@/types/database";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useVotingMarket, type BetPlacedInfo } from "@/hooks/useVotingMarket";
import {
  getEventConfig,
  collectFocusable,
  BetConfirmedView,
  ModalHeader,
  VotingTimer,
  AmountPicker,
  BoosterPicker,
  BinaryButtons,
  StoppageButtons,
} from "@/components/voting/VotingButtons";
import { VisionBoosterButton } from "@/components/voting/VisionBoosterButton";

const STOPPAGE_OPTIONS = ["1", "2", "3", "4", "5", "6+"] as const;

type Props = {
  event: MarketEventRow;
  siffletsBalance: number;
  userId: string;
  onClose: () => void;
  onBetSuccess: (amountStaked: number) => void;
  onBetPlaced?: (info: BetPlacedInfo) => void;
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
  onBetPlaced,
  squadId,
  squadName,
  audienceCount,
}: Props) {
  const tEventConfig = useTranslations("EventConfig");
  const tVoting = useTranslations("Voting");
  const sheetRef = useRef<HTMLDivElement>(null);
  const [revealedHints, setRevealedHints] = useState<Record<
    string,
    number
  > | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const titleId = `vote-title-${event.id}`;
  const descId = `vote-desc-${event.id}`;
  useScrollLock(true);

  const vm = useVotingMarket({
    event,
    siffletsBalance,
    userId,
    onBetSuccess,
    onBetPlaced,
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

  const EVENT_CONFIG = getEventConfig(tEventConfig);
  const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.penalty_check;

  return (
    <div
      className="animate-modal-backdrop fixed inset-0 z-[60] flex items-end justify-center overflow-hidden bg-black/75 px-4 pb-24 backdrop-blur-sm sm:items-center sm:pb-4"
      style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 1rem)" }}
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
        className="animate-modal-sheet w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl sm:animate-modal-center"
        style={{
          maxHeight:
            "calc(100dvh - max(env(safe-area-inset-top, 0px), 1rem) - 6rem)",
        }}
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
            availableBoosters={availableBoosters.filter(
              (b) => b.booster.effect_type !== "vision",
            )}
            selectedBoosterId={selectedBoosterId}
            setSelectedBoosterId={setSelectedBoosterId}
            expired={expired}
          />

          <VisionBoosterButton
            eventId={event.id}
            hasVisionBooster={
              !expired &&
              availableBoosters.some((b) => b.booster.effect_type === "vision")
            }
            onActivated={(hints) => setRevealedHints(hints)}
          />

          {revealedHints && (
            <div
              className="mb-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-4"
              role="status"
              aria-live="polite"
            >
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-indigo-400">
                👁 Vision : choix de tes amis
              </p>
              {Object.keys(revealedHints).length === 0 ? (
                <p className="text-sm text-zinc-400">
                  Aucun ami n&apos;a encore voté sur ce market.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {Object.entries(revealedHints).map(([option, count]) => (
                    <div
                      key={option}
                      className="flex flex-col items-center rounded-xl bg-zinc-800 px-4 py-2"
                    >
                      <span className="text-xl font-black text-white">
                        {count}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wide text-zinc-500">
                        {option}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {optimisticVote ? (
            <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-green-500/50 bg-green-500/10 text-green-400">
              <span className="text-xl font-black uppercase tracking-wide">
                {tVoting("betValidated")}
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
            {tVoting("oddsDistribution")}
          </p>

          <button
            type="button"
            onClick={() => setRulesOpen(true)}
            data-testid="voting-rules-button"
            className="mt-3 w-full text-center text-[11px] font-bold text-zinc-600 transition hover:text-zinc-400"
          >
            ❓ {tVoting("howOddsWork")}
          </button>

          {rulesOpen && (
            <div
              className="fixed inset-0 z-[70] flex items-end"
              onClick={() => setRulesOpen(false)}
            >
              <div
                className="w-full rounded-t-3xl border-t border-white/10 bg-zinc-900 px-6 pt-6"
                style={{
                  paddingBottom: "max(env(safe-area-inset-bottom, 0px), 2rem)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-black text-white">
                    {tVoting("howOddsWork")}
                  </p>
                  <button
                    type="button"
                    onClick={() => setRulesOpen(false)}
                    aria-label={tVoting("closeWindow")}
                    className="flex size-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-500 hover:text-white"
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <div className="flex flex-col gap-3 text-sm text-zinc-300">
                  <p>⚖️ {tVoting("rulesLine1")}</p>
                  <p>🪙 {tVoting("rulesLine2")}</p>
                  <p>⏱ {tVoting("rulesLine3")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRulesOpen(false)}
                  className="mt-5 w-full rounded-2xl bg-zinc-800 py-3 text-sm font-black text-zinc-300 transition hover:bg-zinc-700"
                >
                  {tVoting("gotIt")}
                </button>
              </div>
            </div>
          )}

          {!canBet && !expired && (
            <p className="mt-3 text-center text-xs font-bold text-red-400">
              {tVoting("insufficientBalance")}
            </p>
          )}

          {expired && (
            <button
              type="button"
              onClick={onClose}
              className="mt-4 w-full rounded-2xl border border-white/10 py-3 text-sm font-bold text-zinc-500 transition hover:text-white"
            >
              {tVoting("close")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
