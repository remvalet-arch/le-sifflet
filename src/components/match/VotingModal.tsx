"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { LoaderCircle, X, Swords } from "lucide-react";
import { computeCurrentOdds } from "@/lib/constants/odds";
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

type Props = {
  event: MarketEventRow;
  siffletsBalance: number;
  onClose: () => void;
  onBetSuccess: (amountStaked: number) => void;
  roomId?: string | null;
};

export function VotingModal({ event, siffletsBalance, onClose, onBetSuccess, roomId }: Props) {
  // ── Timer & cotes ──────────────────────────────────────────────────────────
  const [odds, setOdds] = useState(() => computeCurrentOdds(event.type, event.created_at));
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setOdds(computeCurrentOdds(event.type, event.created_at));
      setFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlash(false), 350);
    }, 1000);
    return () => {
      clearInterval(id);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [event.type, event.created_at]);

  const secondsLeft = Math.max(0, 90 - odds.elapsed);
  const expired = odds.expired || secondsLeft === 0;
  const timerPct = (secondsLeft / 90) * 100;
  const timerColor = secondsLeft > 45 ? "bg-green-500" : secondsLeft > 15 ? "bg-yellow-400" : "bg-red-500";
  const isDecaying = odds.elapsed > 10 && !expired;

  // ── Amount — défaut 10 % du solde (min 10) ─────────────────────────────────
  const canBet = siffletsBalance >= 10;
  const half = Math.max(10, Math.floor(siffletsBalance / 2));
  const defaultAmount = Math.min(Math.max(10, Math.floor(siffletsBalance * 0.1)), siffletsBalance);
  const [amount, setAmount] = useState(defaultAmount);

  function clamp(v: number) { return Math.min(Math.max(10, v), siffletsBalance); }

  // ── Submit one-tap ─────────────────────────────────────────────────────────
  const [voteLoading, setVoteLoading] = useState<"oui" | "non" | null>(null);

  async function handleVote(v: "oui" | "non") {
    if (voteLoading || expired || !canBet) return;
    const staked = clamp(amount);
    const multiplier = odds[v];
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
          room_id: roomId ?? null,
        }),
      });
      const json = (await res.json()) as { ok: boolean; data?: unknown; error?: string };
      if (!res.ok) { toast.error(json.error ?? "Erreur inattendue"); return; }
      toast.success("Pari enregistré !");
      onBetSuccess(staked);
      onClose();
    } catch {
      toast.error("Connexion perdue, réessaie !");
    } finally {
      setVoteLoading(null);
    }
  }

  const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.penalty_check;

  return (
    <div className="animate-modal-backdrop fixed inset-0 z-[60] flex items-end justify-center bg-black/75 px-4 pb-24 pt-4 backdrop-blur-sm sm:items-center sm:pb-4">
      <div className="animate-modal-sheet w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl sm:animate-modal-center">
        <div className="px-6 pb-6 pt-5">

          {/* Header */}
          <div className="mb-4 flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{cfg.emoji}</span>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Décision en cours</p>
                  {roomId && (
                    <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-400">
                      <Swords className="h-2.5 w-2.5" />
                      Braquage
                    </span>
                  )}
                </div>
                <p className="text-lg font-black text-white">{cfg.question}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Passer"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-zinc-500 transition hover:bg-zinc-700 hover:text-white active:scale-90"
            >
              <X className="h-4 w-4" />
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
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
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
              onChange={(e) => setAmount(clamp(parseInt(e.target.value)))}
              disabled={!canBet || expired}
              className="w-full accent-green-500 disabled:opacity-40"
            />
          </div>

          {/* OUI / NON — one-tap */}
          <div className="grid grid-cols-2 gap-3">
            {(["oui", "non"] as const).map((v) => {
              const odd = odds[v];
              const gain = Math.floor(amount * odd);
              const isLoading = voteLoading === v;
              const label = v === "oui" ? cfg.yes : cfg.no;
              return (
                <button
                  key={v}
                  onClick={() => { void handleVote(v); }}
                  disabled={!!voteLoading || expired || !canBet}
                  className={`flex h-24 flex-col items-center justify-center gap-1 rounded-2xl border-2 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
                    v === "oui"
                      ? "border-green-500/60 bg-green-500/10 hover:border-green-500 hover:bg-green-500/20"
                      : "border-blue-500/60 bg-blue-500/10 hover:border-blue-500 hover:bg-blue-500/20"
                  }`}
                >
                  {isLoading ? (
                    <LoaderCircle className="h-6 w-6 animate-spin text-white" />
                  ) : (
                    <>
                      <span className="text-xl font-black uppercase tracking-wide text-white">
                        {label}
                      </span>
                      <span
                        className={`text-sm font-black tabular-nums transition-colors ${
                          isDecaying && flash
                            ? "text-yellow-400"
                            : v === "oui" ? "text-green-400" : "text-blue-400"
                        }`}
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

          {!canBet && !expired && (
            <p className="mt-3 text-center text-xs font-bold text-red-400">
              Solde insuffisant (min. 10 pts)
            </p>
          )}

          {expired && (
            <button
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
