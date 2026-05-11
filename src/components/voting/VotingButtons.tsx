"use client";

import { useTranslations } from "next-intl";
import { useBcp47 } from "@/lib/use-bcp47";
import { LoaderCircle, Swords, X } from "lucide-react";
import { LIVE_BETTING_WINDOW_SECONDS } from "@/lib/constants/odds";
import type { BetConfirmed } from "@/hooks/useVotingMarket";
import type { BoosterCatalogRow, MarketEventType } from "@/types/database";

type EventConfigEntry = {
  question: string;
  emoji: string;
  yes: string;
  no: string;
};

export function getEventConfig(
  t: ReturnType<typeof useTranslations<"EventConfig">>,
): Record<MarketEventType, EventConfigEntry> {
  return {
    penalty_check: {
      question: t("penaltyCheckQuestion"),
      emoji: "📢",
      yes: t("yes"),
      no: t("no"),
    },
    penalty_outcome: {
      question: t("penaltyOutcomeQuestion"),
      emoji: "🥅",
      yes: t("penaltyOutcomeYes"),
      no: t("penaltyOutcomeNo"),
    },
    var_goal: {
      question: t("varGoalQuestion"),
      emoji: "🚩",
      yes: t("varGoalYes"),
      no: t("varGoalNo"),
    },
    red_card: {
      question: t("redCardQuestion"),
      emoji: "🟥",
      yes: t("redCardYes"),
      no: t("redCardNo"),
    },
    free_kick: {
      question: t("freeKickQuestion"),
      emoji: "🎯",
      yes: t("yes"),
      no: t("no"),
    },
    corner: {
      question: t("cornerQuestion"),
      emoji: "🏁",
      yes: t("yes"),
      no: t("no"),
    },
    stoppage_ht: {
      question: t("stoppageHtQuestion"),
      emoji: "⏱️",
      yes: "",
      no: "",
    },
    stoppage_ft: {
      question: t("stoppageFtQuestion"),
      emoji: "⏱️",
      yes: "",
      no: "",
    },
  };
}

export function collectFocusable(root: HTMLElement): HTMLElement[] {
  const sel = [
    "a[href]",
    "button:not([disabled])",
    "textarea:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");
  return [...root.querySelectorAll<HTMLElement>(sel)].filter(
    (el) => el.offsetParent !== null || el.getClientRects().length > 0,
  );
}

const DEFAULT_ODD = 2;

function computePct(
  poolOdds: Record<string, number>,
  options: string[],
): Record<string, number> {
  const implied = options.map((opt) => ({
    opt,
    ip: 1 / (poolOdds[opt] ?? DEFAULT_ODD),
  }));
  const total = implied.reduce((s, x) => s + x.ip, 0);
  if (total === 0) return {};
  const result: Record<string, number> = {};
  for (const { opt, ip } of implied) {
    result[opt] = Math.round((ip / total) * 100);
  }
  return result;
}

export const OPTION_COLORS = [
  "border-violet-500/60 bg-violet-500/10 hover:border-violet-500 hover:bg-violet-500/20 text-violet-400",
  "border-blue-500/60 bg-blue-500/10 hover:border-blue-500 hover:bg-blue-500/20 text-blue-400",
  "border-cyan-500/60 bg-cyan-500/10 hover:border-cyan-500 hover:bg-cyan-500/20 text-cyan-400",
  "border-teal-500/60 bg-teal-500/10 hover:border-teal-500 hover:bg-teal-500/20 text-teal-400",
  "border-amber-500/60 bg-amber-500/10 hover:border-amber-500 hover:bg-amber-500/20 text-amber-400",
  "border-red-500/60 bg-red-500/10 hover:border-red-500 hover:bg-red-500/20 text-red-400",
];

// ── BetConfirmedView ────────────────────────────────────────────────────────
export function BetConfirmedView({ bet }: { bet: BetConfirmed }) {
  const t = useTranslations("Voting");
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <span className="text-5xl">⚡</span>
      <p className="text-xl font-black uppercase tracking-tight text-white">
        {t("betRegistered")}
      </p>
      <p className="text-sm font-black text-zinc-300">
        {bet.staked} 🪙 sur{" "}
        <span className="text-green-400 uppercase">{bet.label}</span>
      </p>
      {bet.boosterName && (
        <p className="text-[11px] font-black text-amber-400">
          {t("boosterActive", { name: bet.boosterName })}
        </p>
      )}
      <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
        {t("potentialGain")}{" "}
        <span className="text-green-400">
          {Math.floor(bet.staked * bet.multiplier)} 🪙
        </span>
      </p>
      <p className="text-[10px] text-zinc-600">{t("verdictComing")}</p>
    </div>
  );
}

// ── ModalHeader ──────────────────────────────────────────────────────────────
export function ModalHeader({
  cfg,
  squadId,
  squadName,
  titleId,
  descId,
  onClose,
}: {
  cfg: { emoji: string; question: string };
  squadId?: string | null;
  squadName?: string | null;
  titleId: string;
  descId: string;
  onClose: () => void;
}) {
  const t = useTranslations("Voting");
  return (
    <div className="mb-4 flex items-start justify-between gap-2">
      <p id={descId} className="sr-only">
        {t("betDescription")}
      </p>
      <div className="flex items-center gap-3">
        <span className="text-2xl" aria-hidden>
          {cfg.emoji}
        </span>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {t("decision")}
          </p>
          {squadId && squadName && (
            <p className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1.5 text-[10px] leading-snug text-amber-100/90">
              <Swords
                className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/90"
                aria-hidden
              />
              <span className="line-clamp-2 min-w-0 font-medium">
                {t("activeRaid")}{" "}
                <span className="font-black text-amber-50">{squadName}</span>
              </span>
            </p>
          )}
          <p id={titleId} className="text-lg font-black text-white">
            {cfg.question}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label={t("closeWindow")}
        data-testid="voting-modal-close"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition hover:bg-zinc-700 hover:text-white active:scale-90"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

// ── VotingTimer ──────────────────────────────────────────────────────────────
export function VotingTimer({
  secondsLeft,
  expired,
  isUrgent,
  timerPct,
  timerColor,
  audienceCount,
}: {
  secondsLeft: number;
  expired: boolean;
  isUrgent: boolean;
  timerPct: number;
  timerColor: string;
  audienceCount?: number;
}) {
  const t = useTranslations("Voting");
  return (
    <div className="mb-5 flex flex-col items-center gap-2">
      <div
        className={`tabular-nums text-6xl font-black leading-none tracking-tight transition-colors ${
          expired
            ? "text-zinc-600"
            : isUrgent
              ? "text-red-400"
              : secondsLeft > 45
                ? "text-green-400"
                : "text-yellow-400"
        }`}
        role="timer"
        aria-label={
          expired ? t("closed") : t("secondsLeft", { count: secondsLeft })
        }
      >
        {expired ? "0:00" : `0:${String(secondsLeft).padStart(2, "0")}`}
      </div>
      {audienceCount && audienceCount > 0 ? (
        <span className="text-xs font-bold text-zinc-500">
          👁️ {t("inStadium", { count: audienceCount })}
        </span>
      ) : (
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          {expired ? t("closed") : t("timeLeft")}
        </span>
      )}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={LIVE_BETTING_WINDOW_SECONDS}
        aria-valuenow={secondsLeft}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${timerColor}`}
          style={{ width: `${timerPct}%` }}
        />
      </div>
    </div>
  );
}

// ── AmountPicker ─────────────────────────────────────────────────────────────
// AmountPicker — needs bcp47 for number formatting
export function AmountPicker({
  amount,
  setAmount,
  clamp,
  minBet,
  half,
  siffletsBalance,
  canBet,
  expired,
}: {
  amount: number;
  setAmount: (v: number) => void;
  clamp: (v: number) => number;
  minBet: number;
  half: number;
  siffletsBalance: number;
  canBet: boolean;
  expired: boolean;
}) {
  const t = useTranslations("Voting");
  const bcp47 = useBcp47();
  const sliderPct =
    Math.max(minBet, siffletsBalance) - minBet > 0
      ? ((amount - minBet) / (Math.max(minBet, siffletsBalance) - minBet)) * 100
      : 0;

  return (
    <div className="mb-5">
      <p className="mb-2 text-sm font-bold text-zinc-400">{t("stake")}</p>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {(
          [
            [t("min"), minBet],
            [t("half"), half],
            [t("allIn"), siffletsBalance],
          ] as const
        ).map(([label, val]) => (
          <button
            type="button"
            key={label}
            onClick={() => setAmount(val)}
            disabled={!canBet || expired}
            className={`min-h-[48px] rounded-xl border text-sm font-bold transition disabled:opacity-30 ${
              amount === val
                ? "border-green-500/50 bg-green-500/20 text-green-400"
                : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="relative mt-2 pb-1 pt-7">
        <div
          className="pointer-events-none absolute top-0 z-10"
          style={{ left: `${sliderPct}%`, transform: "translateX(-50%)" }}
        >
          <span className="whitespace-nowrap rounded-md bg-zinc-700 px-1.5 py-0.5 text-[11px] font-black text-white">
            🪙 {amount.toLocaleString(bcp47)}
          </span>
        </div>
        <input
          type="range"
          min={minBet}
          max={Math.max(minBet, siffletsBalance)}
          step={10}
          value={amount}
          onChange={(e) => setAmount(clamp(parseInt(e.target.value, 10)))}
          disabled={!canBet || expired}
          aria-label={t("betAmount")}
          className="w-full accent-green-500 disabled:opacity-40"
        />
      </div>
      {minBet > 5 && (
        <p className="mt-1 text-[10px] text-zinc-600">
          {t("minStakeInfo")}{" "}
          <span className="font-black text-zinc-500">
            {minBet.toLocaleString(bcp47)} 🪙
          </span>
        </p>
      )}
    </div>
  );
}

// ── BoosterPicker ────────────────────────────────────────────────────────────
export function BoosterPicker({
  availableBoosters,
  selectedBoosterId,
  setSelectedBoosterId,
  expired,
}: {
  availableBoosters: { inv_id: string; booster: BoosterCatalogRow }[];
  selectedBoosterId: string | null;
  setSelectedBoosterId: (id: string | null) => void;
  expired: boolean;
}) {
  const t = useTranslations("Voting");
  if (availableBoosters.length === 0 || expired) return null;

  return (
    <div className="mb-4">
      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
        {t("useBooster")}
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[
          ...new Map(availableBoosters.map((b) => [b.booster.id, b])).values(),
        ].map((item) => {
          const count = availableBoosters.filter(
            (b) => b.booster.id === item.booster.id,
          ).length;
          const isSelected = selectedBoosterId === item.booster.id;
          return (
            <button
              key={item.booster.id}
              type="button"
              onClick={() =>
                setSelectedBoosterId(isSelected ? null : item.booster.id)
              }
              className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-black transition ${
                isSelected
                  ? "border border-amber-500/40 bg-amber-500/20 text-amber-400"
                  : "border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              ⚡ {item.booster.name}
              {count > 1 && (
                <span className="ml-1 text-[9px] text-zinc-500">×{count}</span>
              )}
            </button>
          );
        })}
      </div>
      {selectedBoosterId && (
        <p className="mt-1.5 text-[10px] text-amber-400/80">
          {
            availableBoosters.find((b) => b.booster.id === selectedBoosterId)
              ?.booster.description
          }
        </p>
      )}
    </div>
  );
}

// ── BinaryButtons ────────────────────────────────────────────────────────────
export function BinaryButtons({
  cfg,
  poolOdds,
  poolStaked,
  disabled,
  voteLoading,
  onVote,
}: {
  cfg: { yes: string; no: string };
  poolOdds: Record<string, number>;
  poolStaked: Record<string, number>;
  disabled: boolean;
  voteLoading: string | null;
  onVote: (v: string) => void;
}) {
  const t = useTranslations("Voting");
  const bcp47 = useBcp47();
  const pct = computePct(poolOdds, ["oui", "non"]);
  const ouiPct = pct["oui"] ?? 50;
  const nonPct = pct["non"] ?? 50;
  const totalInJeu = (poolStaked["oui"] ?? 0) + (poolStaked["non"] ?? 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <div
          className="flex h-3 overflow-hidden rounded-full"
          role="img"
          aria-label={`${ouiPct}% ${cfg.yes}, ${nonPct}% ${cfg.no}`}
        >
          <div
            className="bg-green-500 transition-[width] duration-700 ease-out"
            style={{ width: `${ouiPct}%` }}
          />
          <div
            className="bg-red-500 transition-[width] duration-700 ease-out"
            style={{ width: `${nonPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-green-400">
            {ouiPct}% {cfg.yes}
          </span>
          <span className="text-[10px] font-semibold text-zinc-500">
            {totalInJeu > 0
              ? t("inPlay", { amount: totalInJeu.toLocaleString(bcp47) })
              : t("noStake")}
          </span>
          <span className="text-xs font-black text-red-400">
            {nonPct}% {cfg.no}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(["oui", "non"] as const).map((v) => {
          const odd = poolOdds[v] ?? DEFAULT_ODD;
          const isLoading = voteLoading === v;
          const label = v === "oui" ? cfg.yes : cfg.no;
          const votePct = v === "oui" ? ouiPct : nonPct;
          return (
            <button
              type="button"
              key={v}
              onClick={() => onVote(v)}
              disabled={disabled}
              aria-label={`${label} — ${votePct}%`}
              data-testid={`vote-btn-${v}`}
              className={`flex h-20 flex-col items-center justify-center gap-1 rounded-2xl border-2 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
                v === "oui"
                  ? "border-green-500/60 bg-green-500/10 hover:border-green-500 hover:bg-green-500/20"
                  : "border-red-500/60 bg-red-500/10 hover:border-red-500 hover:bg-red-500/20"
              }`}
            >
              {isLoading ? (
                <LoaderCircle
                  className="h-6 w-6 animate-spin text-white"
                  aria-hidden
                />
              ) : (
                <>
                  <span className="text-xl font-black uppercase tracking-wide text-white">
                    {label}
                  </span>
                  <span
                    className={`text-sm font-black tabular-nums ${
                      v === "oui" ? "text-green-400" : "text-red-400"
                    }`}
                    aria-live="polite"
                  >
                    {votePct}%
                  </span>
                  <span className="sr-only">
                    {t("oddMultiplier", { odd: odd.toFixed(2) })}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── StoppageButtons ──────────────────────────────────────────────────────────
export function StoppageButtons({
  options,
  poolOdds,
  amount,
  disabled,
  voteLoading,
  onVote,
}: {
  options: readonly string[];
  poolOdds: Record<string, number>;
  amount: number;
  disabled: boolean;
  voteLoading: string | null;
  onVote: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {options.map((opt, idx) => {
        const odd = poolOdds[opt] ?? DEFAULT_ODD;
        const gain = Math.floor(amount * odd);
        const isLoading = voteLoading === opt;
        const colorCls = OPTION_COLORS[idx % OPTION_COLORS.length]!;
        return (
          <button
            type="button"
            key={opt}
            onClick={() => onVote(opt)}
            disabled={disabled}
            aria-label={`${opt} minute${opt === "1" ? "" : "s"}, cote estimée ${odd.toFixed(2)}, gain potentiel environ ${gain} points`}
            className={`flex flex-col items-center justify-center gap-0.5 rounded-2xl border-2 py-3 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${colorCls}`}
          >
            {isLoading ? (
              <LoaderCircle
                className="h-5 w-5 animate-spin text-white"
                aria-hidden
              />
            ) : (
              <>
                <span className="text-xl font-black tabular-nums text-white">
                  {opt}
                </span>
                <span className="text-[9px] font-semibold text-white/50">
                  min
                </span>
                <span
                  className="text-xs font-black tabular-nums"
                  aria-live="polite"
                >
                  ×{odd.toFixed(2)}
                </span>
                <span className="text-[9px] font-bold text-white/40">
                  +{gain >= 1000 ? `${Math.floor(gain / 1000)}k` : gain} 🪙
                </span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
