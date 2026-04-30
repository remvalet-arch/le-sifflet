"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { LoaderCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AlertActionType, LineupRow, TimelineEventType } from "@/types/database";

// ── Alertes communautaires ────────────────────────────────────────────────────

const ALERTS: {
  type: AlertActionType;
  emoji: string;
  label: string;
  featured?: boolean;
}[] = [
  { type: "penalty_check",   emoji: "📢", label: "Y'A PÉNO LÀ !!",          featured: true },
  { type: "penalty_outcome", emoji: "🥅", label: "PÉNO : AU FOND OU PAS ?" },
  { type: "var_goal",        emoji: "🚩", label: "HORS-JEU / BUT ANNULÉ ?"  },
  { type: "red_card",        emoji: "🟥", label: "SORTEZ LE ROUGE !"         },
  { type: "injury_sub",      emoji: "🚑", label: "CINÉMA OU CIVIÈRE ?"       },
];

// ── Feuille de match (modérateurs) ───────────────────────────────────────────

const EVENT_LABELS: Record<TimelineEventType, string> = {
  goal:         "⚽ But",
  yellow_card:  "🟨 Carton jaune",
  red_card:     "🟥 Carton rouge",
  substitution: "🔄 Changement",
};

const SELECT_CLS =
  "w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-white focus:border-green-500/50 focus:outline-none disabled:opacity-40";

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  open: boolean;
  onClose: () => void;
  isModerator: boolean;
  // Alertes
  isOnCooldown: boolean;
  cooldownMins: number;
  cooldownSecs: string;
  pendingType: AlertActionType | null;
  signaledTypes: Set<AlertActionType>;
  onAlert: (type: AlertActionType) => void;
  // Feuille de match
  matchId: string;
  teamHome: string;
  teamAway: string;
};

// ── Composant ─────────────────────────────────────────────────────────────────

export function ActionDrawer({
  open,
  onClose,
  isModerator,
  isOnCooldown,
  cooldownMins,
  cooldownSecs,
  pendingType,
  signaledTypes,
  onAlert,
  matchId,
  teamHome,
  teamAway,
}: Props) {
  const [activeTab, setActiveTab] = useState<"alert" | "match">("alert");

  // Feuille de match state
  const [lineups, setLineups]         = useState<LineupRow[]>([]);
  const [eventType, setEventType]     = useState<TimelineEventType>("goal");
  const [minute, setMinute]           = useState("");
  const [teamSide, setTeamSide]       = useState<"home" | "away">("home");
  const [playerName, setPlayerName]   = useState("");
  const [playerOut, setPlayerOut]     = useState("");
  const [playerIn, setPlayerIn]       = useState("");
  const [submitting, setSubmitting]   = useState(false);

  // Fetch lineups une fois (uniquement pour les mods)
  useEffect(() => {
    if (!isModerator) return;
    const supabase = createClient();
    void supabase
      .from("lineups")
      .select("*")
      .eq("match_id", matchId)
      .then(({ data }) => setLineups(data ?? []));
  }, [matchId, isModerator]);

  const resetPlayers = useCallback(() => {
    setPlayerName("");
    setPlayerOut("");
    setPlayerIn("");
  }, []);

  const starters = lineups.filter((p) => p.team_side === teamSide && p.status === "starter");
  const bench    = lineups.filter((p) => p.team_side === teamSide && p.status === "bench");
  const isSub    = eventType === "substitution";

  async function handleModSubmit(e: React.FormEvent) {
    e.preventDefault();
    const min = parseInt(minute);
    if (isNaN(min) || min < 0 || min > 120) { toast.error("Minute invalide (0–120)"); return; }

    const finalPlayerName = isSub
      ? (playerOut && playerIn ? `${playerOut} → ${playerIn}` : "")
      : playerName;

    if (!finalPlayerName) {
      toast.error(isSub ? "Sélectionne les deux joueurs" : "Sélectionne un joueur");
      return;
    }

    setSubmitting(true);
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
      if (!res.ok) { toast.error(json.error ?? "Erreur"); return; }
      toast.success("Événement ajouté à la timeline !");
      setMinute("");
      setPlayerName("");
      setPlayerOut("");
      setPlayerIn("");
      onClose();
    } catch {
      toast.error("Connexion perdue");
    } finally {
      setSubmitting(false);
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
        className={`fixed bottom-0 left-0 right-0 z-[100] rounded-t-3xl border-t border-white/10 bg-zinc-900 pt-4 transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        {/* Drag handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700" />

        {isModerator ? (
          <>
            {/* Onglets modérateur */}
            <div className="mx-4 mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-zinc-800/60 p-1">
              {(["alert", "match"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-xl py-2.5 text-xs font-black uppercase tracking-wide transition ${
                    activeTab === tab
                      ? "bg-zinc-700 text-white shadow"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab === "alert" ? "📢 Alerte VAR" : "📋 Feuille de match"}
                </button>
              ))}
            </div>

            {activeTab === "alert" && (
              <AlertGrid
                isOnCooldown={isOnCooldown}
                cooldownMins={cooldownMins}
                cooldownSecs={cooldownSecs}
                pendingType={pendingType}
                signaledTypes={signaledTypes}
                onAlert={(type) => { onAlert(type); onClose(); }}
              />
            )}

            {activeTab === "match" && (
              <form onSubmit={handleModSubmit} className="flex flex-col gap-3 px-4">
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
                    {(Object.entries(EVENT_LABELS) as [TimelineEventType, string][]).map(
                      ([val, label]) => (
                        <option key={val} value={val}>{label}</option>
                      ),
                    )}
                  </select>
                </div>

                {/* Minute + Équipe */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-zinc-400">Minute</label>
                    <input
                      type="number" inputMode="numeric" min={0} max={120} placeholder="74"
                      value={minute} onChange={(e) => setMinute(e.target.value)}
                      className={SELECT_CLS}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-zinc-400">Équipe</label>
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

                {/* Joueur(s) */}
                {isSub ? (
                  <>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-zinc-400">🔴 Joueur sortant</label>
                      <select value={playerOut} onChange={(e) => setPlayerOut(e.target.value)} className={SELECT_CLS} disabled={starters.length === 0}>
                        <option value="">{starters.length === 0 ? "Aucun titulaire" : "Sélectionner…"}</option>
                        {starters.map((p) => <option key={p.id} value={p.player_name}>{p.player_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-zinc-400">🟢 Joueur entrant</label>
                      <select value={playerIn} onChange={(e) => setPlayerIn(e.target.value)} className={SELECT_CLS} disabled={bench.length === 0}>
                        <option value="">{bench.length === 0 ? "Aucun remplaçant" : "Sélectionner…"}</option>
                        {bench.map((p) => <option key={p.id} value={p.player_name}>{p.player_name}</option>)}
                      </select>
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-zinc-400">Joueur</label>
                    <select value={playerName} onChange={(e) => setPlayerName(e.target.value)} className={SELECT_CLS} disabled={starters.length === 0}>
                      <option value="">{starters.length === 0 ? "Aucun titulaire disponible" : "Sélectionner…"}</option>
                      {starters.map((p) => <option key={p.id} value={p.player_name}>{p.player_name}</option>)}
                    </select>
                  </div>
                )}

                <button
                  type="submit" disabled={submitting}
                  className="mt-1 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-green-500 font-black uppercase tracking-wide text-zinc-950 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : "Valider"}
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <p className="mb-4 text-center text-xs font-black uppercase tracking-widest text-zinc-500">
              Que se passe-t-il ?
            </p>
            <AlertGrid
              isOnCooldown={isOnCooldown}
              cooldownMins={cooldownMins}
              cooldownSecs={cooldownSecs}
              pendingType={pendingType}
              signaledTypes={signaledTypes}
              onAlert={(type) => { onAlert(type); onClose(); }}
            />
          </>
        )}
      </div>
    </>
  );
}

// ── Grille d'alertes (composant interne) ─────────────────────────────────────

function AlertGrid({
  isOnCooldown,
  cooldownMins,
  cooldownSecs,
  pendingType,
  signaledTypes,
  onAlert,
}: {
  isOnCooldown: boolean;
  cooldownMins: number;
  cooldownSecs: string;
  pendingType: AlertActionType | null;
  signaledTypes: Set<AlertActionType>;
  onAlert: (type: AlertActionType) => void;
}) {
  if (isOnCooldown) {
    return (
      <div className="mx-4 flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-6 py-8 text-center">
        <LoaderCircle className="h-8 w-8 animate-spin text-yellow-400" />
        <p className="font-black uppercase tracking-wide text-white">L&apos;arbitre consulte la VAR…</p>
        <p className="text-sm text-zinc-400">
          Retour dans{" "}
          <span className="font-bold text-yellow-400">
            {cooldownMins}:{cooldownSecs}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 px-4">
      {ALERTS.map(({ type, emoji, label, featured }) => {
        const isPending  = pendingType === type;
        const isSignaled = signaledTypes.has(type);
        const disabled   = !!pendingType || isSignaled;

        if (featured) {
          return (
            <button
              key={type}
              onClick={() => onAlert(type)}
              disabled={disabled}
              className={`col-span-2 flex h-20 items-center justify-center gap-3 rounded-2xl border-2 bg-zinc-800 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                isSignaled ? "border-yellow-400/50 bg-yellow-400/10" : "border-green-500/50 hover:bg-zinc-700"
              }`}
            >
              <span className="text-3xl leading-none">
                {isPending ? "" : isSignaled ? "⏳" : emoji}
              </span>
              {isPending ? (
                <LoaderCircle className="h-5 w-5 animate-spin text-zinc-400" />
              ) : (
                <span className={`text-base font-black uppercase tracking-wide ${isSignaled ? "text-yellow-400" : "text-white"}`}>
                  {isSignaled ? "Signal envoyé…" : label}
                </span>
              )}
            </button>
          );
        }

        return (
          <button
            key={type}
            onClick={() => onAlert(type)}
            disabled={disabled}
            className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border bg-zinc-800 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
              isSignaled ? "border-yellow-400/40 bg-yellow-400/10" : "border-zinc-700 hover:bg-zinc-700"
            }`}
          >
            <span className="text-3xl leading-none">
              {isPending ? "" : isSignaled ? "⏳" : emoji}
            </span>
            {isPending ? (
              <LoaderCircle className="h-4 w-4 animate-spin text-zinc-400" />
            ) : (
              <span className={`px-2 text-center text-[11px] font-black uppercase leading-tight ${isSignaled ? "text-yellow-400" : "text-zinc-300"}`}>
                {isSignaled ? "En attente…" : label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
