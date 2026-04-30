"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MatchTimelineEventRow } from "@/types/database";

const ICONS: Record<string, string> = {
  goal:         "⚽",
  yellow_card:  "🟨",
  red_card:     "🟥",
  substitution: "🔄",
};

type Props = { matchId: string };

export function MatchTimeline({ matchId }: Props) {
  const [events, setEvents] = useState<MatchTimelineEventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    void supabase
      .from("match_timeline_events")
      .select("*")
      .eq("match_id", matchId)
      .order("minute", { ascending: true })
      .then(({ data }) => {
        setEvents(data ?? []);
        setLoading(false);
      });

    const channel = supabase
      .channel(`timeline-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "match_timeline_events",
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          setEvents((prev) =>
            [...prev, payload.new as MatchTimelineEventRow].sort(
              (a, b) => a.minute - b.minute,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [matchId]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-green-500 border-t-transparent" />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-zinc-500">
        Le match commence, en attente des premiers événements…
      </p>
    );
  }

  return (
    <div className="relative mt-4 pb-4">
      {/* Ligne centrale verticale */}
      <div className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-zinc-700" />

      <div className="flex flex-col gap-3">
        {events.map((ev) => {
          const icon = ICONS[ev.event_type] ?? "•";
          const isHome = ev.team_side === "home";
          return (
            <div key={ev.id} className="relative flex items-center">
              {/* Côté domicile (gauche) */}
              <div className="flex flex-1 items-center justify-end pr-4 text-right">
                {isHome ? (
                  <>
                    <span className="mr-1 text-sm font-semibold text-white">
                      {ev.player_name}
                    </span>
                    <span className="text-base leading-none">{icon}</span>
                  </>
                ) : null}
              </div>

              {/* Badge minute (centre) */}
              <div className="z-10 flex h-8 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-black text-zinc-300 ring-1 ring-zinc-700">
                {ev.minute}&apos;
              </div>

              {/* Côté extérieur (droite) */}
              <div className="flex flex-1 items-center pl-4">
                {!isHome ? (
                  <>
                    <span className="text-base leading-none">{icon}</span>
                    <span className="ml-1 text-sm font-semibold text-white">
                      {ev.player_name}
                    </span>
                  </>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
