"use client";

import { memo, useEffect, useState } from "react";
import { Pencil, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { MatchTimelineEventRow, TimelineEventType } from "@/types/database";

const ICONS: Record<TimelineEventType, string> = {
  goal:         "⚽",
  yellow_card:  "🟨",
  red_card:     "🟥",
  substitution: "🔄",
  info:         "📣",
};

const EVENT_LABELS: Record<Exclude<TimelineEventType, "info">, string> = {
  goal:         "⚽ But",
  yellow_card:  "🟨 Carton jaune",
  red_card:     "🟥 Carton rouge",
  substitution: "🔄 Changement",
};

const SELECT_CLS =
  "w-full rounded-lg border border-white/10 bg-zinc-800 px-2.5 py-1.5 text-xs font-semibold text-white focus:border-green-500/50 focus:outline-none";

type EditState = {
  event_type: Exclude<TimelineEventType, "info">;
  minute: string;
  player_name: string;
  is_own_goal: boolean;
};

function EventCard({
  ev,
  side,
  isModerator,
  onEdit,
  onDelete,
}: {
  ev: MatchTimelineEventRow;
  side: "home" | "away";
  isModerator: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const icon   = ICONS[ev.event_type];
  const isGoal = ev.event_type === "goal";
  const isSub  = ev.event_type === "substitution";
  const isRight = side === "away";

  return (
    <div className="flex flex-col gap-1">
      <div
        className={`flex max-w-[150px] items-center gap-2 rounded-xl border px-3 py-2.5 ${
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
              isSub ? "max-w-[90px]" : "max-w-[90px] truncate"
            }`}
          >
            {ev.player_name}
            {isGoal && ev.is_own_goal && (
              <span className="ml-1 rounded bg-orange-900/60 px-1 text-[9px] font-black text-orange-300">
                CSC
              </span>
            )}
          </span>
        </div>
      </div>

      {isModerator && (
        <div className={`flex gap-1 ${isRight ? "justify-end" : ""}`}>
          <button
            onClick={onEdit}
            className="flex h-5 w-5 items-center justify-center rounded bg-zinc-700 text-zinc-400 transition hover:bg-zinc-600 hover:text-white"
          >
            <Pencil className="h-2.5 w-2.5" />
          </button>
          <button
            onClick={onDelete}
            className="flex h-5 w-5 items-center justify-center rounded bg-zinc-700 text-zinc-400 transition hover:bg-red-900 hover:text-red-300"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        </div>
      )}
    </div>
  );
}

type Props = { matchId: string; isModerator: boolean };

export const MatchTimeline = memo(function MatchTimeline({ matchId, isModerator }: Props) {
  const [events, setEvents]       = useState<MatchTimelineEventRow[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm]   = useState<EditState>({
    event_type: "goal", minute: "", player_name: "", is_own_goal: false,
  });
  const [saving, setSaving]       = useState(false);

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
        { event: "INSERT", schema: "public", table: "match_timeline_events", filter: `match_id=eq.${matchId}` },
        (payload) => {
          setEvents((prev) =>
            [...prev, payload.new as MatchTimelineEventRow].sort((a, b) => a.minute - b.minute),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "match_timeline_events", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const updated = payload.new as MatchTimelineEventRow;
          setEvents((prev) =>
            prev.map((e) => (e.id === updated.id ? updated : e))
              .sort((a, b) => a.minute - b.minute),
          );
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "match_timeline_events", filter: `match_id=eq.${matchId}` },
        (payload) => {
          const deleted = payload.old as { id: string };
          setEvents((prev) => prev.filter((e) => e.id !== deleted.id));
        },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [matchId]);

  function startEdit(ev: MatchTimelineEventRow) {
    if (ev.event_type === "info") return;
    setEditingId(ev.id);
    setEditForm({
      event_type:  ev.event_type as Exclude<TimelineEventType, "info">,
      minute:      String(ev.minute),
      player_name: ev.player_name,
      is_own_goal: ev.is_own_goal,
    });
  }

  async function handleSaveEdit() {
    if (!editingId) return;
    const min = parseInt(editForm.minute);
    if (isNaN(min) || min < 0 || min > 120) { toast.error("Minute invalide (0–120)"); return; }
    if (!editForm.player_name.trim()) { toast.error("Nom du joueur manquant"); return; }

    setSaving(true);
    try {
      const res = await fetch("/api/timeline-event", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id:    editingId,
          event_type:  editForm.event_type,
          minute:      min,
          player_name: editForm.player_name.trim(),
          is_own_goal: editForm.is_own_goal,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok) { toast.error(json.error ?? "Erreur"); return; }
      toast.success("Événement modifié !");
      setEditingId(null);
    } catch {
      toast.error("Connexion perdue");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(eventId: string) {
    setSaving(true);
    try {
      const res = await fetch("/api/timeline-event", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: eventId }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok) { toast.error(json.error ?? "Erreur"); return; }
      toast.success("Événement supprimé");
    } catch {
      toast.error("Connexion perdue");
    } finally {
      setSaving(false);
    }
  }

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

      <div className="flex flex-col gap-6">
        {events.map((ev) => {
          const isInfo    = ev.event_type === "info";
          const isHome    = ev.team_side === "home";
          const isEditing = editingId === ev.id;

          // ── Événement info : bulle centrée ──────────────────────────────────
          if (isInfo) {
            return (
              <div key={ev.id} className="relative flex justify-center px-4">
                <div className="z-10 flex items-center gap-2 rounded-full border border-zinc-700/60 bg-zinc-900 px-4 py-1.5">
                  <span className="text-[10px] font-black text-zinc-500">{ev.minute}&apos;</span>
                  <span className="text-[11px] font-semibold text-zinc-400">
                    {ev.details ?? ev.player_name}
                  </span>
                </div>
              </div>
            );
          }

          // ── Événement standard : gauche / droite ────────────────────────────
          return (
            <div key={ev.id} className="flex flex-col gap-2">
              <div className="relative flex items-start">
                {/* Côté domicile */}
                <div className="flex flex-1 justify-end pr-4">
                  {isHome && (
                    <EventCard
                      ev={ev}
                      side="home"
                      isModerator={isModerator}
                      onEdit={() => startEdit(ev)}
                      onDelete={() => { void handleDelete(ev.id); }}
                    />
                  )}
                </div>

                {/* Point central */}
                <div className="z-10 mt-3 h-3 w-3 shrink-0 rounded-full bg-zinc-600 ring-2 ring-zinc-950" />

                {/* Côté extérieur */}
                <div className="flex flex-1 justify-start pl-4">
                  {!isHome && (
                    <EventCard
                      ev={ev}
                      side="away"
                      isModerator={isModerator}
                      onEdit={() => startEdit(ev)}
                      onDelete={() => { void handleDelete(ev.id); }}
                    />
                  )}
                </div>
              </div>

              {/* Formulaire d'édition inline */}
              {isEditing && (
                <div className="mx-3 rounded-xl border border-white/10 bg-zinc-800/80 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wide text-zinc-400">Modifier l&apos;événement</span>
                    <button onClick={() => setEditingId(null)} className="text-zinc-500 hover:text-white">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold text-zinc-500">Type</label>
                        <select
                          value={editForm.event_type}
                          onChange={(e) => setEditForm((f) => ({ ...f, event_type: e.target.value as Exclude<TimelineEventType, "info">, is_own_goal: false }))}
                          className={SELECT_CLS}
                        >
                          {(Object.entries(EVENT_LABELS) as [Exclude<TimelineEventType, "info">, string][]).map(([val, label]) => (
                            <option key={val} value={val}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold text-zinc-500">Minute</label>
                        <input
                          type="number" inputMode="numeric" min={0} max={120}
                          value={editForm.minute}
                          onChange={(e) => setEditForm((f) => ({ ...f, minute: e.target.value }))}
                          className={SELECT_CLS}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-bold text-zinc-500">Joueur</label>
                      <input
                        type="text"
                        value={editForm.player_name}
                        onChange={(e) => setEditForm((f) => ({ ...f, player_name: e.target.value }))}
                        className={SELECT_CLS}
                      />
                    </div>
                    {editForm.event_type === "goal" && (
                      <label className="flex cursor-pointer items-center gap-2 text-[11px] text-zinc-300">
                        <input
                          type="checkbox"
                          checked={editForm.is_own_goal}
                          onChange={(e) => setEditForm((f) => ({ ...f, is_own_goal: e.target.checked }))}
                          className="h-3.5 w-3.5 rounded accent-orange-500"
                        />
                        Contre son camp (CSC)
                      </label>
                    )}
                    <button
                      onClick={() => { void handleSaveEdit(); }}
                      disabled={saving}
                      className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-green-600 text-xs font-black text-white transition hover:bg-green-500 disabled:opacity-50"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Enregistrer
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});
