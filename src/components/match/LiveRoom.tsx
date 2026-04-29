"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Siren, Flag, Square, LoaderCircle } from "lucide-react";
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
  label: string;
  Icon: React.ElementType;
  color: string;
}[] = [
  {
    type: "penalty",
    label: "Péno ?",
    Icon: Siren,
    color: "border-red-500/60 hover:border-red-400 hover:bg-red-900/30",
  },
  {
    type: "offside",
    label: "Hors-jeu ?",
    Icon: Flag,
    color: "border-blue-400/60 hover:border-blue-300 hover:bg-blue-900/30",
  },
  {
    type: "card",
    label: "Carton ?",
    Icon: Square,
    color:
      "border-whistle/60 hover:border-whistle hover:bg-yellow-900/30 [&_svg]:fill-whistle [&_svg]:stroke-whistle",
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
  const [activeEvent, setActiveEvent] = useState<MarketEventRow | null>(null);
  const [localBalance, setLocalBalance] = useState(siffletsBalance);

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

  // Vérifie s'il y a un event 'open' déjà actif à l'arrivée sur la page
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
          if (event?.status !== "open") {
            setActiveEvent((prev) => (prev?.id === event?.id ? null : prev));
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
    if (isOnCooldown || pendingType) return;
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
      toast.success("Sifflet enregistré !");
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
      <section className="mt-6 flex flex-col items-center gap-6 px-2">
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
            <p className="text-sm font-semibold uppercase tracking-widest text-green-100/70">
              T&apos;as vu quelque chose ?
            </p>
            <div className="flex w-full flex-col gap-3">
              {ALERTS.map(({ type, label, Icon, color }) => {
                const loading = pendingType === type;
                return (
                  <button
                    key={type}
                    onClick={() => handleAlert(type)}
                    disabled={!!pendingType}
                    className={`flex h-20 w-full items-center justify-center gap-4 rounded-2xl border-2 bg-black/25 text-xl font-black uppercase tracking-wide text-white shadow-lg transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${color}`}
                  >
                    {loading ? (
                      <LoaderCircle className="h-6 w-6 animate-spin" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                    {label}
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
