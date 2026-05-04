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

type Props = {
  badges: BadgeRow[];
  unlockedBadgeIds: string[];
};

export function TrophyWall({ badges, unlockedBadgeIds }: Props) {
  const [tooltip, setTooltip] = useState<string | null>(null);
  const unlocked = new Set(unlockedBadgeIds);

  if (badges.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
        Mes Trophées
      </h2>
      <div className="grid grid-cols-3 gap-3">
        {badges.map((badge) => {
          const isUnlocked = unlocked.has(badge.id);
          const Icon = BADGE_ICONS[badge.icon_name] ?? Trophy;
          const neon = BADGE_NEON[badge.slug] ?? "";

          return (
            <div key={badge.id} className="flex flex-col gap-0">
              <button
                onClick={() =>
                  setTooltip(tooltip === badge.id ? null : badge.id)
                }
                className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 px-2 py-4 text-center transition-all active:scale-95 ${
                  isUnlocked
                    ? neon
                    : "border-zinc-700 bg-zinc-900 text-zinc-600"
                }`}
              >
                {/* Icône */}
                <div
                  className={`relative ${isUnlocked ? "" : "grayscale opacity-40"}`}
                >
                  <Icon className="h-7 w-7" />
                  {!isUnlocked && (
                    <Lock className="absolute -right-1.5 -bottom-1.5 h-3.5 w-3.5 text-zinc-500" />
                  )}
                </div>
                <p
                  className={`text-[10px] font-black uppercase tracking-wide leading-tight ${isUnlocked ? "" : "text-zinc-600"}`}
                >
                  {badge.label}
                </p>
              </button>

              {/* Tooltip sur clic (mobile-friendly) */}
              {tooltip === badge.id && (
                <div className="mt-1.5 rounded-xl border border-white/8 bg-zinc-800 px-3 py-2.5 text-center">
                  <p className="text-xs font-semibold text-zinc-300">
                    {badge.description}
                  </p>
                  {isUnlocked && (
                    <p className="mt-1 text-[10px] font-bold text-green-400">
                      ✓ Badge débloqué !
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
