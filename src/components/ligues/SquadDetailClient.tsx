"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BellRing, LoaderCircle, Wallet, ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { InviteSheet } from "./InviteSheet";
import { useBcp47 } from "@/lib/use-bcp47";
import type { SquadRow } from "@/types/database";
import { SquadChat } from "./SquadChat";
import { SquadChampionship } from "./SquadChampionship";
import { SquadLeaderboard } from "./SquadLeaderboard";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type LeaderboardRow = {
  user_id: string;
  username: string;
  xp: number;
  pronos_xp: number;
  var_xp: number;
  sifflets_balance: number;
  rank: string;
  season_points: number;
};

type Period = "general" | "week" | "month";

type ActivityItem = {
  user_id: string;
  username: string;
  points_earned: number;
  contre_pied_bonus: number;
  match_id: string;
  team_home: string;
  team_away: string;
  placed_at: string;
};

type ChampionshipStanding = {
  user_id: string;
  username: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  points: number;
  pronos_pts: number;
};

type ChampionshipFixture = {
  id: string;
  round_number: number;
  week_start: string;
  home_member_id: string;
  home_username: string;
  away_member_id: string;
  away_username: string;
  home_points: number | null;
  away_points: number | null;
  winner_id: string | null;
  status: string;
};

type ChampionshipData = {
  season_id: string;
  status: string;
  current_round: number;
  total_rounds: number;
  standings: ChampionshipStanding[];
  current_fixtures: ChampionshipFixture[];
};

type PastSeason = {
  season_id: string;
  ended_at: string | null;
  champion_user_id: string | null;
  champion_username: string | null;
  champion_points: number;
};

type ApiPayload = {
  squad: SquadRow;
  leaderboard: LeaderboardRow[];
  total_xp_earned: number;
  period: Period;
  activity: ActivityItem[];
  championship: ChampionshipData | null;
  past_seasons?: PastSeason[];
};

type ApiResponse<T> = { ok: boolean; data?: T; error?: string };

export function SquadDetailClient({
  squadId,
  currentUserId,
}: {
  squadId: string;
  currentUserId: string;
}) {
  const t = useTranslations("Ligues");
  const bcp47 = useBcp47();
  const [data, setData] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [nudging, setNudging] = useState(false);
  const [period, setPeriod] = useState<"general" | "week" | "month">("general");
  const [reloadKey, setReloadKey] = useState(0);
  const [vestiaireSeen, setVestiaireSeen] = useState(false);
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    let alive = true;
    void fetch(`/api/squads/${squadId}?period=${period}`)
      .then((r) => r.json())
      .then((json: ApiResponse<ApiPayload>) => {
        if (!alive) return;
        if (!json.ok) {
          toast.error(json.error ?? t("connectionLost"));
          setData(null);
          return;
        }
        setData(json.data ?? null);
      })
      .catch(() => {
        if (!alive) return;
        toast.error(t("connectionLost"));
        setData(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [squadId, period, reloadKey]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoaderCircle className="h-8 w-8 animate-spin text-zinc-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        {t("errorLoadingLeague")}{" "}
        <Link href="/ligues" className="font-bold text-whistle underline">
          {t("errorLoadingLeagueBack")}
        </Link>
      </p>
    );
  }

  const {
    squad,
    leaderboard,
    total_xp_earned,
    activity,
    championship,
    past_seasons,
  } = data;

  async function handleNudge() {
    setNudging(true);
    try {
      const res = await fetch("/api/squads/nudge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ squad_id: squadId }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { sent_count: number };
        error?: string;
      };
      if (!json.ok) {
        toast.error(json.error ?? t("nudgeError"));
      } else {
        const n = json.data?.sent_count ?? 0;
        toast.success(
          n > 0
            ? t(n > 1 ? "nudgeSentPlural" : "nudgeSentOne", { count: n })
            : t("nudgeAllDone"),
        );
      }
    } catch {
      toast.error(t("connectionLost"));
    } finally {
      setNudging(false);
    }
  }

  const isAdmin = squad.owner_id === currentUserId;

  return (
    <div className="space-y-6 pb-8 relative min-h-screen">
      {showInvite && squad.invite_code && (
        <InviteSheet
          inviteCode={squad.invite_code}
          squadName={squad.name}
          onClose={() => setShowInvite(false)}
        />
      )}
      <Link
        href="/ligues"
        className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        {t("myLeaguesBackLink")}
      </Link>

      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-xl mt-4">
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-whistle/20 blur-3xl" />

        <p className="text-[10px] font-black uppercase tracking-widest text-whistle/80 relative z-10">
          {squad.is_private ? t("privateLabel") : t("publicLabel")}
        </p>
        <h1 className="text-3xl font-black tracking-tight text-white relative z-10 mt-1 mb-4">
          {squad.name}
        </h1>
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <p className="flex flex-wrap items-center gap-3 text-sm font-bold text-green-400/90">
            <span className="inline-flex items-center gap-1.5 bg-green-500/10 px-3 py-1.5 rounded-xl border border-green-500/20">
              <Wallet className="h-4 w-4" aria-hidden />
              {t("cumulatedPoints")}{" "}
              <span className="font-black tabular-nums">
                {total_xp_earned.toLocaleString(bcp47)} Points
              </span>
            </span>
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleNudge}
              disabled={nudging}
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-800/80 px-3 py-2 text-xs font-black text-zinc-300 transition hover:bg-zinc-700 disabled:opacity-50 border border-white/5 backdrop-blur-md"
            >
              {nudging ? (
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <BellRing className="h-3.5 w-3.5 text-whistle" />
              )}
              {t("nudgeButton")}
            </button>
            {squad.invite_code && (
              <button
                type="button"
                onClick={() => setShowInvite(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-whistle/20 px-3 py-2 text-xs font-black text-whistle transition hover:bg-whistle/30 border border-whistle/20 active:scale-95"
              >
                🔗 {t("inviteButton")}
              </button>
            )}
          </div>
        </div>
      </div>

      <Tabs
        defaultValue="classement"
        onValueChange={(v) => {
          if (v === "vestiaire") setVestiaireSeen(true);
        }}
      >
        <TabsList className="w-full flex">
          <TabsTrigger
            value="classement"
            className="flex-1 text-sm font-black uppercase tracking-wide"
          >
            {t("tabLeaderboard")}
          </TabsTrigger>
          <TabsTrigger
            value="vestiaire"
            className="flex-1 text-sm font-black uppercase tracking-wide relative"
          >
            {t("tabLocker")}
            {!vestiaireSeen && (
              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="classement" className="mt-4">
          {championship ? (
            <SquadChampionship
              championship={championship}
              currentUserId={currentUserId}
            />
          ) : (
            <SquadLeaderboard
              leaderboard={leaderboard}
              currentUserId={currentUserId}
              period={period}
              setPeriod={setPeriod}
              isAdmin={isAdmin}
              gameMode={squad.game_mode}
              activity={activity}
              past_seasons={past_seasons}
              squadId={squadId}
              onLaunchSuccess={() => setReloadKey((k) => k + 1)}
            />
          )}
        </TabsContent>

        <TabsContent value="vestiaire" className="mt-4">
          <SquadChat squadId={squadId} currentUserId={currentUserId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
