"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { ProfileHeader } from "./ProfileHeader";
import type { BadgeRow, SeasonArchiveRow } from "@/types/database";
import { StatsSection } from "./StatsSection";
import { ProfileOverview } from "./ProfileOverview";
import { HistoriqueTab } from "./ProfileHistorique";
import { ProfileBadges } from "./ProfileBadges";

export type { ShortBetEntry, PronoEntry } from "./ProfileHistorique";

type Props = {
  shortBets: import("./ProfileHistorique").ShortBetEntry[];
  pronos: import("./ProfileHistorique").PronoEntry[];
  allBadges: BadgeRow[];
  unlockedBadgeIds: string[];
  amisContent: React.ReactNode;
  refillContent: React.ReactNode;
  winRate: number;
  totalBets: number;
  totalEarned: number;
  xpTotal: number;
  bestStreak: number;
  trustScore: number;
  isModerateur: boolean;
  scoreAccuracy: number | null;
  totalMatchesPronoed: number;
  headerUsername?: string;
  headerAvatarUrl?: string | null;
  headerFavoriteTeam?: {
    id: string;
    name: string;
    logo_url: string | null;
  } | null;
  headerRank?: { emoji: string; label: string };
  headerBalance?: number;
  headerLoginStreak?: number;
  headerLastLoginDate?: string | null;
  headerKarma?: { emoji: string; label: string; cls: string };
  headerPreferredCompetitions?: string[];
  headerStreakFreezesOwned?: number;
  headerEquippedAvatarAsset?: string | null;
  headerEquippedBorderAsset?: string | null;
  seasonArchives?: SeasonArchiveRow[];
  currentSeason?: { label: string; endsAt: string } | null;
};

type TabValue = "profil" | "historique" | "badges" | "amis" | "stats";

export function ProfileClient({
  shortBets,
  pronos,
  allBadges,
  unlockedBadgeIds,
  amisContent,
  refillContent,
  winRate,
  totalBets,
  totalEarned,
  xpTotal,
  bestStreak,
  trustScore,
  isModerateur,
  scoreAccuracy,
  totalMatchesPronoed,
  headerUsername,
  headerAvatarUrl,
  headerFavoriteTeam,
  headerRank,
  headerBalance,
  headerLoginStreak,
  headerLastLoginDate,
  headerKarma,
  headerPreferredCompetitions,
  headerStreakFreezesOwned,
  headerEquippedAvatarAsset,
  headerEquippedBorderAsset,
  seasonArchives = [],
  currentSeason,
}: Props) {
  const tProfile = useTranslations("Profile");
  const TABS = [
    { value: "profil" as TabValue, icon: "⚽", label: tProfile("tabProfil") },
    {
      value: "historique" as TabValue,
      icon: "📊",
      label: tProfile("tabHistorique"),
    },
    { value: "badges" as TabValue, icon: "🏅", label: tProfile("tabBadges") },
    { value: "amis" as TabValue, icon: "👥", label: tProfile("tabAmis") },
    { value: "stats" as TabValue, icon: "📈", label: tProfile("tabStats") },
  ];
  const [activeTab, setActiveTab] = useState<TabValue>("profil");
  const tabBadge = (value: TabValue): number | null => {
    if (value === "historique") {
      const n =
        pronos.filter((p) => p.status === "pending").length +
        shortBets.filter((b) => b.status === "pending").length;
      return n > 0 ? n : null;
    }
    if (value === "badges")
      return unlockedBadgeIds.length > 0 ? unlockedBadgeIds.length : null;
    return null;
  };

  return (
    <div className="flex flex-col gap-4">
      {headerUsername != null &&
        headerRank != null &&
        headerBalance != null &&
        headerAvatarUrl !== undefined && (
          <ProfileHeader
            username={headerUsername}
            avatarUrl={headerAvatarUrl ?? null}
            favoriteTeam={headerFavoriteTeam ?? null}
            karma={headerKarma}
            rank={headerRank}
            xpTotal={xpTotal}
            balance={headerBalance}
            loginStreak={headerLoginStreak}
            lastLoginDate={headerLastLoginDate}
            trustScore={trustScore}
            compact={activeTab !== "profil"}
            preferredCompetitions={headerPreferredCompetitions}
            streakFreezesOwned={headerStreakFreezesOwned}
            equippedAvatarAsset={headerEquippedAvatarAsset}
            equippedBorderAsset={headerEquippedBorderAsset}
          />
        )}

      <div className="relative">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.value;
            const badge = tabBadge(tab.value);
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveTab(tab.value)}
                className={`shrink-0 flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-[11px] font-black uppercase tracking-wide transition-all ${
                  isActive
                    ? "border-white/25 bg-zinc-800 text-white shadow-[0_0_12px_rgba(255,255,255,0.08)]"
                    : "border-white/8 bg-zinc-900 text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {badge !== null && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[8px] font-black ${
                      tab.value === "historique"
                        ? "bg-whistle text-pitch-900"
                        : isActive
                          ? "bg-zinc-900 text-white"
                          : "bg-zinc-700 text-zinc-400"
                    }`}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div
          className="pointer-events-none absolute right-0 top-0 h-full w-10 bg-gradient-to-l from-zinc-950 to-transparent"
          aria-hidden
        />
      </div>

      {activeTab === "profil" && (
        <ProfileOverview
          winRate={winRate}
          totalBets={totalBets}
          totalEarned={totalEarned}
          bestStreak={bestStreak}
          totalMatchesPronoed={totalMatchesPronoed}
          scoreAccuracy={scoreAccuracy}
          headerBalance={headerBalance}
          isModerateur={isModerateur}
          refillContent={refillContent}
          currentSeason={currentSeason}
          seasonArchives={seasonArchives}
        />
      )}

      {activeTab === "historique" && (
        <HistoriqueTab pronos={pronos} shortBets={shortBets} />
      )}

      {activeTab === "badges" && (
        <ProfileBadges
          allBadges={allBadges}
          unlockedBadgeIds={unlockedBadgeIds}
        />
      )}

      {activeTab === "amis" && <div>{amisContent}</div>}
      {activeTab === "stats" && (
        <StatsSection
          favoriteTeamId={headerFavoriteTeam?.id ?? null}
          favoriteTeamName={headerFavoriteTeam?.name ?? null}
        />
      )}
    </div>
  );
}
