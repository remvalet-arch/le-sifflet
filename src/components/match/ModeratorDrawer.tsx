"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { TimelineEventType, LineupRow } from "@/types/database";

const EVENT_LABELS: Record<Exclude<TimelineEventType, "info">, string> = {
  goal: "⚽ But",
  yellow_card: "🟨 Carton jaune",
  red_card: "🟥 Carton rouge",
  substitution: "🔄 Changement",
};

const SELECT_CLS =
  "w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-white focus:border-green-500/50 focus:outline-none disabled:opacity-40";

type Props = {
  open: boolean;
  onClose: () => void;
  matchId: string;
  teamHome: string;
  teamAway: string;
};

export function ModeratorDrawer({
  open,
  onClose,
  matchId,
  teamHome,
  teamAway,
}: Props) {
  const [lineups, setLineups] = useState<LineupRow[]>([]);
  const [eventType, setEventType] = useState<TimelineEventType>("goal");
  const [minute, setMinute] = useState("");
  const [teamSide, setTeamSide] = useState<"home" | "away">("home");
  const [playerName, setPlayerName] = useState("");
  const [playerOut, setPlayerOut] = useState("");
  const [playerIn, setPlayerIn] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch lineups once
  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("lineups")
      .select("*")
      .eq("match_id", matchId)
      .then(({ data }) => setLineups(data ?? []));
  }, [matchId]);

  const starters = lineups.filter(
    (p) => p.team_side === teamSide && p.status === "starter",
  );
  const bench = lineups.filter(
    (p) => p.team_side === teamSide && p.status === "bench",
  );

  const isSub = eventType === "substitution";

  const resetPlayers = useCallback(() => {
    setPlayerName("");
    setPlayerOut("");
    setPlayerIn("");
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const min = parseInt(minute);
    if (isNaN(min) || min < 0 || min > 120) {
      toast.error("Minute invalide (0–120)");
      return;
    }

    const finalPlayerName = isSub
      ? playerOut && playerIn
        ? `${playerOut} → ${playerIn}`
        : ""
      : playerName;

    if (!finalPlayerName) {
      toast.error(
        isSub ? "Sélectionne les deux joueurs" : "Sélectionne un joueur",
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/timeline-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          match_id: matchId,
          event_type: eventType,
          minute: min,
          team_side: teamSide,
          player_name: finalPlayerName,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Erreur inattendue");
        return;
      }
      toast.success("Événement ajouté à la timeline !");
      setMinute("");
      setPlayerName("");
      setPlayerOut("");
      setPlayerIn("");
      onClose();
    } catch {
      toast.error("Connexion perdue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[90] bg-black/60 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[100] rounded-t-3xl border-t border-white/10 bg-zinc-900 px-4 pt-4 transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-zinc-700" />

        <p className="mb-5 text-center text-xs font-black uppercase tracking-widest text-zinc-500">
          Espace Officiel
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Type */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-400">
              Type d&apos;événement
            </label>
            <select
              value={eventType}
              onChange={(e) => {
                setEventType(e.target.value as TimelineEventType);
                resetPlayers();
              }}
              className={SELECT_CLS}
            >
              {(
                Object.entries(EVENT_LABELS) as [TimelineEventType, string][]
              ).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Minute + Équipe */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-400">
                Minute
              </label>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={120}
                placeholder="74"
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                className={SELECT_CLS}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-400">
                Équipe
              </label>
              <select
                value={teamSide}
                onChange={(e) => {
                  setTeamSide(e.target.value as "home" | "away");
                  resetPlayers();
                }}
                className={SELECT_CLS}
              >
                <option value="home">{teamHome}</option>
                <option value="away">{teamAway}</option>
              </select>
            </div>
          </div>

          {/* Joueur(s) — dynamique selon le type */}
          {isSub ? (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-400">
                  🔴 Joueur sortant
                </label>
                <select
                  value={playerOut}
                  onChange={(e) => setPlayerOut(e.target.value)}
                  className={SELECT_CLS}
                  disabled={starters.length === 0}
                >
                  <option value="">
                    {starters.length === 0
                      ? "Aucun titulaire"
                      : "Sélectionner…"}
                  </option>
                  {starters.map((p) => (
                    <option key={p.id} value={p.player_name}>
                      {p.player_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold text-zinc-400">
                  🟢 Joueur entrant
                </label>
                <select
                  value={playerIn}
                  onChange={(e) => setPlayerIn(e.target.value)}
                  className={SELECT_CLS}
                  disabled={bench.length === 0}
                >
                  <option value="">
                    {bench.length === 0 ? "Aucun remplaçant" : "Sélectionner…"}
                  </option>
                  {bench.map((p) => (
                    <option key={p.id} value={p.player_name}>
                      {p.player_name}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="mb-1.5 block text-xs font-bold text-zinc-400">
                Joueur
              </label>
              <select
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className={SELECT_CLS}
                disabled={starters.length === 0}
              >
                <option value="">
                  {starters.length === 0
                    ? "Aucun titulaire disponible"
                    : "Sélectionner…"}
                </option>
                {starters.map((p) => (
                  <option key={p.id} value={p.player_name}>
                    {p.player_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-green-500 font-black uppercase tracking-wide text-zinc-950 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              "Valider"
            )}
          </button>
        </form>
      </div>
    </>
  );
}
