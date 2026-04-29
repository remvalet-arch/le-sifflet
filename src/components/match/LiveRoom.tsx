"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  AlertActionType,
  BetRow,
  MatchRow,
  MarketEventRow,
} from "@/types/database";
import { VotingModal } from "./VotingModal";

const ALERTS: {
  type: AlertActionType;
  emoji: string;
  label: string;
  color: string;
}[] = [
  {
    type: "penalty_check",
    emoji: "📢",
    label: "Y'A PÉNO LÀ !!",
    color:
      "border-red-500/50 hover:border-red-400 hover:bg-red-950/40 active:bg-red-900/50",
  },
  {
    type: "penalty_outcome",
    emoji: "🥅",
    label: "PÉNO : AU FOND OU PAS ?",
    color:
      "border-emerald-500/50 hover:border-emerald-400 hover:bg-emerald-950/40 active:bg-emerald-900/50",
  },
  {
    type: "var_goal",
    emoji: "🚩",
    label: "HORS-JEU / BUT ANNULÉ ?",
    color:
      "border-blue-400/50 hover:border-blue-300 hover:bg-blue-950/40 active:bg-blue-900/50",
  },
  {
    type: "red_card",
    emoji: "🟥",
    label: "SORTEZ LE ROUGE !",
    color:
      "border-red-700/60 hover:border-red-500 hover:bg-red-950/50 active:bg-red-900/60",
  },
  {
    type: "injury_sub",
    emoji: "🚑",
    label: "CINÉMA OU CIVIÈRE ?",
    color:
      "border-orange-400/50 hover:border-orange-300 hover:bg-orange-950/40 active:bg-orange-900/50",
  },
];

type Props = { match: MatchRow; siffletsBalance: number; userId: string };

export function LiveRoom({ match, siffletsBalance, userId }: Props) {
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(() =>
    match.alert_cooldown_until ? new Date(match.alert_cooldown_until) : null,
  );
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (!match.alert_cooldown_until) return 0;
    return Math.max(
      0,
      Math.ceil(
        (new Date(match.alert_cooldown_until).getTime() - Date.now()) / 1000,
      ),
    );
  });
  const [pendingType, setPendingType] = useState<AlertActionType | null>(null);
  const [signaledTypes, setSignaledTypes] = useState<Set<AlertActionType>>(
    () => new Set(),
  );
  const signaledTimers = useRef<
    Partial<Record<AlertActionType, ReturnType<typeof setTimeout>>>
  >({});
  const [activeEvent, setActiveEvent] = useState<MarketEventRow | null>(null);
  const [localBalance, setLocalBalance] = useState(siffletsBalance);

  function markAsSignaled(type: AlertActionType) {
    setSignaledTypes((prev) => new Set([...prev, type]));
    clearTimeout(signaledTimers.current[type]);
    signaledTimers.current[type] = setTimeout(() => {
      setSignaledTypes((prev) => {
        const next = new Set(prev);
        next.delete(type);
        return next;
      });
    }, 30_000);
  }

  // Cooldown countdown
  useEffect(() => {
    const tick = () => {
      if (!cooldownUntil) {
        setSecondsLeft(0);
        return;
      }
      const s = Math.max(
        0,
        Math.ceil((cooldownUntil.getTime() - Date.now()) / 1000),
      );
      setSecondsLeft(s);
      if (s === 0) setCooldownUntil(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  // Event 'open' déjà actif à l'arrivée sur la page (joueur en retard)
  useEffect(() => {
    const supabase = createClient();
    const since = new Date(Date.now() - 90_000).toISOString();
    supabase
      .from("market_events")
      .select("*")
      .eq("match_id", match.id)
      .eq("status", "open")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setActiveEvent(data);
      });
  }, [match.id]);

  // Realtime : cooldown + events de marché + résultat des paris
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`match-room-${match.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${match.id}`,
        },
        (payload) => {
          if (process.env.NODE_ENV === "development") {
            console.log("[Realtime] matches UPDATE", payload.new);
          }
          const updated = payload.new as MatchRow;
          setCooldownUntil(
            updated?.alert_cooldown_until
              ? new Date(updated.alert_cooldown_until)
              : null,
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "market_events",
          filter: `match_id=eq.${match.id}`,
        },
        (payload) => {
          if (process.env.NODE_ENV === "development") {
            console.log("[Realtime] market_events INSERT", payload.new);
          }
          const event = payload.new as MarketEventRow;
          if (event?.status === "open") setActiveEvent(event);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "market_events",
          filter: `match_id=eq.${match.id}`,
        },
        (payload) => {
          const event = payload.new as MarketEventRow;
          if (event?.status === "resolved") {
            setActiveEvent((prev) => {
              if (prev?.id === event.id) {
                toast.info("L'arbitre a tranché — résultat en cours…");
                return null;
              }
              return prev;
            });
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "bets",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const bet = payload.new as BetRow;
          if (bet.status === "won") {
            const reward = Math.round(Number(bet.potential_reward));
            setLocalBalance((b) => b + reward);
            toast.success(
              `Pari gagné ! +${reward.toLocaleString("fr-FR")} Sifflets 🎉`,
            );
          } else if (bet.status === "lost") {
            toast.error("Pari perdu… Meilleure chance la prochaine fois !");
          }
        },
      )
      .subscribe((status, err) => {
        if (process.env.NODE_ENV === "development") {
          console.log(`[Realtime] match-room-${match.id}:`, status, err ?? "");
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [match.id, userId]);

  const isOnCooldown = secondsLeft > 0;

  async function handleAlert(type: AlertActionType) {
    if (isOnCooldown || pendingType || signaledTypes.has(type)) return;
    setPendingType(type);
    try {
      const res = await fetch("/api/alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: match.id, action_type: type }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { cooldown_until: string | null };
        error?: string;
      };

      if (!res.ok) {
        toast.error(json.error ?? "Erreur inattendue");
        return;
      }
      markAsSignaled(type);
      toast.success("Signal envoyé ! En attente d'autres confirmations…");
      if (json.data?.cooldown_until) {
        setCooldownUntil(new Date(json.data.cooldown_until));
      }
    } catch {
      toast.error("Connexion perdue, réessaie !");
    } finally {
      setPendingType(null);
    }
  }

  const mins = Math.floor(secondsLeft / 60);
  const secs = String(secondsLeft % 60).padStart(2, "0");

  return (
    <>
      <section className="mt-6 flex flex-col items-center gap-5 px-2">
        {isOnCooldown ? (
          <div className="flex w-full flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-6 py-8 text-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-whistle" />
            <p className="text-lg font-black uppercase tracking-wide text-white">
              L&apos;arbitre consulte la VAR…
            </p>
            <p className="text-sm text-green-100/70">
              Retour dans{" "}
              <span className="font-bold text-whistle">
                {mins}:{secs}
              </span>
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-widest text-green-100/50">
              T&apos;as vu quelque chose ?
            </p>
            <div className="flex w-full flex-col gap-2.5">
              {ALERTS.map(({ type, emoji, label, color }) => {
                const isPending = pendingType === type;
                const isSignaled = signaledTypes.has(type);
                return (
                  <button
                    key={type}
                    onClick={() => handleAlert(type)}
                    disabled={!!pendingType || isSignaled}
                    className={`flex h-[68px] w-full items-center gap-4 rounded-2xl border-2 bg-black/30 px-5 text-left shadow-md transition-all active:scale-[0.98] disabled:cursor-not-allowed ${
                      isSignaled
                        ? "border-whistle/50 bg-whistle/10 opacity-80"
                        : `disabled:opacity-60 ${color}`
                    }`}
                  >
                    <span className="shrink-0 text-2xl leading-none">
                      {isPending ? "" : isSignaled ? "⏳" : emoji}
                    </span>
                    {isPending ? (
                      <span className="flex items-center gap-2 text-sm font-semibold text-green-100/70">
                        <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" />
                        Envoi…
                      </span>
                    ) : isSignaled ? (
                      <span className="text-sm font-bold text-whistle">
                        Signal envoyé — En attente du kop…
                      </span>
                    ) : (
                      <span className="text-base font-black uppercase tracking-wide text-white">
                        {label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </section>

      {activeEvent && (
        <VotingModal
          event={activeEvent}
          siffletsBalance={localBalance}
          onClose={() => setActiveEvent(null)}
          onBetSuccess={(amount) => setLocalBalance((b) => b - amount)}
        />
      )}
    </>
  );
}
