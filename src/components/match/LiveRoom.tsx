"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Siren, WifiOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLiveRoom } from "@/contexts/LiveRoomContext";
import type {
  AlertActionType,
  BetRow,
  MatchRow,
  MarketEventRow,
  MarketEventType,
} from "@/types/database";
import { VotingModal } from "./VotingModal";
import { VerdictOverlay } from "./VerdictOverlay";
import { Scoreboard } from "./Scoreboard";
import { MatchTimeline } from "./MatchTimeline";
import { MatchLineups } from "./MatchLineups";
import { ActionDrawer } from "./ActionDrawer";
import { MatchStats } from "./MatchStats";
import { MatchNotificationBell } from "./MatchNotificationBell";
import { LeaguePronosList } from "./LeaguePronosList";
import { LiveRoomTutorial } from "./LiveRoomTutorial";
import { useActiveSquad } from "@/hooks/useActiveSquad";
import { FriendPronoHints } from "./FriendPronoHints";

export type SquadProno = {
  user_id: string;
  prono_type: "exact_score" | "scorer" | "scorer_allocation";
  prono_value: string;
  points_earned: number;
  profiles: { username: string; avatar_url: string | null } | null;
};

type Tab = "kop" | "compo" | "stats" | "vestiaire";

export type LiveRoomMatchRow = MatchRow & {
  home_team?: {
    color_primary: string | null;
    color_secondary: string | null;
  } | null;
  away_team?: {
    color_primary: string | null;
    color_secondary: string | null;
  } | null;
};

type Props = {
  match: LiveRoomMatchRow;
  siffletsBalance: number;
  userId: string;
  username?: string;
  isModerator: boolean;
  squadPronos: SquadProno[];
};

export function LiveRoom({
  match,
  siffletsBalance,
  userId,
  username,
  isModerator,
  squadPronos,
}: Props) {
  const [liveMatch, setLiveMatch] = useState<LiveRoomMatchRow>(match);
  const [activeTab, setActiveTab] = useState<Tab>("kop");

  const displayedTab: Tab = activeTab;

  // Audience temps réel (Sprint Q)
  const [audienceCount, setAudienceCount] = useState(0);

  // Cooldown
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(() =>
    match.alert_cooldown_until ? new Date(match.alert_cooldown_until) : null,
  );
  const [cooldownSecs, setCooldownSecs] = useState(0);

  // Sirène VAR (panic button)
  const [sirenLoading, setSirenLoading] = useState(false);
  const [sirenCooldownUntil, setSirenCooldownUntil] = useState<Date | null>(
    null,
  );

  async function handleVarAlert() {
    if (sirenLoading || (sirenCooldownUntil && sirenCooldownUntil > new Date()))
      return;
    setSirenLoading(true);
    try {
      const res = await fetch("/api/squads/var-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: liveMatch.id }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { sent_count: number };
        error?: string;
      };
      if (!json.ok) {
        toast.error(json.error ?? "Impossible d'envoyer la sirène");
      } else {
        const n = json.data?.sent_count ?? 0;
        toast.success(
          n > 0
            ? `Sirène envoyée à ${n} coéquipier${n > 1 ? "s" : ""} 🚨`
            : "Personne à appeler pour l'instant.",
        );
        setSirenCooldownUntil(new Date(Date.now() + 15 * 60 * 1000));
      }
    } catch {
      toast.error("Connexion perdue");
    } finally {
      setSirenLoading(false);
    }
  }

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

  // Verdict overlay (INSP4-3)
  type VerdictState = {
    eventType: MarketEventType;
    eventId: string;
    won: boolean;
    reward: number;
  };
  const [verdictOverlay, setVerdictOverlay] = useState<VerdictState | null>(
    null,
  );
  const lastResolvedMeta = useRef<{
    eventId: string;
    eventType: MarketEventType;
  } | null>(null);

  useEffect(() => {
    if (localBalance < 10) {
      void fetch("/api/claim-rsa", { method: "POST" })
        .then((res) => {
          if (res.status === 429) return null;
          return res.json() as Promise<{
            ok: boolean;
            data?: { new_balance: number };
          }>;
        })
        .then((json) => {
          if (json?.ok && json.data) {
            setLocalBalance(json.data.new_balance);
            toast.success(
              "L'arbitre te fait une fleur, revoilà 50 Sifflets 💸",
            );
          }
        });
    }
  }, [localBalance]);

  const { squadId, squadName } = useActiveSquad();
  const { setDrawerAvailable, registerOpenDrawer } = useLiveRoom();

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(true);

  // Cooldown countdown
  useEffect(() => {
    const tick = () => {
      if (!cooldownUntil) {
        setCooldownSecs(0);
        return;
      }
      const s = Math.max(
        0,
        Math.ceil((cooldownUntil.getTime() - Date.now()) / 1000),
      );
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
      .then(({ data }) => {
        if (data) setActiveEvent(data);
      });
  }, [match.id]);

  // Sprint Q : présence + compteur d'audience
  useEffect(() => {
    const supabase = createClient();

    async function pingPresence() {
      await supabase.from("match_presence").upsert(
        {
          match_id: match.id,
          user_id: userId,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "match_id,user_id" },
      );
    }

    async function fetchAudience() {
      const { data } = await supabase.rpc("count_active_users_on_match", {
        p_match_id: match.id,
        p_window_minutes: 5,
      });
      if (typeof data === "number") {
        setTimeout(() => setAudienceCount(data), 0);
      }
    }

    void pingPresence();
    void fetchAudience();

    const presenceId = setInterval(() => void pingPresence(), 60_000);
    const audienceId = setInterval(() => void fetchAudience(), 30_000);

    return () => {
      clearInterval(presenceId);
      clearInterval(audienceId);
    };
  }, [match.id, userId]);

  // Realtime subscriptions
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
          const updated = payload.new as MatchRow;
          setLiveMatch((prev) => ({
            ...prev,
            ...updated,
          }));
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
            lastResolvedMeta.current = {
              eventId: event.id,
              eventType: event.type,
            };
            setActiveEvent((prev) => {
              if (prev?.id === event.id) return null;
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
            const meta = lastResolvedMeta.current;
            if (meta && bet.event_id === meta.eventId) {
              setVerdictOverlay({
                eventType: meta.eventType,
                eventId: meta.eventId,
                won: true,
                reward,
              });
            } else {
              toast.success(
                `Prédiction juste ! +${reward.toLocaleString("fr-FR")} 🪙 🎉`,
              );
            }
          } else if (bet.status === "lost") {
            const meta = lastResolvedMeta.current;
            if (meta && bet.event_id === meta.eventId) {
              setVerdictOverlay({
                eventType: meta.eventType,
                eventId: meta.eventId,
                won: false,
                reward: 0,
              });
            } else {
              toast.error("Pari perdu… Meilleure chance la prochaine fois !");
            }
          }
        },
      )
      .subscribe((status) => {
        setRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [match.id, userId]);

  // Signale à la BottomNav que le Super Button doit être affiché uniquement en live
  const isLive =
    liveMatch.status === "first_half" ||
    liveMatch.status === "half_time" ||
    liveMatch.status === "second_half" ||
    liveMatch.status === "paused";

  useEffect(() => {
    setDrawerAvailable(isLive);
    return () => setDrawerAvailable(false);
  }, [isLive, setDrawerAvailable]);

  useEffect(() => {
    registerOpenDrawer(() => setDrawerOpen(true));
  }, [registerOpenDrawer]);

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
        data?: {
          cooldown_until: string | null;
          current_signals: number;
          required_signals: number;
          market_opened: boolean;
        };
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error ?? "Erreur inattendue");
        return;
      }
      markAsSignaled(type);
      const cur = json.data?.current_signals ?? 1;
      const req = json.data?.required_signals ?? 2;
      if (json.data?.market_opened) {
        toast.success("Le marché VAR vient d'ouvrir ! Parie maintenant 🔥");
      } else {
        toast.success(`Signal envoyé — ${cur}/${req} pour ouvrir le pari ⚡`);
      }
      if (json.data?.cooldown_until)
        setCooldownUntil(new Date(json.data.cooldown_until));
    } catch {
      toast.error("Connexion perdue, réessaie !");
    } finally {
      setPendingType(null);
    }
  }

  const cooldownMins = Math.floor(cooldownSecs / 60);
  const cooldownSecsStr = String(cooldownSecs % 60).padStart(2, "0");

  const TABS: { id: Tab; label: string }[] = [
    { id: "kop", label: "Kop" },
    { id: "vestiaire", label: "Vestiaire" },
    { id: "compo", label: "Compo" },
    { id: "stats", label: "Stats" },
  ];

  return (
    <>
      <LiveRoomTutorial />
      {/* Zone aria-live polite — annonce les mises à jour temps réel aux lecteurs d'écran */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {activeEvent
          ? `Marché VAR ouvert : ${activeEvent.type}. Vote en cours.`
          : ""}
      </div>
      {!realtimeConnected && (
        <div
          role="alert"
          aria-live="assertive"
          className="sticky top-0 z-[55] flex justify-center py-1.5"
        >
          <div className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-950/80 px-3 py-1.5 text-[10px] font-black text-red-400 shadow-lg backdrop-blur-sm">
            <WifiOff className="h-3 w-3" />
            Reconnexion…
          </div>
        </div>
      )}
      {/* En-tête sticky : scoreboard + onglets */}
      <div className="sticky top-0 z-40 -mx-4 bg-zinc-950/95 backdrop-blur-md">
        <div className="relative px-6 pt-2">
          <div className="absolute right-4 top-2 z-10 flex items-center gap-2">
            {/* Badge audience (Sprint Q) */}
            {audienceCount > 0 && (
              <span
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  audienceCount >= 5
                    ? "bg-whistle/20 text-whistle"
                    : "bg-white/8 text-zinc-400"
                }`}
                title={
                  audienceCount < 5 ? "Sois le premier à alerter ⚡" : undefined
                }
              >
                👁️ {audienceCount}
              </span>
            )}
            <MatchNotificationBell matchId={liveMatch.id} />
          </div>
          <Scoreboard
            key={`${liveMatch.status}-${liveMatch.match_minute ?? ""}-${liveMatch.home_score}-${liveMatch.away_score}`}
            match={liveMatch}
          />
        </div>

        {/* Onglets style Google — underline indicator */}
        <div className="flex border-b border-white/8">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex flex-1 min-h-[44px] items-center justify-center gap-1 text-xs font-black uppercase tracking-wide transition-colors ${
                displayedTab === tab.id
                  ? "text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
              {displayedTab === tab.id && (
                <span className="absolute bottom-0 left-4 right-4 h-1 rounded-t-full bg-green-500" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu de l'onglet */}
      {displayedTab === "kop" && (
        <>
          <MatchTimeline
            matchId={liveMatch.id}
            isModerator={isModerator}
            matchStatus={liveMatch.status}
            matchStartTime={liveMatch.start_time ?? undefined}
            onSwitchToCompo={() => setActiveTab("compo")}
          />
          {/* Sirène VAR — panic button ligue */}
          {isLive && (
            <div className="mt-4 px-1 pb-2">
              <button
                type="button"
                onClick={handleVarAlert}
                disabled={
                  sirenLoading ||
                  (sirenCooldownUntil !== null &&
                    sirenCooldownUntil > new Date())
                }
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 py-3 text-sm font-black text-red-400 transition active:scale-[0.98] disabled:opacity-40"
              >
                <Siren className="h-4 w-4" />
                {sirenLoading
                  ? "Envoi…"
                  : sirenCooldownUntil && sirenCooldownUntil > new Date()
                    ? "Sirène VAR (cooldown 15 min)"
                    : "Sirène VAR — Rameuter la ligue 🚨"}
              </button>
            </div>
          )}
        </>
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
          homeTeamPrimaryColor={liveMatch.home_team?.color_primary}
          homeTeamSecondaryColor={liveMatch.home_team?.color_secondary}
          awayTeamPrimaryColor={liveMatch.away_team?.color_primary}
          awayTeamSecondaryColor={liveMatch.away_team?.color_secondary}
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
          homeTeamColor={liveMatch.home_team_color}
          awayTeamColor={liveMatch.away_team_color}
          homeTeamPrimaryColor={liveMatch.home_team?.color_primary}
          homeTeamSecondaryColor={liveMatch.home_team?.color_secondary}
          awayTeamPrimaryColor={liveMatch.away_team?.color_primary}
          awayTeamSecondaryColor={liveMatch.away_team?.color_secondary}
          matchStatus={liveMatch.status}
        />
      )}
      {displayedTab === "vestiaire" && (
        <>
          <FriendPronoHints
            matchId={liveMatch.id}
            userId={userId}
            teamHome={liveMatch.team_home}
            teamAway={liveMatch.team_away}
          />
          <LeaguePronosList
            matchStatus={liveMatch.status}
            startTime={liveMatch.start_time}
            squadPronos={squadPronos}
          />
        </>
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
          key={activeEvent.id}
          event={activeEvent}
          siffletsBalance={localBalance}
          userId={userId}
          squadId={squadId}
          squadName={squadName}
          audienceCount={audienceCount}
          onClose={() => setActiveEvent(null)}
          onBetSuccess={(amount) => setLocalBalance((b) => b - amount)}
        />
      )}

      {/* Verdict overlay — INSP4-3 */}
      {verdictOverlay && (
        <VerdictOverlay
          eventType={verdictOverlay.eventType}
          eventId={verdictOverlay.eventId}
          won={verdictOverlay.won}
          reward={verdictOverlay.reward}
          username={username}
          matchLabel={`${liveMatch.team_home} — ${liveMatch.team_away}`}
          onClose={() => setVerdictOverlay(null)}
        />
      )}
    </>
  );
}
