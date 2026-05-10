"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { UserDailyRecapRow } from "@/types/database";

type Props = {
  recap: UserDailyRecapRow;
  onDismiss: () => void;
};

function useCountUp(target: number, delay = 400): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) return;
    const duration = 900;
    const steps = 40;
    const stepMs = duration / steps;
    let step = 0;
    const id = setTimeout(() => {
      const interval = setInterval(() => {
        step++;
        setValue(Math.round((target * step) / steps));
        if (step >= steps) clearInterval(interval);
      }, stepMs);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(id);
  }, [target, delay]);
  return value;
}

const StatCard = ({
  label,
  value,
  emoji,
  color,
}: {
  label: string;
  value: number;
  emoji: string;
  color: string;
}) => {
  const animated = useCountUp(value);
  return (
    <div
      className={`flex flex-col items-center rounded-2xl border p-4 ${color}`}
    >
      <span className="text-2xl">{emoji}</span>
      <span className="mt-1 text-3xl font-black tabular-nums">{animated}</span>
      <span className="mt-0.5 text-center text-[10px] font-black uppercase tracking-widest opacity-70">
        {label}
      </span>
    </div>
  );
};

export function MatchdayRecapModal({ recap, onDismiss }: Props) {
  const t = useTranslations("DailyRecap");
  const pts = useCountUp(recap.points_earned);

  async function handleClose() {
    void fetch("/api/recap/today", { method: "PATCH" });
    onDismiss();
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-zinc-950/98 px-5 backdrop-blur-md"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px), 1rem)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 2rem)",
      }}
    >
      {/* Header glow */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 rounded-full bg-green-500/10 blur-3xl" />
      </div>

      <div className="relative flex w-full max-w-sm flex-col items-center gap-5">
        {/* Title */}
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-widest text-green-500/70">
            📊 {t("title")}
          </p>
          <h1 className="mt-1 text-2xl font-black uppercase tracking-tight text-white">
            {t("heading")}
          </h1>
        </div>

        {/* Points hero */}
        <div className="flex flex-col items-center rounded-3xl border border-green-500/20 bg-green-500/8 px-8 py-5 text-center">
          <span className="text-5xl font-black tabular-nums text-green-400">
            +{pts}
          </span>
          <span className="mt-1 text-sm font-black uppercase tracking-widest text-green-500/60">
            {t("pointsLabel")}
          </span>
        </div>

        {/* 4 stat cards */}
        <div className="grid w-full grid-cols-2 gap-3">
          <StatCard
            label={t("statPronos")}
            value={recap.pronos_correct}
            emoji="🎯"
            color="border-amber-500/20 bg-amber-500/8 text-amber-400"
          />
          <StatCard
            label={t("statExact")}
            value={recap.pronos_exact}
            emoji="🔮"
            color="border-purple-500/20 bg-purple-500/8 text-purple-400"
          />
          <StatCard
            label={t("statVar")}
            value={recap.var_bets_won}
            emoji="⚡"
            color="border-blue-500/20 bg-blue-500/8 text-blue-400"
          />
          <StatCard
            label={t("statWon")}
            value={recap.pronos_total}
            emoji="📋"
            color="border-white/10 bg-white/5 text-zinc-300"
          />
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={() => void handleClose()}
          className="w-full rounded-2xl bg-green-500 py-4 text-sm font-black uppercase tracking-widest text-zinc-950 transition active:scale-[0.98] hover:bg-green-400"
        >
          {t("viewRanking")}
        </button>
        <button
          type="button"
          onClick={() => void handleClose()}
          className="text-xs text-zinc-600 hover:text-zinc-400"
        >
          {t("close")}
        </button>
      </div>
    </div>
  );
}
