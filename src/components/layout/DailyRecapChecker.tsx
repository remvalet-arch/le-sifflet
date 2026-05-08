"use client";

import { useEffect, useState } from "react";
import type { UserDailyRecapRow } from "@/types/database";
import { MatchdayRecapModal } from "./MatchdayRecapModal";

export function DailyRecapChecker() {
  const [recap, setRecap] = useState<UserDailyRecapRow | null>(null);

  useEffect(() => {
    void fetch("/api/recap/today")
      .then((r) => r.json())
      .then(
        (d: { ok?: boolean; data?: { recap: UserDailyRecapRow | null } }) => {
          if (d.ok && d.data?.recap) setRecap(d.data.recap);
        },
      )
      .catch(() => {
        /* silent */
      });
  }, []);

  if (!recap) return null;

  return <MatchdayRecapModal recap={recap} onDismiss={() => setRecap(null)} />;
}
