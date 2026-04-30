"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { MatchTimelineEventRow, TimelineEventType } from "@/types/database";

const ICONS: Record<TimelineEventType, string> = {
  goal:         "⚽",
  yellow_card:  "🟨",
  red_card:     "🟥",
  substitution: "🔄",
};

function EventCard({
  ev,
  side,
}: {
  ev: MatchTimelineEventRow;
  side: "home" | "away";
}) {
  const icon = ICONS[ev.event_type];
  const isGoal = ev.event_type === "goal";
  const isSub = ev.event_type === "substitution";
  const isRight = side === "away";

  return (
    <div
      className={`flex max-w-[140px] items-center gap-2 rounded-xl border px-3 py-2.5 ${
        isGoal
          ? "border-green-700/40 bg-green-900/30"
          : "border-white/8 bg-zinc-800/60"
      } ${isRight ? "flex-row-reverse" : ""}`}
    >
      <span className="text-xl leading-none">{icon}</span>
      <div className={`flex flex-col ${isRight ? "items-end" : ""}`}>
        <span className="text-xs font-black text-white">{ev.minute}&apos;</span>
        <span
          className={`mt-0.5 text-[11px] leading-tight text-zinc-400 ${
            isSub ? "max-w-[80px]" : "max-w-[80px] truncate"
          }`}
        >
          {ev.player_name}
        </span>
      </div>
    </div>
  );
}

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
    <div className="relative mt-6 pb-4">
      {/* Ligne centrale */}
      <div className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-zinc-800" />

      <div className="flex flex-col gap-4">
        {events.map((ev) => {
          const isHome = ev.team_side === "home";
          return (
            <div key={ev.id} className="relative flex items-center">
              {/* Côté domicile */}
              <div className="flex flex-1 justify-end pr-4">
                {isHome && <EventCard ev={ev} side="home" />}
              </div>

              {/* Point central sur la ligne */}
              <div className="z-10 h-3 w-3 shrink-0 rounded-full bg-zinc-600 ring-2 ring-zinc-950" />

              {/* Côté extérieur */}
              <div className="flex flex-1 justify-start pl-4">
                {!isHome && <EventCard ev={ev} side="away" />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
