"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type {
  AlertActionType,
  BetRow,
  MatchRow,
  MarketEventRow,
} from "@/types/database";
import { VotingModal } from "./VotingModal";
import { Scoreboard } from "./Scoreboard";
import { MatchTimeline } from "./MatchTimeline";
import { SoccerPitch } from "./SoccerPitch";
import { ActionDrawer } from "./ActionDrawer";

type Tab = "kop" | "compo";
type Props = {
  match: MatchRow;
  siffletsBalance: number;
  userId: string;
  isModerator: boolean;
};

export function LiveRoom({
  match,
  siffletsBalance,
  userId,
  isModerator,
}: Props) {
  const [liveMatch, setLiveMatch] = useState<MatchRow>(match);
  const [activeTab, setActiveTab] = useState<Tab>("kop");

  // Cooldown
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(() =>
    match.alert_cooldown_until ? new Date(match.alert_cooldown_until) : null,
  );
  const [cooldownSecs, setCooldownSecs] = useState(0);

  // Alert state
  const [pendingType, setPendingType] = useState<AlertActionType | null>(null);
  const [signaledTypes, setSignaledTypes] = useState<Set<AlertActionType>>(
    () => new Set(),
  );
  const signaledTimers = useRef<
    Partial<Record<AlertActionType, ReturnType<typeof setTimeout>>>
  >({});

  // Active betting event
  const [activeEvent, setActiveEvent] = useState<MarketEventRow | null>(null);
  const [localBalance, setLocalBalance] = useState(siffletsBalance);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Cooldown countdown
  useEffect(() => {
    const tick = () => {
      if (!cooldownUntil) { setCooldownSecs(0); return; }
      const s = Math.max(0, Math.ceil((cooldownUntil.getTime() - Date.now()) / 1000));
      setCooldownSecs(s);
      if (s === 0) setCooldownUntil(null);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  // Late-joiner: pick up any already-open event
  useEffect(() => {
    const supabase = createClient();
    const since = new Date(Date.now() - 90_000).toISOString();
    void supabase
      .from("market_events")
      .select("*")
      .eq("match_id", match.id)
      .eq("status", "open")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (data) setActiveEvent(data); });
  }, [match.id]);

  // Realtime subscriptions
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`match-room-${match.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "matches", filter: `id=eq.${match.id}` },
        (payload) => {
          const updated = payload.new as MatchRow;
          setLiveMatch(updated);
          setCooldownUntil(
            updated?.alert_cooldown_until
              ? new Date(updated.alert_cooldown_until)
              : null,
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "market_events", filter: `match_id=eq.${match.id}` },
        (payload) => {
          const event = payload.new as MarketEventRow;
          if (event?.status === "open") setActiveEvent(event);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "market_events", filter: `match_id=eq.${match.id}` },
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
        { event: "UPDATE", schema: "public", table: "bets", filter: `user_id=eq.${userId}` },
        (payload) => {
          const bet = payload.new as BetRow;
          if (bet.status === "won") {
            const reward = Math.round(Number(bet.potential_reward));
            setLocalBalance((b) => b + reward);
            toast.success(`Pari gagné ! +${reward.toLocaleString("fr-FR")} Sifflets 🎉`);
          } else if (bet.status === "lost") {
            toast.error("Pari perdu… Meilleure chance la prochaine fois !");
          }
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [match.id, userId]);

  // Écoute le Super Button de la BottomNav
  useEffect(() => {
    const open = () => setDrawerOpen(true);
    window.addEventListener("sifflet:open-drawer", open);
    return () => window.removeEventListener("sifflet:open-drawer", open);
  }, []);

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

  async function handleAlert(type: AlertActionType) {
    if (cooldownSecs > 0 || pendingType || signaledTypes.has(type)) return;
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
      if (!res.ok) { toast.error(json.error ?? "Erreur inattendue"); return; }
      markAsSignaled(type);
      toast.success("Signal envoyé ! En attente d'autres confirmations…");
      if (json.data?.cooldown_until) setCooldownUntil(new Date(json.data.cooldown_until));
    } catch {
      toast.error("Connexion perdue, réessaie !");
    } finally {
      setPendingType(null);
    }
  }

  const cooldownMins = Math.floor(cooldownSecs / 60);
  const cooldownSecsStr = String(cooldownSecs % 60).padStart(2, "0");

  return (
    <>
      {/* Scoreboard réactif */}
      <div className="mt-4">
        <Scoreboard match={liveMatch} />
      </div>

      {/* Tab switcher */}
      <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl bg-zinc-800/60 p-1">
        {(["kop", "compo"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`rounded-xl py-2.5 text-sm font-black uppercase tracking-wide transition ${
              activeTab === tab
                ? "bg-zinc-700 text-white shadow"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {tab === "kop" ? "Le Kop" : "Compos"}
          </button>
        ))}
      </div>

      {/* Contenu de l'onglet */}
      {activeTab === "kop" && <MatchTimeline matchId={liveMatch.id} />}
      {activeTab === "compo" && (
        <SoccerPitch
          matchId={liveMatch.id}
          teamHome={liveMatch.team_home}
          teamAway={liveMatch.team_away}
          homeTeamColor={liveMatch.home_team_color ?? undefined}
          awayTeamColor={liveMatch.away_team_color ?? undefined}
        />
      )}

      {/* Drawer d'action (ouvert par le Super Button de la BottomNav) */}
      <ActionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isModerator={isModerator}
        isOnCooldown={cooldownSecs > 0}
        cooldownMins={cooldownMins}
        cooldownSecs={cooldownSecsStr}
        pendingType={pendingType}
        signaledTypes={signaledTypes}
        onAlert={handleAlert}
        matchId={liveMatch.id}
        teamHome={liveMatch.team_home}
        teamAway={liveMatch.team_away}
      />

      {/* VotingModal paris */}
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
