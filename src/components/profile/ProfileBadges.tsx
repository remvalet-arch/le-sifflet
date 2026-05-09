import { TrophyWall } from "./TrophyWall";
import { EmptyState } from "./ProfileHistorique";
import type { BadgeRow } from "@/types/database";

type Props = {
  allBadges: BadgeRow[];
  unlockedBadgeIds: string[];
};

export function ProfileBadges({ allBadges, unlockedBadgeIds }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between px-1">
        <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
          Badges
        </p>
        <span className="text-[11px] font-bold text-zinc-400">
          {unlockedBadgeIds.length}/{allBadges.length} débloqués
        </span>
      </div>
      {allBadges.length === 0 ? (
        <EmptyState emoji="🏅" text="Les trophées arrivent bientôt…" />
      ) : (
        <TrophyWall badges={allBadges} unlockedBadgeIds={unlockedBadgeIds} />
      )}
    </div>
  );
}
