"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

type Props = {
  label: string;
  endsAt: string;
};

export function SeasonBadge({ label, endsAt }: Props) {
  const t = useTranslations("Season");

  const daysLeft = useMemo(() => {
    // eslint-disable-next-line react-hooks/purity
    const diff = new Date(endsAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [endsAt]);

  const isEnding = daysLeft <= 3;

  return (
    <div className="flex flex-col gap-1">
      <div
        className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
          isEnding
            ? "border border-red-500/30 bg-red-500/10"
            : "border border-white/8 bg-zinc-900"
        }`}
      >
        <span className="text-base">🏆</span>
        <span className="font-black text-white">{label}</span>
        <span
          className={`ml-auto text-xs font-bold ${
            isEnding ? "text-red-400" : "text-zinc-500"
          }`}
        >
          {daysLeft === 0 ? t("lastChance") : t("daysLeft", { n: daysLeft })}
        </span>
      </div>
      {isEnding && daysLeft > 0 && (
        <p className="px-1 text-[10px] font-black text-red-400">
          {t("endingWarning", { count: daysLeft })}
        </p>
      )}
    </div>
  );
}
