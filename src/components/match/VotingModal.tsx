"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { LoaderCircle, X, Swords } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LIVE_BETTING_WINDOW_SECONDS } from "@/lib/constants/odds";
import type { MarketEventRow, MarketEventType } from "@/types/database";

const EVENT_CONFIG: Record<MarketEventType, { question: string; emoji: string; yes: string; no: string }> = {
  penalty_check:   { question: "Y'a pénalty là ?!",               emoji: "📢", yes: "OUI",    no: "NON"    },
  penalty_outcome: { question: "Péno accordé — il met au fond ?",  emoji: "🥅", yes: "AU FOND", no: "RATÉ"  },
  var_goal:        { question: "But confirmé par la VAR ?",        emoji: "🚩", yes: "BUT",    no: "ANNULÉ" },
  red_card:        { question: "Vilaine semelle — c'est rouge ?",  emoji: "🟥", yes: "ROUGE",  no: "JAUNE"  },
  injury_sub:      { question: "Cinéma ou civière ?",              emoji: "🚑", yes: "CIVIÈRE", no: "CINÉMA" },
  free_kick:       { question: "Coup franc à 20m — but dans 3 min ?", emoji: "🎯", yes: "OUI",  no: "NON"   },
  corner:          { question: "Corner tendu — but dans 3 min ?",  emoji: "🏁", yes: "OUI",    no: "NON"   },
};

type PoolOdds = { oui: number; non: number };

const DEFAULT_POOL: PoolOdds = { oui: 2, non: 2 };

type Props = {
  event: MarketEventRow;
  siffletsBalance: number;
  onClose: () => void;
  onBetSuccess: (amountStaked: number) => void;
  squadId?: string | null;
  squadName?: string | null;
};

function parseOddsRows(
  rows: { option: string; implied_multiplier: number }[] | null,
): PoolOdds {
  if (!rows?.length) return DEFAULT_POOL;
  let oui = DEFAULT_POOL.oui;
  let non = DEFAULT_POOL.non;
  for (const r of rows) {
    const m = Number(r.implied_multiplier);
    if (!Number.isFinite(m) || m < 1) continue;
    if (r.option === "oui") oui = m;
    if (r.option === "non") non = m;
  }
  return { oui, non };
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

export function VotingModal({
  event,
  siffletsBalance,
  onClose,
  onBetSuccess,
  squadId,
  squadName,
}: Props) {
  const supabase = createClient();
  const sheetRef = useRef<HTMLDivElement>(null);
  const titleId = `vote-title-${event.id}`;
  const descId = `vote-desc-${event.id}`;

  const [poolOdds, setPoolOdds] = useState<PoolOdds>(DEFAULT_POOL);
  const [oddsLoading, setOddsLoading] = useState(true);
  const [oddsFlash, setOddsFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshOdds = useCallback(async () => {
    const { data, error } = await supabase.rpc("get_event_odds", { p_event_id: event.id });
    if (error) {
      console.error("[VotingModal] get_event_odds", error.message);
      return;
    }
    const next = parseOddsRows(data ?? null);
    setPoolOdds((prev) => {
      if (prev.oui !== next.oui || prev.non !== next.non) {
        setOddsFlash(true);
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setOddsFlash(false), 280);
      }
      return next;
    });
    setOddsLoading(false);
  }, [event.id, supabase]);

  useEffect(() => {
    void refreshOdds();
    const id = setInterval(() => {
      void refreshOdds();
    }, 2000);
    return () => {
      clearInterval(id);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [refreshOdds]);

  const createdMs = useMemo(() => new Date(event.created_at).getTime(), [event.created_at]);
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
  const timerColor = secondsLeft > 45 ? "bg-green-500" : secondsLeft > 15 ? "bg-yellow-400" : "bg-red-500";

  const canBet = siffletsBalance >= 10;
  const half = Math.max(10, Math.floor(siffletsBalance / 2));
  const defaultAmount = Math.min(Math.max(10, Math.floor(siffletsBalance * 0.1)), siffletsBalance);
  const [amount, setAmount] = useState(defaultAmount);

  function clamp(v: number) {
    return Math.min(Math.max(10, v), siffletsBalance);
  }

  const [voteLoading, setVoteLoading] = useState<"oui" | "non" | null>(null);

  async function handleVote(v: "oui" | "non") {
    if (voteLoading || expired || !canBet || oddsLoading) return;
    const staked = clamp(amount);
    const multiplier = poolOdds[v];
    setVoteLoading(v);
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
        }),
      });
      const json = (await res.json()) as { ok: boolean; data?: unknown; error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Erreur inattendue");
        return;
      }
      toast.success("Pari enregistré !");
      onBetSuccess(staked);
      onClose();
    } catch {
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
        <div className="px-6 pb-6 pt-5">
          <p id={descId} className="sr-only">
            Parie des Sifflets sur une option. Cotes parimutuel en temps réel selon les mises des
            joueurs. Ferme avec Échap ou le bouton Passer.
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
                    <Swords className="mt-0.5 h-3 w-3 shrink-0 text-amber-400/90" aria-hidden />
                    <span className="line-clamp-2 min-w-0 font-medium">
                      Braquage actif avec{" "}
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
              aria-label="Fermer la fenêtre de pari"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-500 transition hover:bg-zinc-700 hover:text-white active:scale-90"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>

          {/* Timer */}
          <div className="mb-5">
            <div className="mb-1.5 flex justify-between text-xs font-semibold">
              <span className="text-zinc-500">Temps restant</span>
              <span className={expired ? "font-black text-red-400" : "text-white"}>
                {expired ? "Votes clos" : `${secondsLeft}s`}
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full bg-zinc-800"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={LIVE_BETTING_WINDOW_SECONDS}
              aria-valuenow={secondsLeft}
              aria-label="Temps restant pour parier"
            >
              <div
                className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${timerColor}`}
                style={{ width: `${timerPct}%` }}
              />
            </div>
          </div>

          {/* Amount */}
          <div className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-400">Engagement</span>
              <span className="text-sm font-black text-white">{amount.toLocaleString("fr-FR")} pts</span>
            </div>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {([["MIN", 10], ["MOITIÉ", half], ["ALL IN", siffletsBalance]] as const).map(([label, val]) => (
                <button
                  type="button"
                  key={label}
                  onClick={() => setAmount(val)}
                  disabled={!canBet || expired}
                  className={`h-10 rounded-xl border text-sm font-bold transition disabled:opacity-30 ${
                    amount === val
                      ? "border-green-500/50 bg-green-500/20 text-green-400"
                      : "border-zinc-700 bg-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <input
              type="range"
              min={10}
              max={Math.max(10, siffletsBalance)}
              step={10}
              value={amount}
              onChange={(e) => setAmount(clamp(parseInt(e.target.value, 10)))}
              disabled={!canBet || expired}
              aria-label="Montant du pari en points"
              className="w-full accent-green-500 disabled:opacity-40"
            />
          </div>

          {/* OUI / NON — one-tap */}
          <div className="grid grid-cols-2 gap-3" aria-busy={oddsLoading}>
            {(["oui", "non"] as const).map((v) => {
              const odd = poolOdds[v];
              const gain = Math.floor(amount * odd);
              const isLoading = voteLoading === v;
              const label = v === "oui" ? cfg.yes : cfg.no;
              return (
                <button
                  type="button"
                  key={v}
                  onClick={() => {
                    void handleVote(v);
                  }}
                  disabled={!!voteLoading || expired || !canBet || oddsLoading}
                  aria-label={`${label}, cote ${odd.toFixed(2)}, gain potentiel environ ${gain} points`}
                  className={`flex h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
                    v === "oui"
                      ? "border-green-500/60 bg-green-500/10 hover:border-green-500 hover:bg-green-500/20"
                      : "border-blue-500/60 bg-blue-500/10 hover:border-blue-500 hover:bg-blue-500/20"
                  }`}
                >
                  {isLoading ? (
                    <LoaderCircle className="h-6 w-6 animate-spin text-white" aria-hidden />
                  ) : (
                    <>
                      <span className="text-xl font-black uppercase tracking-wide text-white">{label}</span>
                      <span
                        className={`text-sm font-black tabular-nums transition-colors ${
                          oddsFlash ? "text-yellow-400" : v === "oui" ? "text-green-400" : "text-blue-400"
                        }`}
                        aria-live="polite"
                      >
                        ×{odd.toFixed(2)}
                      </span>
                      <span className={`text-xs font-bold ${v === "oui" ? "text-green-500/70" : "text-blue-500/70"}`}>
                        +{gain.toLocaleString("fr-FR")} pts
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          <p className="mt-2 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
            Cotes parimutuel (masse des mises)
          </p>

          {!canBet && !expired && (
            <p className="mt-3 text-center text-xs font-bold text-red-400">
              Solde insuffisant (min. 10 pts)
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
