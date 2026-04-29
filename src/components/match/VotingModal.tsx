"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Flag, Siren, Square, LoaderCircle } from "lucide-react";
import type { MarketEventRow, MarketEventType } from "@/types/database";

const EVENT_CONFIG: Record<
  MarketEventType,
  { question: string; Icon: React.ElementType }
> = {
  penalty: { question: "Il y a péno ?", Icon: Siren },
  offside: { question: "Hors-jeu confirmé ?", Icon: Flag },
  card: { question: "Carton mérité ?", Icon: Square },
};

function getMultiplierInfo(createdAt: string): {
  value: number;
  label: string;
} {
  const elapsed = Math.floor(
    (Date.now() - new Date(createdAt).getTime()) / 1000,
  );
  if (elapsed <= 10) return { value: 2.0, label: "⚡ Parie maintenant !" };
  if (elapsed <= 45) return { value: 1.5, label: "Cote standard" };
  return { value: 1.1, label: "Dernière chance" };
}

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
  const [secondsLeft, setSecondsLeft] = useState(() =>
    Math.max(
      0,
      90 -
        Math.floor((Date.now() - new Date(event.created_at).getTime()) / 1000),
    ),
  );
  const [multiplierInfo, setMultiplierInfo] = useState(() =>
    getMultiplierInfo(event.created_at),
  );
  const [vote, setVote] = useState<"oui" | "non" | null>(null);
  const [amount, setAmount] = useState(10);
  const [loading, setLoading] = useState(false);

  const expired = secondsLeft === 0;
  const cfg = EVENT_CONFIG[event.type] ?? EVENT_CONFIG.penalty;

  useEffect(() => {
    if (expired) return;
    const id = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - new Date(event.created_at).getTime()) / 1000,
      );
      setSecondsLeft(Math.max(0, 90 - elapsed));
      setMultiplierInfo(getMultiplierInfo(event.created_at));
    }, 1000);
    return () => clearInterval(id);
  }, [expired, event.created_at]);

  const timerColor =
    secondsLeft > 45
      ? "bg-pitch-600"
      : secondsLeft > 15
        ? "bg-whistle"
        : "bg-red-500";

  const clampedAmount = Math.min(Math.max(10, amount), siffletsBalance);
  const potentialReward = Math.floor(clampedAmount * multiplierInfo.value);

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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-4 backdrop-blur-sm sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/15 bg-pitch-900 shadow-2xl">
        <div className="px-6 pb-6 pt-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-whistle/15">
              <cfg.Icon className="h-5 w-5 text-whistle" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-whistle/80">
                Décision en cours
              </p>
              <p className="text-lg font-black text-white">{cfg.question}</p>
            </div>
          </div>

          {/* Timer */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
              <span className="text-green-100/60">Temps restant</span>
              <span className={expired ? "text-red-400 font-black" : "text-white"}>
                {expired ? "Votes clos" : `${secondsLeft}s`}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-[width] duration-1000 ease-linear ${timerColor}`}
                style={{ width: `${(secondsLeft / 90) * 100}%` }}
              />
            </div>
          </div>

          {/* OUI / NON */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            {(["oui", "non"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setVote(v)}
                disabled={expired || loading}
                className={`h-14 rounded-2xl border-2 text-lg font-black uppercase tracking-wide transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
                  vote === v
                    ? "border-whistle bg-whistle/20 text-whistle"
                    : "border-white/20 bg-black/20 text-white hover:border-white/40"
                }`}
              >
                {v === "oui" ? "✅ OUI" : "❌ NON"}
              </button>
            ))}
          </div>

          {/* Mise */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-bold text-green-100/80">
                Mise (Sifflets)
              </span>
              <span className="text-xs text-green-100/50">
                Solde&nbsp;: {siffletsBalance.toLocaleString("fr-FR")} pts
              </span>
            </div>
            <div className="flex gap-2">
              {[10, 50, 100].map((v) => (
                <button
                  key={v}
                  onClick={() => setAmount(Math.min(v, siffletsBalance))}
                  disabled={expired || loading || siffletsBalance < v}
                  className="h-9 flex-1 rounded-xl border border-white/20 bg-black/20 text-sm font-bold text-green-100 transition hover:border-whistle/50 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {v}
                </button>
              ))}
              <button
                onClick={() => setAmount(siffletsBalance)}
                disabled={expired || loading || siffletsBalance < 10}
                className="h-9 flex-1 rounded-xl border border-whistle/40 bg-black/20 text-sm font-bold text-whistle transition hover:bg-whistle/10 disabled:cursor-not-allowed disabled:opacity-30"
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
              className="mt-2 w-full rounded-xl border border-white/15 bg-black/20 px-4 py-2.5 text-center text-lg font-bold text-white focus:border-whistle/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-40"
            />
          </div>

          {/* Aperçu gain */}
          {!expired && vote && (
            <div className="mt-3 rounded-xl border border-whistle/30 bg-whistle/10 px-4 py-2.5 text-center">
              <p className="text-xs font-semibold text-whistle/80">
                {multiplierInfo.label} · ×{multiplierInfo.value.toFixed(1)}
              </p>
              <p className="text-base font-black text-whistle">
                Gain potentiel&nbsp;:{" "}
                {potentialReward.toLocaleString("fr-FR")} pts
              </p>
            </div>
          )}

          {/* Soumettre */}
          <button
            onClick={handleSubmit}
            disabled={!vote || loading || expired || clampedAmount < 10}
            className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-whistle font-black uppercase tracking-wide text-pitch-900 shadow-lg transition hover:bg-yellow-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
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
              className="mt-3 w-full rounded-2xl border border-white/15 py-3 text-sm font-bold text-green-100/70 transition hover:text-white"
            >
              Fermer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
