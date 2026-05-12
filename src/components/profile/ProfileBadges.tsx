"use client";

import { useTranslations } from "next-intl";
import { TrophyWall } from "./TrophyWall";
import { EmptyState } from "@/components/shared/EmptyState";
import type { BadgeRow } from "@/types/database";

type Props = {
  allBadges: BadgeRow[];
  unlockedBadgeIds: string[];
};

export function ProfileBadges({ allBadges, unlockedBadgeIds }: Props) {
  const t = useTranslations("Profile");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
          {t("badgesTitle")}
        </p>
        <span className="text-[11px] font-bold text-zinc-400">
          {t("badgesUnlocked", {
            unlocked: unlockedBadgeIds.length,
            total: allBadges.length,
          })}
        </span>
      </div>
      {allBadges.length === 0 ? (
        <EmptyState emoji="🏅" title={t("badgesComingSoon")} />
      ) : (
        <TrophyWall badges={allBadges} unlockedBadgeIds={unlockedBadgeIds} />
      )}
    </div>
  );
}
