"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LoaderCircle, ChevronDown, ChevronUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { AlertActionType, LineupRow, MatchStatus, PlayerRow, TimelineEventType } from "@/types/database";
import { syncMatchData, syncTeamRoster } from "@/app/actions/syncData";

// ── Alertes communautaires ────────────────────────────────────────────────────

const ALERTS: { type: AlertActionType; emoji: string; label: string }[] = [
  { type: "penalty_check",   emoji: "📢", label: "Y'A PÉNO LÀ !!"         },
  { type: "penalty_outcome", emoji: "🥅", label: "PÉNO : AU FOND OU PAS ?" },
  { type: "var_goal",        emoji: "🚩", label: "HORS-JEU / BUT ANNULÉ ?" },
  { type: "red_card",        emoji: "🟥", label: "SORTEZ LE ROUGE !"        },
  { type: "injury_sub",      emoji: "🚑", label: "CINÉMA OU CIVIÈRE ?"      },
];

// ── Panneau de contrôle des états ─────────────────────────────────────────────

type StatusAction = { label: string; emoji: string; status: MatchStatus; color: string };

const STATUS_ACTIONS: StatusAction[] = [
  { label: "Coup d'envoi",  emoji: "⚽", status: "first_half",  color: "bg-green-600 hover:bg-green-500"   },
  { label: "Mi-temps",      emoji: "🟨", status: "half_time",   color: "bg-yellow-600 hover:bg-yellow-500" },
  { label: "Reprise",       emoji: "▶️", status: "second_half", color: "bg-green-600 hover:bg-green-500"   },
  { label: "Interruption",  emoji: "⏸️", status: "paused",      color: "bg-orange-600 hover:bg-orange-500" },
  { label: "Fin du match",  emoji: "🏁", status: "finished",    color: "bg-red-700 hover:bg-red-600"       },
];

const STATUS_LABELS: Record<MatchStatus, string> = {
  upcoming:    "À venir",
  first_half:  "1ère mi-temps",
  half_time:   "Mi-temps",
  second_half: "2ème mi-temps",
  paused:      "Interruption",
  finished:    "Terminé",
};

// ── Équipes MVP pour l'import rapide ─────────────────────────────────────────

const MVP_TEAMS = [
  { id: "133714", name: "Paris Saint-Germain",    label: "Paris SG"         },
  { id: "133664", name: "Bayern Munich",           label: "Bayern Munich"    },
  { id: "133604", name: "Arsenal",                 label: "Arsenal"          },
  { id: "133738", name: "Atletico Madrid",         label: "Atlético Madrid"  },
] as const;

// ── Feuille de match ──────────────────────────────────────────────────────────

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
  matchStatus: MatchStatus;
  isOnCooldown: boolean;
  cooldownMins: number;
  cooldownSecs: string;
  pendingType: AlertActionType | null;
  signaledTypes: Set<AlertActionType>;
  onAlert: (type: AlertActionType) => void;
  matchId: string;
  teamHome: string;
  teamAway: string;
};

// ── Composant ─────────────────────────────────────────────────────────────────

export function ActionDrawer({
  open,
  onClose,
  isModerator,
  matchStatus,
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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"alert" | "match" | "control">("alert");

  // Feuille de match
  const [lineups, setLineups]       = useState<LineupRow[]>([]);
  const [globalPlayers, setGlobalPlayers] = useState<PlayerRow[]>([]);
  const [playersFetchKey, setPlayersFetchKey] = useState(0);
  const [eventType, setEventType]   = useState<TimelineEventType>("goal");
  const [minute, setMinute]         = useState("");
  const [teamSide, setTeamSide]     = useState<"home" | "away">("home");
  const [playerName, setPlayerName] = useState("");
  const [playerOut, setPlayerOut]   = useState("");
  const [playerIn, setPlayerIn]     = useState("");
  const [isOwnGoal, setIsOwnGoal]   = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Contrôle match
  const [changingStatus, setChangingStatus] = useState(false);

  // Sync TheSportsDB
  const [syncEventId, setSyncEventId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>(MVP_TEAMS[0].id);
  const [syncDbOpen, setSyncDbOpen]   = useState(false);
  const [isSyncingMatch, startSyncMatch]   = useTransition();
  const [isSyncingRoster, startSyncRoster] = useTransition();

  // Fetch lineups (match-specific)
  useEffect(() => {
    if (!isModerator) return;
    const supabase = createClient();
    void supabase
      .from("lineups")
      .select("*")
      .eq("match_id", matchId)
      .then(({ data }) => setLineups(data ?? []));
  }, [matchId, isModerator]);

  // Normalise un nom d'équipe pour la comparaison floue (supprime FC, F.C., etc.)
  function normalizeTeam(name: string): string {
    return name
      .replace(/\b(F\.C\.|FC|AFC|RFC|SC|AC|AS|OGC|RC)\b\.?\s*/gi, "")
      .trim()
      .toLowerCase();
  }

  function teamsMatch(a: string, b: string): boolean {
    const na = normalizeTeam(a);
    const nb = normalizeTeam(b);
    return na.includes(nb) || nb.includes(na);
  }

  // Fetch global players (fallback depuis la table players)
  // On récupère TOUT (dataset MVP petit ~120 joueurs) et on filtre côté client
  // pour éviter les problèmes de parsing PostgREST avec ilike + espaces dans or()
  useEffect(() => {
    if (!isModerator) return;
    const supabase = createClient();
    void supabase
      .from("players")
      .select("*")
      .order("position", { ascending: true })
      .order("player_name", { ascending: true })
      .then(({ data }) => {
        const all = data ?? [];
        const filtered = all.filter(
          (p) => teamsMatch(p.team_name, teamHome) || teamsMatch(p.team_name, teamAway),
        );
        setGlobalPlayers(filtered);
      });
  }, [isModerator, teamHome, teamAway, playersFetchKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const resetPlayers = useCallback(() => {
    setPlayerName(""); setPlayerOut(""); setPlayerIn(""); setIsOwnGoal(false);
  }, []);

  // Starters/bench depuis lineups, sinon depuis la table players (fallback)
  const lineupsForSide = lineups.filter((p) => p.team_side === teamSide);
  const currentTeamName = teamSide === "home" ? teamHome : teamAway;
  // Comparaison floue pour absorber les variantes de noms
  const globalForSide   = globalPlayers.filter((p) => teamsMatch(p.team_name, currentTeamName));

  const hasLineups = lineupsForSide.length > 0;
  const starters: { id: string; player_name: string }[] = hasLineups
    ? lineupsForSide.filter((p) => p.status === "starter")
    : globalForSide;
  const bench: { id: string; player_name: string }[] = hasLineups
    ? lineupsForSide.filter((p) => p.status === "bench")
    : globalForSide;
  const isSub = eventType === "substitution";

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
          match_id:    matchId,
          event_type:  eventType,
          minute:      min,
          team_side:   teamSide,
          player_name: finalPlayerName,
          is_own_goal: eventType === "goal" ? isOwnGoal : false,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok) { toast.error(json.error ?? "Erreur"); return; }
      toast.success("Événement ajouté à la timeline !");
      setMinute(""); setPlayerName(""); setPlayerOut(""); setPlayerIn(""); setIsOwnGoal(false);
      onClose();
    } catch {
      toast.error("Connexion perdue");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(newStatus: MatchStatus) {
    setChangingStatus(true);
    try {
      const res = await fetch("/api/match-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: matchId, status: newStatus }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok) { toast.error(json.error ?? "Erreur"); return; }
      toast.success(`État → ${STATUS_LABELS[newStatus]}`);
      onClose();
    } catch {
      toast.error("Connexion perdue");
    } finally {
      setChangingStatus(false);
    }
  }

  function handleSyncMatch() {
    if (!syncEventId.trim()) { toast.error("Saisis un ID d'événement"); return; }
    startSyncMatch(async () => {
      try {
        const data = await syncMatchData(syncEventId);
        toast.success(`Match synchronisé : ${data.team_home} — ${data.team_away}`);
        setSyncEventId("");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur inconnue");
      }
    });
  }

  function handleSyncRoster() {
    const team = MVP_TEAMS.find((t) => t.id === selectedTeamId);
    if (!team) return;
    startSyncRoster(async () => {
      try {
        const result = await syncTeamRoster(team.id, team.name);
        toast.success(`${result.synced} joueurs synchronisés pour ${team.label} !`);
        setPlayersFetchKey((k) => k + 1);
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur inconnue");
      }
    });
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
            {/* Onglets modérateur — 3 colonnes */}
            <div className="mx-4 mb-4 grid grid-cols-3 gap-1 rounded-2xl bg-zinc-800/60 p-1">
              {(["alert", "match", "control"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-xl py-2.5 text-[11px] font-black uppercase tracking-wide transition ${
                    activeTab === tab
                      ? "bg-zinc-700 text-white shadow"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {tab === "alert" ? "📢 Alertes" : tab === "match" ? "📋 Feuille" : "🎮 Contrôle"}
                </button>
              ))}
            </div>

            {/* Contenu scrollable */}
            <div className="max-h-[60vh] overflow-y-auto">
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
                <form onSubmit={handleModSubmit} className="flex flex-col gap-3 px-4 pb-2">
                  <div>
                    <label className="mb-1.5 block text-xs font-bold text-zinc-400">Type d&apos;événement</label>
                    <select
                      value={eventType}
                      onChange={(e) => { setEventType(e.target.value as TimelineEventType); resetPlayers(); }}
                      className={SELECT_CLS}
                    >
                      {(Object.entries(EVENT_LABELS) as [TimelineEventType, string][]).map(
                        ([val, label]) => <option key={val} value={val}>{label}</option>,
                      )}
                    </select>
                  </div>

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
                        onChange={(e) => { setTeamSide(e.target.value as "home" | "away"); resetPlayers(); }}
                        className={SELECT_CLS}
                      >
                        <option value="home">{teamHome}</option>
                        <option value="away">{teamAway}</option>
                      </select>
                    </div>
                  </div>

                  {isSub ? (
                    <>
                      <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-zinc-400">
                          <span className="text-base leading-none text-red-400">↓</span>Joueur sortant
                        </label>
                        <select value={playerOut} onChange={(e) => setPlayerOut(e.target.value)} className={SELECT_CLS} disabled={starters.length === 0}>
                          <option value="">{starters.length === 0 ? "Aucun joueur disponible" : "Sélectionner…"}</option>
                          {starters.map((p) => <option key={p.id} value={p.player_name}>{p.player_name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-zinc-400">
                          <span className="text-base leading-none text-green-400">↑</span>Joueur entrant
                        </label>
                        <select value={playerIn} onChange={(e) => setPlayerIn(e.target.value)} className={SELECT_CLS} disabled={bench.length === 0}>
                          <option value="">{bench.length === 0 ? "Aucun joueur disponible" : "Sélectionner…"}</option>
                          {bench.map((p) => <option key={p.id} value={p.player_name}>{p.player_name}</option>)}
                        </select>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-zinc-400">Joueur</label>
                      <select value={playerName} onChange={(e) => setPlayerName(e.target.value)} className={SELECT_CLS} disabled={starters.length === 0}>
                        <option value="">{starters.length === 0 ? "Aucun joueur disponible" : "Sélectionner…"}</option>
                        {starters.map((p) => <option key={p.id} value={p.player_name}>{p.player_name}</option>)}
                      </select>
                    </div>
                  )}

                  {eventType === "goal" && (
                    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/8 bg-zinc-800/40 p-3 text-sm text-zinc-300">
                      <input
                        type="checkbox"
                        checked={isOwnGoal}
                        onChange={(e) => setIsOwnGoal(e.target.checked)}
                        className="h-4 w-4 rounded accent-orange-500"
                      />
                      <span className="font-semibold">Contre son camp (CSC)</span>
                    </label>
                  )}

                  <button
                    type="submit" disabled={submitting}
                    className="mt-2 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-green-500 font-black uppercase tracking-wide text-zinc-950 transition hover:bg-green-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : isSub ? "Valider le changement" : "Valider l'événement"}
                  </button>
                </form>
              )}

              {activeTab === "control" && (
                <div className="flex flex-col gap-4 px-4 pb-2">
                  {/* État actuel */}
                  <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-zinc-800/40 px-4 py-3">
                    <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">État actuel</span>
                    <span className="rounded-lg bg-zinc-700 px-3 py-1 text-xs font-black text-white">
                      {STATUS_LABELS[matchStatus]}
                    </span>
                  </div>

                  {/* Boutons d'état */}
                  <div className="grid grid-cols-2 gap-3">
                    {STATUS_ACTIONS.map(({ label, emoji, status, color }) => (
                      <button
                        key={status}
                        onClick={() => { void handleStatusChange(status); }}
                        disabled={changingStatus || matchStatus === status}
                        className={`flex h-16 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-black uppercase tracking-wide text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
                          matchStatus === status ? "border-2 border-white/30 bg-zinc-700" : color
                        }`}
                      >
                        <span className="text-xl leading-none">{emoji}</span>
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* ── Section TheSportsDB ── */}
                  <div className="rounded-2xl border border-zinc-700/50 bg-zinc-800/30">
                    <button
                      onClick={() => setSyncDbOpen((v) => !v)}
                      className="flex w-full items-center justify-between px-4 py-3"
                    >
                      <span className="text-xs font-black uppercase tracking-wide text-zinc-400">
                        📡 Base de données (TheSportsDB)
                      </span>
                      {syncDbOpen
                        ? <ChevronUp className="h-4 w-4 text-zinc-500" />
                        : <ChevronDown className="h-4 w-4 text-zinc-500" />
                      }
                    </button>

                    {syncDbOpen && (
                      <div className="flex flex-col gap-4 px-4 pb-4">
                        {/* A. Import d'un match */}
                        <div>
                          <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-zinc-500">
                            A. Import d&apos;un match
                          </p>
                          <input
                            type="text"
                            inputMode="numeric"
                            placeholder="ID de l'événement (ex: 1234567)"
                            value={syncEventId}
                            onChange={(e) => setSyncEventId(e.target.value)}
                            className="mb-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-green-500/50 focus:outline-none"
                          />
                          <button
                            onClick={handleSyncMatch}
                            disabled={isSyncingMatch || !syncEventId.trim()}
                            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs font-black uppercase tracking-wide text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSyncingMatch
                              ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Synchronisation…</>
                              : "📥 Synchroniser le Match"
                            }
                          </button>
                        </div>

                        <div className="h-px bg-zinc-700/50" />

                        {/* B. Import rapide effectifs MVP */}
                        <div>
                          <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-zinc-500">
                            B. Effectif rapide MVP
                          </p>
                          <select
                            value={selectedTeamId}
                            onChange={(e) => setSelectedTeamId(e.target.value)}
                            className="mb-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-white focus:border-green-500/50 focus:outline-none"
                          >
                            {MVP_TEAMS.map((t) => (
                              <option key={t.id} value={t.id}>{t.label}</option>
                            ))}
                          </select>
                          <button
                            onClick={handleSyncRoster}
                            disabled={isSyncingRoster}
                            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 text-xs font-black uppercase tracking-wide text-white transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSyncingRoster
                              ? <><LoaderCircle className="h-4 w-4 animate-spin" /> Synchronisation…</>
                              : "🔄 Mettre à jour l'effectif complet"
                            }
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
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

// ── Grille d'alertes uniforme (grid-cols-2 — tous boutons identiques) ─────────

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
          <span className="font-bold text-yellow-400">{cooldownMins}:{cooldownSecs}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 px-4">
      {ALERTS.map(({ type, emoji, label }) => {
        const isPending  = pendingType === type;
        const isSignaled = signaledTypes.has(type);
        const disabled   = !!pendingType || isSignaled;

        return (
          <button
            key={type}
            onClick={() => onAlert(type)}
            disabled={disabled}
            className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
              isSignaled
                ? "border-yellow-400/40 bg-yellow-400/10"
                : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700"
            }`}
          >
            <span className="text-3xl leading-none">
              {isPending ? "" : isSignaled ? "⏳" : emoji}
            </span>
            {isPending ? (
              <LoaderCircle className="h-4 w-4 animate-spin text-zinc-400" />
            ) : (
              <span className={`px-2 text-center text-[11px] font-black uppercase leading-tight ${
                isSignaled ? "text-yellow-400" : "text-zinc-300"
              }`}>
                {isSignaled ? "En attente…" : label}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
