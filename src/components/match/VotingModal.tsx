"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { LoaderCircle, X, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LIVE_BETTING_WINDOW_SECONDS } from "@/lib/constants/odds";
import type {
  MarketEventRow,
  MarketEventType,
  BoosterCatalogRow,
} from "@/types/database";
import { getMinBetForBalance } from "@/lib/economy/min-bet";

const EVENT_CONFIG: Record<
  MarketEventType,
  { question: string; emoji: string; yes: string; no: string }
> = {
  penalty_check: {
    question: "Y'a pénalty là ?!",
    emoji: "📢",
    yes: "OUI",
    no: "NON",
  },
  penalty_outcome: {
    question: "Péno accordé — il met au fond ?",
    emoji: "🥅",
    yes: "AU FOND",
    no: "RATÉ",
  },
  var_goal: {
    question: "But confirmé par la VAR ?",
    emoji: "🚩",
    yes: "BUT",
    no: "ANNULÉ",
  },
  red_card: {
    question: "Vilaine semelle — c'est rouge ?",
    emoji: "🟥",
    yes: "ROUGE",
    no: "JAUNE",
  },
  free_kick: {
    question: "Coup franc à 20m — but dans 3 min ?",
    emoji: "🎯",
    yes: "OUI",
    no: "NON",
  },
  corner: {
    question: "Corner tendu — but dans 3 min ?",
    emoji: "🏁",
    yes: "OUI",
    no: "NON",
  },
  stoppage_ht: {
    question: "Combien de minutes d'arrêt à la mi-temps ?",
    emoji: "⏱️",
    yes: "",
    no: "",
  },
  stoppage_ft: {
    question: "Combien de minutes d'arrêt en fin de match ?",
    emoji: "⏱️",
    yes: "",
    no: "",
  },
};

const STOPPAGE_OPTIONS = ["1", "2", "3", "4", "5", "6+"] as const;
const DEFAULT_ODD = 2;

function isStoppageType(type: MarketEventType): boolean {
  return type === "stoppage_ht" || type === "stoppage_ft";
}

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

function collectFocusable(root: HTMLElement): HTMLElement[] {
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
  const supabase = createClient();
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleId = `vote-title-${event.id}`;
  const descId = `vote-desc-${event.id}`;
  const isStoppage = isStoppageType(event.type);

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
    // Collect pool_staked per option
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

  // Haptic feedback on last 10 seconds (Android + some browsers)
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
  const [betConfirmed, setBetConfirmed] = useState<{
    option: string;
    label: string;
    multiplier: number;
    staked: number;
    boosterName?: string;
  } | null>(null);

  // Boosters
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

  // Check if user already placed a bet on this event
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
      onBetSuccess(staked);
      const label = isStoppage ? `${v} min` : v;
      setBetConfirmed({
        option: v,
        label,
        multiplier,
        staked,
        boosterName: selectedBooster?.name,
      });
      // Remove used booster from local list
      if (selectedBoosterId) {
        setTimeout(() => {
          setAvailableBoosters((prev) =>
            prev.filter((b, i) => {
              if (b.booster.id === selectedBoosterId) {
                // remove only first match (one consumed)
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
        {betConfirmed && (
          <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
            <span className="text-5xl">⚡</span>
            <p className="text-xl font-black uppercase tracking-tight text-white">
              Pari enregistré
            </p>
            <p className="text-sm font-black text-zinc-300">
              {betConfirmed.staked} 🪙 sur{" "}
              <span className="text-green-400 uppercase">
                {betConfirmed.label}
              </span>
            </p>
            {betConfirmed.boosterName && (
              <p className="text-[11px] font-black text-amber-400">
                ⚡ Booster actif : {betConfirmed.boosterName}
              </p>
            )}
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Gain potentiel :{" "}
              <span className="text-green-400">
                {Math.floor(betConfirmed.staked * betConfirmed.multiplier)} 🪙
              </span>
            </p>
            <p className="text-[10px] text-zinc-600">
              Le verdict arrive quand la VAR tranche.
            </p>
          </div>
        )}
        <div className={betConfirmed ? "hidden" : "px-6 pb-6 pt-5"}>
          <p id={descId} className="sr-only">
            Parie des Sifflets contre toute la communauté. Les points des
            joueurs qui se trompent financent les gains de ceux qui ont le bon
            flair. Cotes en temps réel selon les mises. Ferme avec Échap ou le
            bouton Passer.
          </p>

          {/* Header */}
          <div className="mb-4 flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl" aria-hidden>
                {cfg.emoji}
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Décision en cours
                </p>
                {squadId && squadName && (
                  <p className="mt-1.5 flex items-start gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-1.5 text-[10px] leading-snug text-amber-100/90">
                    <Swords
                      className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/90"
                      aria-hidden
                    />
                    <span className="line-clamp-2 min-w-0 font-medium">
                      Braquage actif avec{" "}
                      <span className="font-black text-amber-50">
                        {squadName}
                      </span>
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
              aria-label="Fermer la fenêtre de pari"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-500 transition hover:bg-zinc-700 hover:text-white active:scale-90"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {/* Timer — hero display */}
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
                expired ? "Votes clos" : `${secondsLeft} secondes restantes`
              }
            >
              {expired ? "0:00" : `0:${String(secondsLeft).padStart(2, "0")}`}
            </div>
            {audienceCount && audienceCount > 0 ? (
              <span className="text-xs font-bold text-zinc-500">
                👁️ {audienceCount} dans le stade
              </span>
            ) : (
              <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                {expired ? "Votes clos" : "Temps restant"}
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

          {/* Amount */}
          <div className="mb-5">
            <p className="mb-2 text-sm font-bold text-zinc-400">Engagement</p>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {(
                [
                  ["MIN", minBet],
                  ["MOITIÉ", half],
                  ["ALL IN", siffletsBalance],
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
                style={{
                  left: `${
                    Math.max(minBet, siffletsBalance) - minBet > 0
                      ? ((amount - minBet) /
                          (Math.max(minBet, siffletsBalance) - minBet)) *
                        100
                      : 0
                  }%`,
                  transform: "translateX(-50%)",
                }}
              >
                <span className="whitespace-nowrap rounded-md bg-zinc-700 px-1.5 py-0.5 text-[11px] font-black text-white">
                  🪙 {amount.toLocaleString("fr-FR")}
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
                aria-label="Montant du pari en points"
                className="w-full accent-green-500 disabled:opacity-40"
              />
            </div>
            {minBet > 5 && (
              <p className="mt-1 text-[10px] text-zinc-600">
                🎚️ Mise min sur ton solde :{" "}
                <span className="font-black text-zinc-500">
                  {minBet.toLocaleString("fr-FR")} 🪙
                </span>
              </p>
            )}
          </div>

          {/* Booster picker */}
          {availableBoosters.length > 0 && !expired && (
            <div className="mb-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                ⚡ Utiliser un booster ?
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {[
                  ...new Map(
                    availableBoosters.map((b) => [b.booster.id, b]),
                  ).values(),
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
                        setSelectedBoosterId(
                          isSelected ? null : item.booster.id,
                        )
                      }
                      className={`shrink-0 rounded-xl px-3 py-2 text-[11px] font-black transition ${
                        isSelected
                          ? "border border-amber-500/40 bg-amber-500/20 text-amber-400"
                          : "border border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      ⚡ {item.booster.name}
                      {count > 1 && (
                        <span className="ml-1 text-[9px] text-zinc-500">
                          ×{count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedBoosterId && (
                <p className="mt-1.5 text-[10px] text-amber-400/80">
                  {
                    availableBoosters.find(
                      (b) => b.booster.id === selectedBoosterId,
                    )?.booster.description
                  }
                </p>
              )}
            </div>
          )}

          {/* Boutons de vote */}
          {optimisticVote ? (
            <div className="flex h-24 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-green-500/50 bg-green-500/10 text-green-400">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black uppercase tracking-wide">
                  Pari Validé !
                </span>
                {voteLoading && (
                  <LoaderCircle
                    className="h-5 w-5 animate-spin opacity-50"
                    aria-hidden
                  />
                )}
              </div>
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

function BinaryButtons({
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
  const pct = computePct(poolOdds, ["oui", "non"]);
  const ouiPct = pct["oui"] ?? 50;
  const nonPct = pct["non"] ?? 50;
  const totalInJeu = (poolStaked["oui"] ?? 0) + (poolStaked["non"] ?? 0);

  return (
    <div className="flex flex-col gap-3">
      {/* Barre OUI/NON */}
      <div className="flex flex-col gap-1.5">
        <div
          className="flex h-3 overflow-hidden rounded-full"
          role="img"
          aria-label={`${ouiPct}% OUI, ${nonPct}% NON`}
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
            {ouiPct}% OUI
          </span>
          <span className="text-[10px] font-semibold text-zinc-500">
            {totalInJeu > 0
              ? `${totalInJeu.toLocaleString("fr-FR")} 🪙 en jeu`
              : "Aucune mise"}
          </span>
          <span className="text-xs font-black text-red-400">{nonPct}% NON</span>
        </div>
      </div>

      {/* Boutons OUI / NON */}
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
                  {/* Multiplier caché mais disponible pour le backend */}
                  <span className="sr-only">cote ×{odd.toFixed(2)}</span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const OPTION_COLORS = [
  "border-violet-500/60 bg-violet-500/10 hover:border-violet-500 hover:bg-violet-500/20 text-violet-400",
  "border-blue-500/60 bg-blue-500/10 hover:border-blue-500 hover:bg-blue-500/20 text-blue-400",
  "border-cyan-500/60 bg-cyan-500/10 hover:border-cyan-500 hover:bg-cyan-500/20 text-cyan-400",
  "border-teal-500/60 bg-teal-500/10 hover:border-teal-500 hover:bg-teal-500/20 text-teal-400",
  "border-amber-500/60 bg-amber-500/10 hover:border-amber-500 hover:bg-amber-500/20 text-amber-400",
  "border-red-500/60 bg-red-500/10 hover:border-red-500 hover:bg-red-500/20 text-red-400",
];

function StoppageButtons({
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
