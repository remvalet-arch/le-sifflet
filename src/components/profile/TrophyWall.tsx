"use client";

import { useState } from "react";
import {
  Eye,
  Sparkles,
  Shield,
  Ghost,
  CalendarCheck,
  Trophy,
  Lock,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { BadgeRow } from "@/types/database";

const BADGE_ICONS: Record<string, React.ElementType> = {
  Eye,
  Sparkles,
  Shield,
  Ghost,
  CalendarCheck,
  Trophy,
};

const BADGE_NEON: Record<string, string> = {
  oeil_de_faucon:
    "border-cyan-500    bg-cyan-500/10    text-cyan-400    shadow-[0_0_16px_rgba(34,211,238,0.35)]",
  nostradamus:
    "border-purple-500  bg-purple-500/10  text-purple-400  shadow-[0_0_16px_rgba(168,85,247,0.35)]",
  collina:
    "border-yellow-500  bg-yellow-500/10  text-yellow-400  shadow-[0_0_16px_rgba(234,179,8,0.35)]",
  chat_noir:
    "border-orange-500  bg-orange-500/10  text-orange-400  shadow-[0_0_16px_rgba(249,115,22,0.35)]",
  fidele:
    "border-blue-500    bg-blue-500/10    text-blue-400    shadow-[0_0_16px_rgba(59,130,246,0.35)]",
  goleador:
    "border-green-500   bg-green-500/10   text-green-400   shadow-[0_0_16px_rgba(34,197,94,0.35)]",
};

const BADGE_RING: Record<string, string> = {
  oeil_de_faucon: "ring-cyan-500/60",
  nostradamus: "ring-purple-500/60",
  collina: "ring-yellow-500/60",
  chat_noir: "ring-orange-500/60",
  fidele: "ring-blue-500/60",
  goleador: "ring-green-500/60",
};

type Props = {
  badges: BadgeRow[];
  unlockedBadgeIds: string[];
};

export function TrophyWall({ badges, unlockedBadgeIds }: Props) {
  const t = useTranslations("Profile");
  const [tooltip, setTooltip] = useState<string | null>(null);
  const unlocked = new Set(unlockedBadgeIds);

  if (badges.length === 0) return null;

  const pct = Math.round((unlocked.size / badges.length) * 100);

  return (
    <section className="mt-2">
      <div className="mb-3">
        <div className="mb-1.5 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            {t("myTrophies")}
          </h2>
          <span className="text-[10px] font-black text-zinc-400">
            {unlocked.size}/{badges.length}
          </span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-emerald-500 transition-[width] duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {badges.map((badge) => {
          const isUnlocked = unlocked.has(badge.id);
          const Icon = BADGE_ICONS[badge.icon_name] ?? Trophy;
          const neon = BADGE_NEON[badge.slug] ?? "";
          const ring = BADGE_RING[badge.slug] ?? "ring-white/20";

          return (
            <div key={badge.id} className="flex flex-col gap-0">
              <button
                onClick={() =>
                  setTooltip(tooltip === badge.id ? null : badge.id)
                }
                className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 px-2 py-5 text-center transition-all active:scale-95 ${
                  isUnlocked
                    ? neon
                    : "border-zinc-700 bg-zinc-900 text-zinc-600"
                }`}
              >
                <div
                  className={`relative ${isUnlocked ? `rounded-full ring-2 ${ring} animate-pulse` : "grayscale opacity-40"}`}
                >
                  <Icon className="size-7" />
                  {!isUnlocked && (
                    <Lock className="absolute -right-1.5 -bottom-1.5 size-3.5 text-zinc-500" />
                  )}
                </div>
                <p
                  className={`text-[10px] font-black uppercase tracking-wide leading-tight ${isUnlocked ? "" : "text-zinc-600"}`}
                >
                  {badge.label}
                </p>
              </button>

              {!isUnlocked && (
                <p className="mt-1 px-1 text-center text-[8px] font-medium leading-tight text-zinc-700 line-clamp-2">
                  {badge.description}
                </p>
              )}

              {tooltip === badge.id && (
                <div className="mt-1.5 rounded-xl border border-white/8 bg-zinc-800 px-3 py-2.5 text-center">
                  <p className="text-xs font-semibold text-zinc-300">
                    {badge.description}
                  </p>
                  {isUnlocked && (
                    <p className="mt-1 text-[10px] font-bold text-green-400">
                      {t("badgeUnlocked")}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
