"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

const BADGE_EMOJI: Record<string, string> = {
  oeil_de_faucon: "🦅",
  nostradamus: "✨",
  collina: "🛡️",
  chat_noir: "👻",
  fidele: "📅",
  goleador: "⚽",
};

type Props = { userId: string };

export function BadgeUnlockListener({ userId }: Props) {
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`user-badges-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_badges",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const badgeId = (payload.new as { badge_id: string }).badge_id;
          const { data } = await supabase
            .from("badges")
            .select("slug, label")
            .eq("id", badgeId)
            .single();
          if (data) {
            const emoji = BADGE_EMOJI[data.slug] ?? "🏅";
            toast.success(`${emoji} Nouveau badge débloqué : ${data.label} !`, {
              duration: 6000,
            });
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return null;
}
