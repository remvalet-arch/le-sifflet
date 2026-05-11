"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronLeft,
  LoaderCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { syncMatchData, syncTeamRoster } from "@/app/actions/syncData";
import type {
  LineupRow,
  MarketEventRow,
  MatchRow,
  MatchStatus,
  PlayerRow,
  TimelineEventType,
} from "@/types/database";

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<MatchStatus, string> = {
  upcoming: "À venir",
  first_half: "1ère mi-temps",
  half_time: "Mi-temps",
  second_half: "2ème mi-temps",
  paused: "Interruption",
  finished: "Terminé",
  cancelled: "Annulé",
  postponed: "Reporté",
};

const STATUS_ACTIONS = [
  {
    label: "Coup d'envoi",
    emoji: "⚽",
    status: "first_half" as MatchStatus,
    color: "bg-green-600 hover:bg-green-500",
  },
  {
    label: "Mi-temps",
    emoji: "🟨",
    status: "half_time" as MatchStatus,
    color: "bg-yellow-600 hover:bg-yellow-500",
  },
  {
    label: "Reprise",
    emoji: "▶️",
    status: "second_half" as MatchStatus,
    color: "bg-green-600 hover:bg-green-500",
  },
  {
    label: "Interruption",
    emoji: "⏸️",
    status: "paused" as MatchStatus,
    color: "bg-orange-600 hover:bg-orange-500",
  },
  {
    label: "Fin du match",
    emoji: "🏁",
    status: "finished" as MatchStatus,
    color: "bg-red-700 hover:bg-red-600",
  },
];

const TYPE_LABELS: Record<string, string> = {
  penalty: "Péno",
  offside: "Hors-jeu",
  card: "Carton",
};

const EVENT_LABELS: Record<Exclude<TimelineEventType, "info">, string> = {
  goal: "⚽ But",
  yellow_card: "🟨 Carton jaune",
  red_card: "🟥 Carton rouge",
  substitution: "🔄 Changement",
};

const MVP_TEAMS = [
  { id: "133714", name: "Paris Saint-Germain", label: "Paris SG" },
  { id: "133664", name: "Bayern Munich", label: "Bayern Munich" },
  { id: "133604", name: "Arsenal", label: "Arsenal" },
  { id: "133738", name: "Atletico Madrid", label: "Atlético Madrid" },
] as const;

const SELECT_CLS =
  "w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-white focus:border-whistle/50 focus:outline-none disabled:opacity-40";

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

// ── Types ─────────────────────────────────────────────────────────────────────

type Tab = "alertes" | "match" | "controle";

type Props = {
  match: MatchRow;
  eventsWithAge: { event: MarketEventRow; ageMin: number }[];
};

// ── Composant principal ───────────────────────────────────────────────────────

export function AdminMatchClient({ match, eventsWithAge }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>("alertes");
  const [matchStatus, setMatchStatus] = useState<MatchStatus>(match.status);

  const tabs: { key: Tab; label: string; emoji: string }[] = [
    { key: "alertes", label: "Alertes VAR", emoji: "🚨" },
    { key: "match", label: "Feuille", emoji: "📋" },
    { key: "controle", label: "Contrôle", emoji: "⚙️" },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-white">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/resolve"
            className="flex items-center gap-1 text-sm text-zinc-400 transition hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
            Tous les matchs
          </Link>
          <span className="rounded-lg bg-zinc-800 px-3 py-1 text-xs font-black uppercase tracking-widest text-whistle">
            {STATUS_LABELS[matchStatus]}
          </span>
        </div>

        <div>
          <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
            Panneau modérateur
          </p>
          <h1 className="mt-1 text-2xl font-black text-white">
            {match.team_home} <span className="text-zinc-600">vs</span>{" "}
            {match.team_away}
          </h1>
          <p className="mt-0.5 text-xs text-zinc-600">{match.id}</p>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-zinc-800/60 p-1">
          {tabs.map(({ key, label, emoji }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`rounded-xl py-3 text-xs font-black uppercase tracking-wide transition ${
                activeTab === key
                  ? "bg-zinc-700 text-white shadow"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <span className="mr-1.5">{emoji}</span>
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "alertes" && (
          <AlertesTab eventsWithAge={eventsWithAge} />
        )}
        {activeTab === "match" && (
          <FeuilleTab
            matchId={match.id}
            teamHome={match.team_home}
            teamAway={match.team_away}
          />
        )}
        {activeTab === "controle" && (
          <ControleTab
            matchId={match.id}
            matchStatus={matchStatus}
            onStatusChange={setMatchStatus}
          />
        )}
      </div>
    </main>
  );
}

// ── Alertes VAR ───────────────────────────────────────────────────────────────

function AlertesTab({
  eventsWithAge,
}: {
  eventsWithAge: { event: MarketEventRow; ageMin: number }[];
}) {
  const router = useRouter();

  if (eventsWithAge.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center text-sm text-zinc-500">
        Aucun événement VAR ouvert pour ce match.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {eventsWithAge.map(({ event, ageMin }) => (
        <EventCard
          key={event.id}
          event={event}
          ageMin={ageMin}
          onResolved={() => router.refresh()}
        />
      ))}
    </div>
  );
}

function EventCard({
  event,
  ageMin,
  onResolved,
}: {
  event: MarketEventRow;
  ageMin: number;
  onResolved: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function forceResolve(result: "oui" | "non") {
    setLoading(result);
    try {
      const res = await fetch("/api/admin/resolve-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: event.id, result }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Erreur inattendue");
        return;
      }
      toast.success(`Résolu : ${result.toUpperCase()} — gains distribués !`);
      onResolved();
    } catch {
      toast.error("Connexion perdue");
    } finally {
      setLoading(null);
    }
  }

  async function autoVerify() {
    setLoading("auto");
    try {
      const res = await fetch("/api/verify-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: event.id }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { status: string; result?: string };
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error ?? "Erreur inattendue");
        return;
      }
      const status = json.data?.status;
      if (status === "resolved") {
        toast.success(
          `Auto-résolu : ${json.data?.result?.toUpperCase()} — gains distribués !`,
        );
        onResolved();
      } else if (status === "too_early") {
        toast.info(`Trop tôt — event âgé de ${ageMin} min (min. 3 min)`);
      } else {
        toast.info("API externe : données pas encore disponibles");
      }
    } catch {
      toast.error("Connexion perdue");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-whistle">
            {TYPE_LABELS[event.type] ?? event.type}
          </span>
          <p className="mt-0.5 text-xs text-zinc-500">
            il y a {ageMin} min · id: {event.id.slice(0, 8)}…
          </p>
        </div>
        <span className="rounded-lg bg-zinc-800 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-zinc-400">
          {event.status}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => forceResolve("oui")}
          disabled={!!loading}
          className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-black text-white transition hover:bg-green-500 disabled:opacity-50"
        >
          {loading === "oui" ? "…" : "✅ OUI"}
        </button>
        <button
          onClick={() => forceResolve("non")}
          disabled={!!loading}
          className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-black text-white transition hover:bg-red-500 disabled:opacity-50"
        >
          {loading === "non" ? "…" : "❌ NON"}
        </button>
        <button
          onClick={autoVerify}
          disabled={!!loading}
          className="flex-1 rounded-xl border border-whistle/40 py-2.5 text-sm font-bold text-whistle transition hover:bg-whistle/10 disabled:opacity-50"
        >
          {loading === "auto" ? "…" : "🤖 Auto"}
        </button>
      </div>
    </div>
  );
}

// ── Feuille de match ──────────────────────────────────────────────────────────

function FeuilleTab({
  matchId,
  teamHome,
  teamAway,
}: {
  matchId: string;
  teamHome: string;
  teamAway: string;
}) {
  const [lineups, setLineups] = useState<LineupRow[]>([]);
  const [globalPlayers, setGlobalPlayers] = useState<PlayerRow[]>([]);
  const [eventType, setEventType] = useState<TimelineEventType>("goal");
  const [minute, setMinute] = useState("");
  const [teamSide, setTeamSide] = useState<"home" | "away">("home");
  const [playerName, setPlayerName] = useState("");
  const [playerOut, setPlayerOut] = useState("");
  const [playerIn, setPlayerIn] = useState("");
  const [isOwnGoal, setIsOwnGoal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("lineups")
      .select("*")
      .eq("match_id", matchId)
      .then(({ data }) => setLineups(data ?? []));
  }, [matchId]);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("players")
      .select("*")
      .order("position", { ascending: true })
      .order("player_name", { ascending: true })
      .then(({ data }) => {
        const all = data ?? [];
        setGlobalPlayers(
          all.filter(
            (p) =>
              teamsMatch(p.team_name, teamHome) ||
              teamsMatch(p.team_name, teamAway),
          ),
        );
      });
  }, [matchId, teamHome, teamAway]);

  const resetPlayers = useCallback(() => {
    setPlayerName("");
    setPlayerOut("");
    setPlayerIn("");
    setIsOwnGoal(false);
  }, []);

  const lineupsForSide = lineups.filter((p) => p.team_side === teamSide);
  const currentTeamName = teamSide === "home" ? teamHome : teamAway;
  const globalForSide = globalPlayers.filter((p) =>
    teamsMatch(p.team_name, currentTeamName),
  );
  const hasLineups = lineupsForSide.length > 0;
  const starters: { id: string; player_name: string }[] = hasLineups
    ? lineupsForSide.filter((p) => p.status === "starter")
    : globalForSide;
  const bench: { id: string; player_name: string }[] = hasLineups
    ? lineupsForSide.filter((p) => p.status === "bench")
    : globalForSide;
  const isSub = eventType === "substitution";

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
          is_own_goal: eventType === "goal" ? isOwnGoal : false,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Erreur");
        return;
      }
      toast.success("Événement ajouté à la timeline !");
      setMinute("");
      resetPlayers();
    } catch {
      toast.error("Connexion perdue");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
              <option key={val} value={val}>
                {label}
              </option>
            ),
          )}
        </select>
      </div>

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

      {isSub ? (
        <>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-zinc-400">
              ↓ Joueur sortant
            </label>
            <select
              value={playerOut}
              onChange={(e) => setPlayerOut(e.target.value)}
              className={SELECT_CLS}
              disabled={starters.length === 0}
            >
              <option value="">
                {starters.length === 0 ? "Aucun titulaire" : "Sélectionner…"}
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
              ↑ Joueur entrant
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

      {eventType === "goal" && (
        <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/8 bg-zinc-800/40 p-3 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={isOwnGoal}
            onChange={(e) => setIsOwnGoal(e.target.checked)}
            className="h-4 w-4 rounded accent-orange-500"
          />
          <span className="font-semibold">But contre son camp (CSC)</span>
        </label>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-green-500 font-black uppercase tracking-wide text-zinc-950 transition hover:bg-green-400 disabled:opacity-50"
      >
        {submitting ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : (
          "Valider l'événement"
        )}
      </button>
    </form>
  );
}

// ── Contrôle du match ─────────────────────────────────────────────────────────

function ControleTab({
  matchId,
  matchStatus,
  onStatusChange,
}: {
  matchId: string;
  matchStatus: MatchStatus;
  onStatusChange: (s: MatchStatus) => void;
}) {
  const [changingStatus, setChangingStatus] = useState(false);
  const [syncDbOpen, setSyncDbOpen] = useState(false);
  const [syncEventId, setSyncEventId] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>(MVP_TEAMS[0].id);
  const [isSyncingMatch, startSyncMatch] = useTransition();
  const [isSyncingRoster, startSyncRoster] = useTransition();
  const router = useRouter();

  async function handleStatusChange(newStatus: MatchStatus) {
    setChangingStatus(true);
    const endpoint =
      newStatus === "finished" ? "/api/admin/finish-match" : "/api/match-state";
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: matchId, status: newStatus }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok) {
        toast.error(json.error ?? "Erreur");
        return;
      }
      toast.success(
        newStatus === "finished"
          ? "Match terminé — Paris long terme résolus !"
          : `État → ${STATUS_LABELS[newStatus]}`,
      );
      onStatusChange(newStatus);
    } catch {
      toast.error("Connexion perdue");
    } finally {
      setChangingStatus(false);
    }
  }

  function handleSyncMatch() {
    if (!syncEventId.trim()) {
      toast.error("Saisis un ID d'événement");
      return;
    }
    startSyncMatch(async () => {
      try {
        const data = await syncMatchData(syncEventId);
        toast.success(
          `Match synchronisé : ${data.team_home} — ${data.team_away}`,
        );
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
        toast.success(
          `${result.synced} joueurs synchronisés pour ${team.label} !`,
        );
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur inconnue");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Current status */}
      <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-zinc-800/40 px-4 py-3">
        <span className="text-xs font-bold uppercase tracking-wide text-zinc-500">
          État actuel
        </span>
        <span className="rounded-lg bg-zinc-700 px-3 py-1 text-xs font-black text-white">
          {STATUS_LABELS[matchStatus]}
        </span>
      </div>

      {/* Status buttons */}
      <div className="grid grid-cols-2 gap-3">
        {STATUS_ACTIONS.map(({ label, emoji, status, color }) => (
          <button
            key={status}
            onClick={() => {
              void handleStatusChange(status);
            }}
            disabled={changingStatus || matchStatus === status}
            className={`flex h-16 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-black uppercase tracking-wide text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 ${
              matchStatus === status
                ? "border-2 border-white/30 bg-zinc-700"
                : color
            }`}
          >
            <span className="text-xl leading-none">{emoji}</span>
            {label}
          </button>
        ))}
      </div>

      {/* TheSportsDB sync */}
      <div className="rounded-2xl border border-zinc-700/50 bg-zinc-800/30">
        <button
          onClick={() => setSyncDbOpen((v) => !v)}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <span className="text-xs font-black uppercase tracking-wide text-zinc-400">
            Sync base de données
          </span>
          {syncDbOpen ? (
            <ChevronUp className="h-4 w-4 text-zinc-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-zinc-500" />
          )}
        </button>

        {syncDbOpen && (
          <div className="flex flex-col gap-4 px-4 pb-4">
            {/* Import match */}
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Importer un match (ID TheSportsDB)
              </p>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ex : 12345678"
                value={syncEventId}
                onChange={(e) => setSyncEventId(e.target.value)}
                className="mb-2 w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:border-whistle/50 focus:outline-none"
              />
              <button
                onClick={handleSyncMatch}
                disabled={isSyncingMatch || !syncEventId.trim()}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 text-xs font-black uppercase tracking-wide text-white transition hover:bg-blue-500 disabled:opacity-50"
              >
                {isSyncingMatch ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" /> Sync…
                  </>
                ) : (
                  "Synchroniser le match"
                )}
              </button>
            </div>

            <div className="h-px bg-zinc-700/50" />

            {/* Import roster */}
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-zinc-500">
                Import effectif MVP
              </p>
              <select
                value={selectedTeamId}
                onChange={(e) => setSelectedTeamId(e.target.value)}
                className="mb-2 w-full rounded-xl border border-white/10 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-white focus:border-whistle/50 focus:outline-none"
              >
                {MVP_TEAMS.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.label}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSyncRoster}
                disabled={isSyncingRoster}
                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-purple-600 text-xs font-black uppercase tracking-wide text-white transition hover:bg-purple-500 disabled:opacity-50"
              >
                {isSyncingRoster ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" /> Sync…
                  </>
                ) : (
                  "Importer l'effectif"
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
