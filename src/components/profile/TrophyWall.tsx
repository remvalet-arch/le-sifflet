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
  X,
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
  unlockedAtMap?: Record<string, string>;
};

export function TrophyWall({ badges, unlockedBadgeIds, unlockedAtMap }: Props) {
  const t = useTranslations("Profile");
  const [selectedBadge, setSelectedBadge] = useState<BadgeRow | null>(null);
  const unlocked = new Set(unlockedBadgeIds);

  if (badges.length === 0) return null;

  const pct = Math.round((unlocked.size / badges.length) * 100);

  const openBadge = (badge: BadgeRow) => setSelectedBadge(badge);
  const closeBadge = () => setSelectedBadge(null);

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
            <button
              key={badge.id}
              type="button"
              onClick={() => openBadge(badge)}
              className={`relative flex flex-col items-center gap-2 rounded-2xl border-2 px-2 py-5 text-center transition-all active:scale-95 ${
                isUnlocked ? neon : "border-zinc-700 bg-zinc-900 text-zinc-600"
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
          );
        })}
      </div>

      {/* Badge detail modal */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-end" onClick={closeBadge}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative w-full rounded-t-3xl border-t border-white/10 bg-zinc-900 px-5 pt-6 animate-in slide-in-from-bottom-4 duration-200"
            style={{
              paddingBottom: "max(env(safe-area-inset-bottom, 0px), 2rem)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={closeBadge}
              className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              aria-label="Fermer"
            >
              <X className="size-4" />
            </button>

            <BadgeModalContent
              badge={selectedBadge}
              isUnlocked={unlocked.has(selectedBadge.id)}
              unlockedAt={unlockedAtMap?.[selectedBadge.id]}
              t={t}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function BadgeModalContent({
  badge,
  isUnlocked,
  unlockedAt,
  t,
}: {
  badge: BadgeRow;
  isUnlocked: boolean;
  unlockedAt?: string;
  t: ReturnType<typeof useTranslations<"Profile">>;
}) {
  const Icon = BADGE_ICONS[badge.icon_name] ?? Trophy;
  const neon =
    BADGE_NEON[badge.slug] ?? "border-zinc-700 bg-zinc-800 text-zinc-400";
  const ring = BADGE_RING[badge.slug] ?? "ring-white/20";

  const formattedDate = unlockedAt
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(
        new Date(unlockedAt),
      )
    : null;

  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <div
        className={`flex size-20 items-center justify-center rounded-full border-2 ${neon} ${isUnlocked ? `ring-2 ${ring}` : "grayscale opacity-50"}`}
      >
        <Icon className="size-10" />
      </div>

      <div>
        <p className="text-lg font-black text-white">{badge.label}</p>
        {isUnlocked ? (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-[11px] font-black text-green-400">
            ✓ {t("badgeUnlocked")}
            {formattedDate && (
              <span className="font-medium text-green-500/70">
                · {formattedDate}
              </span>
            )}
          </span>
        ) : (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-0.5 text-[11px] font-bold text-zinc-500">
            <Lock className="size-3" />
            {t("badgeLocked")}
          </span>
        )}
      </div>

      <p className="max-w-xs text-sm leading-relaxed text-zinc-300">
        {badge.description}
      </p>

      {!isUnlocked && (
        <div className="w-full rounded-2xl border border-white/8 bg-zinc-800/60 px-4 py-3 text-left">
          <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-zinc-500">
            {t("badgeCondition")}
          </p>
          <p className="text-xs text-zinc-400">{badge.criteria_type}</p>
        </div>
      )}
    </div>
  );
}
