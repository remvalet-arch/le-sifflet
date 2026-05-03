"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
import { MatchLineups } from "./MatchLineups";
import { ActionDrawer } from "./ActionDrawer";
import { MatchStats } from "./MatchStats";
import { PolymarketTab } from "./PolymarketTab";
import { LeaguePanel } from "./LeaguePanel";

type Tab = "kop" | "compo" | "stats" | "pronos" | "ligue";
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
  const isUpcoming = liveMatch.status === "upcoming";
  const [activeTab, setActiveTab] = useState<Tab>(() =>
    match.status === "upcoming" ? "pronos" : "kop",
  );

  // Si le match démarre alors que l'utilisateur est sur "pronos", on retombe sur "kop"
  const displayedTab: Tab = activeTab === "pronos" && !isUpcoming ? "kop" : activeTab;

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

  // Room active pour ce match (Braquage)
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const handleRoomChange = useCallback((roomId: string | null) => {
    setActiveRoomId(roomId);
  }, []);

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
            toast.success(`Prédiction juste ! +${reward.toLocaleString("fr-FR")} Pts 🎉`);
          } else if (bet.status === "lost") {
            toast.error("Pari perdu… Meilleure chance la prochaine fois !");
          }
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [match.id, userId]);

  // Signale à la BottomNav que le Super Button doit être affiché
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("sifflet:drawer-available", { detail: { enabled: true } }));
    return () => {
      window.dispatchEvent(new CustomEvent("sifflet:drawer-available", { detail: { enabled: false } }));
    };
  }, []);

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

  const cooldownMins    = Math.floor(cooldownSecs / 60);
  const cooldownSecsStr = String(cooldownSecs % 60).padStart(2, "0");

  const TABS: { id: Tab; label: string; badge?: boolean }[] = [
    { id: "kop",   label: "Kop"   },
    { id: "compo", label: "Compo" },
    { id: isUpcoming ? "pronos" : "stats", label: isUpcoming ? "Pronos" : "Stats" },
    { id: "ligue", label: "Ligue", badge: !!activeRoomId },
  ];

  return (
    <>
      {/* En-tête sticky : scoreboard + onglets */}
      <div
        className="sticky z-40 -mx-4 bg-zinc-950/95 backdrop-blur-md"
        style={{ top: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}
      >
        <Scoreboard
          key={`${liveMatch.status}-${liveMatch.match_minute ?? ""}-${liveMatch.home_score}-${liveMatch.away_score}`}
          match={liveMatch}
        />

        {/* Onglets style Google — underline indicator */}
        <div className="flex border-b border-white/8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-1 min-h-[44px] items-center justify-center gap-1 text-xs font-black uppercase tracking-wide transition-colors ${
                displayedTab === tab.id ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
              {tab.badge && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              )}
              {displayedTab === tab.id && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-t-full bg-green-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu de l'onglet */}
      {displayedTab === "kop" && (
        <MatchTimeline
          matchId={liveMatch.id}
          isModerator={isModerator}
          matchStatus={liveMatch.status}
        />
      )}
      {displayedTab === "compo" && (
        <MatchLineups
          matchId={liveMatch.id}
          teamHome={liveMatch.team_home}
          teamAway={liveMatch.team_away}
          homeTeamId={liveMatch.home_team_id}
          awayTeamId={liveMatch.away_team_id}
          homeTeamLogo={liveMatch.home_team_logo}
          awayTeamLogo={liveMatch.away_team_logo}
          homeTeamColor={liveMatch.home_team_color}
          awayTeamColor={liveMatch.away_team_color}
        />
      )}
      {displayedTab === "stats" && (
        <MatchStats
          matchId={liveMatch.id}
          homeTeamId={liveMatch.home_team_id}
          awayTeamId={liveMatch.away_team_id}
          teamHome={liveMatch.team_home}
          teamAway={liveMatch.team_away}
          homeTeamLogo={liveMatch.home_team_logo}
          awayTeamLogo={liveMatch.away_team_logo}
          matchStatus={liveMatch.status}
        />
      )}
      {displayedTab === "pronos" && (
        <PolymarketTab
          matchId={liveMatch.id}
          teamHome={liveMatch.team_home}
          teamAway={liveMatch.team_away}
          homeTeamLogo={liveMatch.home_team_logo}
          awayTeamLogo={liveMatch.away_team_logo}
        />
      )}
      {displayedTab === "ligue" && (
        <LeaguePanel
          matchId={liveMatch.id}
          userId={userId}
          onRoomChange={handleRoomChange}
        />
      )}

      {/* Drawer d'action */}
      <ActionDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        isModerator={isModerator}
        matchStatus={liveMatch.status}
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
          roomId={activeRoomId}
          onClose={() => setActiveEvent(null)}
          onBetSuccess={(amount) => setLocalBalance((b) => b - amount)}
        />
      )}
    </>
  );
}
