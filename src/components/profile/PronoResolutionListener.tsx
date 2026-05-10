"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { track, rarityBonusToLabel, type BoosterSlug } from "@/lib/analytics";
import type { PronoRow } from "@/types/database";

// Fires prono_resolved when the server resolves a prono while the user is on
// the profile page. Uses contre_pied_bonus (set by resolve_match_pronos) to
// derive the rarity label without requiring an extra query.
export function PronoResolutionListener({ userId }: { userId: string }) {
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`prono-resolved-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "pronos",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const oldRow = payload.old as Partial<PronoRow>;
          const newRow = payload.new as PronoRow;

          if (
            oldRow.status !== "pending" ||
            (newRow.status !== "won" && newRow.status !== "lost")
          )
            return;

          if (seenIds.current.has(newRow.id)) return;
          seenIds.current.add(newRow.id);

          const rarityBonus = newRow.contre_pied_bonus ?? 0;
          track("prono_resolved", {
            match_id: newRow.match_id,
            prono_type:
              newRow.prono_type === "exact_score"
                ? "exact_score"
                : "scorer_allocation",
            status: newRow.status,
            points_earned: newRow.points_earned ?? 0,
            booster_applied: null as BoosterSlug | null,
            rarity_label: rarityBonusToLabel(rarityBonus),
            bonus_rarity_points: rarityBonus,
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return null;
}
