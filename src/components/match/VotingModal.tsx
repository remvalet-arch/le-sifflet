"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { LoaderCircle, Users, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { computeCurrentOdds } from "@/lib/constants/odds";
import type { MarketEventRow, MarketEventType } from "@/types/database";

const EVENT_CONFIG: Record<
  MarketEventType,
  { question: string; emoji: string }
> = {
  penalty_check:   { question: "Il y a péno là ?!",           emoji: "📢" },
  penalty_outcome: { question: "Péno : au fond ou pas ?",      emoji: "🥅" },
  var_goal:        { question: "But annulé ?",                  emoji: "🚩" },
  red_card:        { question: "Sortez le rouge !",             emoji: "🟥" },
  injury_sub:      { question: "Cinéma ou civière ?",           emoji: "🚑" },
};

type Props = {
  event: MarketEventRow;
  siffletsBalance: number;
  onClose: () => void;
  onBetSuccess: (amountStaked: number) => void;
};

export function VotingModal({
  event,
  siffletsBalance,
  onClose,
  onBetSuccess,
}: Props) {
  // ── Timer & cotes ──────────────────────────────────────────────────────────
  const [odds, setOdds] = useState(() =>
    computeCurrentOdds(event.type, event.created_at),
  );
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setOdds(computeCurrentOdds(event.type, event.created_at));
      if (!flash) {
        setFlash(true);
        if (flashTimer.current) clearTimeout(flashTimer.current);
        flashTimer.current = setTimeout(() => setFlash(false), 350);
      }
    }, 1000);
    return () => {
      clearInterval(id);
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [event.type, event.created_at, flash]);

  const secondsLeft = Math.max(0, 90 - odds.elapsed);

  // ── Initiateurs ────────────────────────────────────────────────────────────
  const [initiatorNames, setInitiatorNames] = useState<string[]>([]);

  useEffect(() => {
    if (!event.initiators?.length) return;
    const supabase = createClient();
    supabase
      .from("profiles")
      .select("username")
      .in("id", event.initiators)
      .then(({ data }) => {
        setInitiatorNames((data ?? []).map((p) => p.username));
      });
  }, [event.initiators]);

  // ── Compteur de parieurs ────────────────────────────────────────────────────
  const [betCount, setBetCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("bets")
      .select("id", { count: "exact", head: true })
      .eq("event_id", event.id)
      .then(({ count }) => setBetCount(count ?? 0));

    const channel = supabase
      .channel(`bet-count-${event.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bets", filter: `event_id=eq.${event.id}` },
        () => setBetCount((n) => n + 1),
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [event.id]);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [vote, setVote] = useState<"oui" | "non" | null>(null);
  const [amount, setAmount] = useState(10);
  const [loading, setLoading] = useState(false);

  const expired = odds.expired || secondsLeft === 0;
  const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.penalty_check;
  const clampedAmount = Math.min(Math.max(10, amount), siffletsBalance);
  const currentMultiplier = vote ? odds[vote] : 1;
  const potentialReward = Math.floor(clampedAmount * currentMultiplier);

  const isDecaying = odds.elapsed > 10 && !expired;
  const timerPct = (secondsLeft / 90) * 100;
  const timerColor =
    secondsLeft > 45 ? "bg-green-500" : secondsLeft > 15 ? "bg-yellow-400" : "bg-red-500";

  // ── Submit ──────────────────────────────────────────────────────────────────
  async function handleSubmit() {
    if (!vote || loading || expired) return;
    if (siffletsBalance < 10) {
      toast.error("Solde insuffisant (min. 10 pts)");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/bet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          chosen_option: vote,
          amount_staked: clampedAmount,
          multiplier: currentMultiplier,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: unknown;
        error?: string;
      };

      if (!res.ok) {
        toast.error(json.error ?? "Erreur inattendue");
        return;
      }

      toast.success("Pari enregistré !");
      onBetSuccess(clampedAmount);
      onClose();
    } catch {
      toast.error("Connexion perdue, réessaie !");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="animate-modal-backdrop fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center">
      <div className="animate-modal-sheet w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl sm:animate-modal-center">
        <div className="px-6 pb-6 pt-5">

          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{cfg.emoji}</span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                  Décision en cours
                </p>
                <p className="text-lg font-black text-white">{cfg.question}</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {betCount > 0 && (
                <div className="flex items-center gap-1 rounded-full border border-white/10 bg-zinc-800 px-2.5 py-1 text-xs font-bold text-zinc-400">
                  <Users className="h-3 w-3" />
                  {betCount}
                </div>
              )}
              {/* Toujours visible — permet de passer sans parier */}
              <button
                onClick={onClose}
                aria-label="Passer ce vote"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-500 transition hover:bg-zinc-700 hover:text-white active:scale-90"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Initiateurs */}
          {initiatorNames.length > 0 && (
            <p className="mt-2 text-xs text-zinc-600">
              Signalé par{" "}
              <span className="font-semibold text-zinc-400">
                {initiatorNames.join(", ")}
              </span>
            </p>
          )}

          {/* Timer */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
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

          {/* OUI / NON avec cotes FOMO */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            {(["oui", "non"] as const).map((v) => {
              const odd = odds[v];
              const selected = vote === v;
              return (
                <button
                  key={v}
                  onClick={() => setVote(v)}
                  disabled={expired || loading}
                  className={`flex h-16 flex-col items-center justify-center rounded-2xl border-2 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
                    selected
                      ? "border-green-500 bg-green-500/15 text-green-400"
                      : "border-white/15 bg-zinc-800 text-white hover:border-white/30"
                  }`}
                >
                  <span className="text-base font-black uppercase tracking-wide">
                    {v === "oui" ? "OUI" : "NON"}
                  </span>
                  <span
                    className={`text-sm font-black tabular-nums transition-colors duration-300 ${
                      isDecaying && flash
                        ? "text-yellow-400"
                        : selected
                          ? "text-green-400"
                          : "text-zinc-400"
                    }`}
                  >
                    ×{odd.toFixed(2)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mise */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-zinc-400">
                Mise (Sifflets)
              </span>
              <span className="text-xs text-zinc-600">
                Solde : {siffletsBalance.toLocaleString("fr-FR")} pts
              </span>
            </div>
            <div className="flex gap-2">
              {[10, 50, 100].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(Math.min(v, siffletsBalance))}
                  disabled={expired || loading || siffletsBalance < v}
                  className="h-11 flex-1 rounded-xl border border-white/15 bg-zinc-800 text-sm font-bold text-zinc-300 transition hover:border-green-500/30 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {v}
                </button>
              ))}
              <button
                onClick={() => setAmount(siffletsBalance)}
                disabled={expired || loading || siffletsBalance < 10}
                className="h-11 flex-1 rounded-xl border border-green-500/30 bg-zinc-800 text-sm font-bold text-green-400 transition hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-30"
              >
                MAX
              </button>
            </div>
            <input
              type="number"
              inputMode="numeric"
              min={10}
              max={siffletsBalance}
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              disabled={expired || loading}
              className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-2.5 text-center text-lg font-black text-white focus:border-green-500/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
            />
          </div>

          {/* Aperçu gain */}
          {!expired && vote && (
            <div className="mt-3 rounded-xl border border-green-500/20 bg-green-500/5 px-4 py-2.5 text-center">
              <p className="text-xs font-semibold text-green-400/70">
                ×{currentMultiplier.toFixed(2)}{isDecaying ? " · cote en baisse" : ""}
              </p>
              <p className="text-base font-black text-green-400">
                Gain potentiel : {potentialReward.toLocaleString("fr-FR")} pts
              </p>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!vote || loading || expired || clampedAmount < 10}
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-green-500 font-black uppercase tracking-wide text-zinc-950 shadow-md transition hover:bg-green-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {loading ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              "Valider mon pari →"
            )}
          </button>

          {expired && (
            <button
              onClick={onClose}
              className="mt-3 w-full rounded-2xl border border-white/10 py-3 text-sm font-bold text-zinc-500 transition hover:text-white"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
