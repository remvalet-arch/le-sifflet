"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Siren } from "lucide-react";
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
import { MatchNotificationBell } from "./MatchNotificationBell";
import { LeaguePronosList } from "./LeaguePronosList";
import { useActiveSquad } from "@/hooks/useActiveSquad";

export type SquadProno = {
  user_id: string;
  prono_type: "exact_score" | "scorer" | "scorer_allocation";
  prono_value: string;
  points_earned: number;
  profiles: { username: string; avatar_url: string | null } | null;
};

type Tab = "kop" | "compo" | "stats" | "vestiaire";

export type LiveRoomMatchRow = MatchRow & {
  home_team?: { color_primary: string | null; color_secondary: string | null } | null;
  away_team?: { color_primary: string | null; color_secondary: string | null } | null;
};

type Props = {
  match: LiveRoomMatchRow;
  siffletsBalance: number;
  userId: string;
  isModerator: boolean;
  squadPronos: SquadProno[];
};

export function LiveRoom({
  match,
  siffletsBalance,
  userId,
  isModerator,
  squadPronos,
}: Props) {
  const [liveMatch, setLiveMatch] = useState<LiveRoomMatchRow>(match);
  const [activeTab, setActiveTab] = useState<Tab>("kop");

  const displayedTab: Tab = activeTab;

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

  useEffect(() => {
    if (localBalance < 10) {
      void fetch("/api/claim-rsa", { method: "POST" })
        .then((res) => res.json())
        .then((json: { ok: boolean; data?: { new_balance: number } }) => {
          if (json.ok && json.data) {
            setLocalBalance(json.data.new_balance);
            toast.success(
              "L'arbitre te fait une fleur, revoilà 50 Sifflets 💸",
            );
          }
        });
    }
  }, [localBalance]);

  const { squadId, squadName } = useActiveSquad();

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

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
              `Prédiction juste ! +${reward.toLocaleString("fr-FR")} Pts 🎉`,
            );
          } else if (bet.status === "lost") {
            toast.error("Pari perdu… Meilleure chance la prochaine fois !");
          }
        },
      )
      .subscribe();

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
    window.dispatchEvent(
      new CustomEvent("sifflet:drawer-available", {
        detail: { enabled: isLive },
      }),
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("sifflet:drawer-available", {
          detail: { enabled: false },
        }),
      );
    };
  }, [isLive]);

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
      if (!res.ok) {
        toast.error(json.error ?? "Erreur inattendue");
        return;
      }
      markAsSignaled(type);
      toast.success("Signal envoyé ! En attente d'autres confirmations…");
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
      {/* En-tête sticky : scoreboard + onglets */}
      <div
        className="sticky z-40 -mx-4 bg-zinc-950/95 backdrop-blur-md"
        style={{ top: "calc(3.5rem + env(safe-area-inset-top, 0px))" }}
      >
        <div className="relative px-6 pt-2">
          <div className="absolute right-4 top-2 z-10">
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
                <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-t-full bg-green-500" />
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
        <LeaguePronosList
          matchStatus={liveMatch.status}
          startTime={liveMatch.start_time}
          squadPronos={squadPronos}
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
          key={activeEvent.id}
          event={activeEvent}
          siffletsBalance={localBalance}
          squadId={squadId}
          squadName={squadName}
          onClose={() => setActiveEvent(null)}
          onBetSuccess={(amount) => setLocalBalance((b) => b - amount)}
        />
      )}
    </>
  );
}
