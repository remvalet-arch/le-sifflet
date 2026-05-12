"use client";

import { useEffect, useState } from "react";
import type { UserDailyRecapRow } from "@/types/database";
import { MatchdayRecapModal } from "./MatchdayRecapModal";

const STORAGE_KEY = "lastRecapShownDate";

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function hasActivityInRecap(r: UserDailyRecapRow): boolean {
  return r.pronos_total > 0 || r.var_bets_total > 0;
}

export function DailyRecapChecker() {
  const [recap, setRecap] = useState<UserDailyRecapRow | null>(null);

  useEffect(() => {
    // Ne pas re-afficher si déjà vu aujourd'hui
    try {
      if (localStorage.getItem(STORAGE_KEY) === todayKey()) return;
    } catch {
      /* localStorage indispo (SSR guard) */
    }

    void fetch("/api/recap/today")
      .then((r) => r.json())
      .then(
        (d: { ok?: boolean; data?: { recap: UserDailyRecapRow | null } }) => {
          const r = d.ok ? (d.data?.recap ?? null) : null;
          // N'afficher que si l'utilisateur a réellement joué hier
          if (r && hasActivityInRecap(r)) {
            setRecap(r);
            try {
              localStorage.setItem(STORAGE_KEY, todayKey());
            } catch {
              /* silent */
            }
          }
        },
      )
      .catch(() => {
        /* silent */
      });
  }, []);

  if (!recap) return null;

  return <MatchdayRecapModal recap={recap} onDismiss={() => setRecap(null)} />;
}
