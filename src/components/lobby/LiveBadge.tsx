"use client";

import { useTranslations } from "next-intl";
import type { MatchStatus } from "@/types/database";
import { isLobbyLiveStatus } from "@/lib/matches";

type Props = {
  status: MatchStatus;
  className?: string;
};

/** Pastille + libellé période (lobby / fiches) — uniquement pour les statuts « en direct ». */
export function LiveBadge({ status, className = "" }: Props) {
  const t = useTranslations("Scoreboard");
  if (!isLobbyLiveStatus(status)) return null;

  const labels: Partial<Record<MatchStatus, string>> = {
    first_half: t("firstHalf"),
    half_time: t("halfTime"),
    second_half: t("secondHalf"),
    paused: t("paused"),
  };
  const label = labels[status] ?? status;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="relative flex h-2.5 w-2.5 shrink-0">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-500 opacity-75" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
      </span>
      <span className="text-[11px] font-black uppercase tracking-widest text-green-500">
        {label}
      </span>
    </div>
  );
}
