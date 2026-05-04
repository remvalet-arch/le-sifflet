"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Bell, Check, Plus, Minus, Target } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatRelative } from "date-fns";
import { fr } from "date-fns/locale";

type MatchStub = {
  id: string;
  team_home: string;
  team_away: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_logo: string | null;
  away_team_logo: string | null;
  start_time: string;
  round_short: string | null;
  status: string;
};

type ExistingProno = {
  match_id: string;
  prono_type: string;
  prono_value: string;
};

type ScorerEntry = { name: string; goals: number };
type ScorersAlloc = { home: ScorerEntry[]; away: ScorerEntry[] };

export type PlayerForSelect = {
  player_name: string;
  position?: string | null;
  cutout_url?: string | null;
  image_url?: string | null;
};

type MatchWithPlayers = MatchStub & {
  /** Joueurs pré-chargés côté serveur (fallback squad). Enrichis côté client si lineup dispo. */
  home_players?: PlayerForSelect[];
  away_players?: PlayerForSelect[];
};

const CSC_ENTRY: PlayerForSelect = { player_name: "CSC" };

/** Charge les joueurs pour une carte prono : lineups en priorité, fallback players table. */
async function fetchPlayersForMatch(
  matchId: string,
  homeTeamId: string | null,
  awayTeamId: string | null,
): Promise<{ home: PlayerForSelect[]; away: PlayerForSelect[] }> {
  const supabase = createClient();

  // 1. Lineups (compos officielles)
  const { data: lineups } = await supabase
    .from("lineups")
    .select("player_name, team_side, position")
    .eq("match_id", matchId);

  const VALID_POSITIONS = new Set(["A", "M", "D", "G"]);

  if (lineups && lineups.length > 0) {
    const home = lineups
      .filter((r) => r.team_side === "home" && VALID_POSITIONS.has(r.position))
      .map((r) => ({ player_name: r.player_name, position: r.position }));
    const away = lineups
      .filter((r) => r.team_side === "away" && VALID_POSITIONS.has(r.position))
      .map((r) => ({ player_name: r.player_name, position: r.position }));
    return {
      home: [CSC_ENTRY, ...home],
      away: [CSC_ENTRY, ...away],
    };
  }

  // 2. Fallback : effectif complet depuis la table players
  const teamIds = [homeTeamId, awayTeamId].filter(Boolean) as string[];
  if (teamIds.length === 0) return { home: [CSC_ENTRY], away: [CSC_ENTRY] };

  const { data: players } = await supabase
    .from("players")
    .select("player_name, team_id, position, cutout_url, image_url")
    .in("team_id", teamIds)
    .not("team_thesportsdb_id", "is", null)
    .neq("team_thesportsdb_id", "")
    .in("position", ["A", "M", "D", "G"]);

  const rows = players ?? [];
  return {
    home: [CSC_ENTRY, ...rows.filter((p) => p.team_id === homeTeamId)],
    away: [CSC_ENTRY, ...rows.filter((p) => p.team_id === awayTeamId)],
  };
}

function parseExistingScore(
  value: string,
): { home: string; away: string } | null {
  const m = /^(\d+)-(\d+)$/.exec(value);
  if (!m) return null;
  return { home: m[1]!, away: m[2]! };
}

function parseExistingScorers(value: string): ScorersAlloc | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "home" in parsed &&
      "away" in parsed
    ) {
      return parsed as ScorersAlloc;
    }
  } catch {
    // ignore
  }
  return null;
}

function TeamLogo({ logo, name }: { logo: string | null; name: string }) {
  if (logo?.startsWith("http")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logo} alt={name} className="h-8 w-8 object-contain" />
    );
  }
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-sm">
      ⚽
    </span>
  );
}

import { CustomPlayerSelect } from "./CustomPlayerSelect";

function ScoreInput({
  value,
  onChange,
  inputRef,
  onFilled,
  disabled,
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onFilled?: () => void;
  disabled?: boolean;
  "aria-label": string;
}) {
  return (
    <input
      ref={inputRef}
      type="tel"
      inputMode="numeric"
      maxLength={2}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => {
        const v = e.target.value.replace(/\D/g, "").slice(0, 2);
        onChange(v);
        if (v.length >= 1) onFilled?.();
      }}
      className="h-12 w-12 rounded-xl border border-white/15 bg-zinc-900 text-center text-xl font-black text-white outline-none ring-0 transition focus:border-whistle focus:ring-1 focus:ring-whistle/40 disabled:opacity-50 disabled:cursor-not-allowed"
      placeholder="–"
    />
  );
}

function ScorerRow({
  entry,
  playersList,
  playersLoading,
  onNameChange,
  onGoalsChange,
  onRemove,
  disabled,
}: {
  entry: ScorerEntry;
  playersList?: PlayerForSelect[];
  playersLoading?: boolean;
  onNameChange: (name: string) => void;
  onGoalsChange: (delta: number) => void;
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      {playersLoading ? (
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-zinc-500">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-zinc-600 border-t-whistle" />
          Chargement de l&apos;effectif…
        </div>
      ) : playersList && playersList.length > 0 ? (
        <CustomPlayerSelect
          value={entry.name}
          onChange={onNameChange}
          playersList={playersList}
          disabled={disabled}
        />
      ) : (
        <input
          type="text"
          value={entry.name}
          disabled={disabled}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Nom du buteur"
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-whistle/60 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      )}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onGoalsChange(-1)}
          disabled={disabled || entry.goals <= 1}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 disabled:opacity-30"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-5 text-center text-sm font-bold tabular-nums text-white">
          {entry.goals}
        </span>
        <button
          type="button"
          onClick={() => onGoalsChange(1)}
          disabled={disabled}
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 disabled:opacity-30"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        className="ml-1 flex h-7 w-7 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-30"
      >
        <Check className="h-3.5 w-3.5 opacity-0" />
        <span className="absolute text-lg leading-none">×</span>
      </button>
    </div>
  );
}

function MatchPronoCard({
  match,
  existingScore,
  existingScorers,
}: {
  match: MatchWithPlayers;
  existingScore: { home: string; away: string } | null;
  existingScorers: ScorersAlloc | null;
}) {
  const [homeScore, setHomeScore] = useState(existingScore?.home ?? "");
  const [awayScore, setAwayScore] = useState(existingScore?.away ?? "");
  const [showScorers, setShowScorers] = useState(existingScorers != null);
  const [homeScorers, setHomeScorers] = useState<ScorerEntry[]>(
    existingScorers?.home ?? [],
  );
  const [awayScorers, setAwayScorers] = useState<ScorerEntry[]>(
    existingScorers?.away ?? [],
  );
  const [submitted, setSubmitted] = useState(existingScore != null);
  const [loading, setLoading] = useState(false);

  // Players : initialisés depuis le serveur (table players), enrichis lazy par lineups
  const [homePlayers, setHomePlayers] = useState<PlayerForSelect[]>(
    match.home_players ?? [],
  );
  const [awayPlayers, setAwayPlayers] = useState<PlayerForSelect[]>(
    match.away_players ?? [],
  );
  const [playersLoading, setPlayersLoading] = useState(false);
  const playersLoadedRef = useRef(false);

  // Chargement lazy : lineups en priorité, fallback players table
  useEffect(() => {
    if (!showScorers || playersLoadedRef.current) return;
    playersLoadedRef.current = true;

    setPlayersLoading(true);
    void fetchPlayersForMatch(match.id, match.home_team_id, match.away_team_id).then(
      ({ home, away }) => {
        setHomePlayers(home);
        setAwayPlayers(away);
        setPlayersLoading(false);
      },
    );
  }, [showScorers, match.id, match.home_team_id, match.away_team_id]);

  const isLocked = match.status !== "upcoming";

  const awayRef = useRef<HTMLInputElement | null>(null);

  const homeInt = parseInt(homeScore, 10);
  const awayInt = parseInt(awayScore, 10);
  const scoresValid =
    homeScore !== "" && awayScore !== "" && !isNaN(homeInt) && !isNaN(awayInt);

  const totalHomeGoals = homeScorers.reduce((s, e) => s + e.goals, 0);
  const totalAwayGoals = awayScorers.reduce((s, e) => s + e.goals, 0);

  const scorersValid =
    !showScorers ||
    (totalHomeGoals === homeInt &&
      totalAwayGoals === awayInt &&
      homeScorers.every((e) => e.name.trim() !== "") &&
      awayScorers.every((e) => e.name.trim() !== ""));

  const canSubmit = scoresValid && scorersValid;

  function addScorer(side: "home" | "away") {
    const entry: ScorerEntry = { name: "", goals: 1 };
    if (side === "home") setHomeScorers((p) => [...p, entry]);
    else setAwayScorers((p) => [...p, entry]);
  }

  function updateScorer(
    side: "home" | "away",
    idx: number,
    patch: Partial<ScorerEntry>,
  ) {
    const setter = side === "home" ? setHomeScorers : setAwayScorers;
    setter((prev) => prev.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  }

  function removeScorer(side: "home" | "away", idx: number) {
    const setter = side === "home" ? setHomeScorers : setAwayScorers;
    setter((prev) => prev.filter((_, i) => i !== idx));
  }

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const scorersObj =
        showScorers && (homeScorers.length > 0 || awayScorers.length > 0)
          ? { home: homeScorers, away: awayScorers }
          : null;

      const { error } = await supabase.rpc("place_match_prono", {
        p_match_id: match.id,
        p_home_score: homeInt,
        p_away_score: awayInt,
        p_scorers_json: scorersObj,
      });

      if (error) {
        toast.error(
          error.message.includes("plus disponible")
            ? "Ce match a déjà commencé, trop tard !"
            : `Prono refusé: ${error.message}`,
        );
        return;
      }

      setSubmitted(true);
      toast.success(
        <span className="flex items-center gap-1.5">
          <Bell className="h-4 w-4 text-whistle" />
          Prono enregistré — Notifs Live activées !
        </span>,
      );
    } catch {
      toast.error("Connexion perdue, réessaie !");
    } finally {
      setLoading(false);
    }
  }, [
    canSubmit,
    match.id,
    homeInt,
    awayInt,
    showScorers,
    homeScorers,
    awayScorers,
  ]);

  const kickoff = new Date(match.start_time);
  const relativeTime = formatRelative(kickoff, new Date(), { locale: fr });

  return (
    <div
      className={`rounded-2xl border bg-zinc-900/60 px-4 pb-5 pt-4 transition ${
        submitted ? "border-green-500/30" : "border-white/8"
      }`}
    >
      {/* En-tête : compétition + heure */}
      <div className="mb-3 flex items-center justify-between">
        {match.round_short && (
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            {match.round_short}
          </span>
        )}
        <span className="ml-auto text-[10px] text-zinc-500 capitalize">
          {relativeTime}
        </span>
      </div>

      {/* Équipes + score */}
      <div className="flex items-center gap-3">
        {/* Équipe domicile */}
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <TeamLogo logo={match.home_team_logo} name={match.team_home} />
          <span className="line-clamp-2 text-center text-[11px] font-bold leading-tight text-white">
            {match.team_home}
          </span>
        </div>

        {/* Inputs score */}
        <div className="flex items-center gap-2">
          <ScoreInput
            value={homeScore}
            onChange={(val) => {
              if (!isLocked && !submitted) setHomeScore(val);
            }}
            onFilled={() => {
              if (!isLocked && !submitted) awayRef.current?.focus();
            }}
            disabled={isLocked || submitted}
            aria-label={`Buts ${match.team_home}`}
          />
          <span className="text-lg font-black text-zinc-600">–</span>
          <ScoreInput
            value={awayScore}
            onChange={(val) => {
              if (!isLocked && !submitted) setAwayScore(val);
            }}
            inputRef={awayRef}
            disabled={isLocked || submitted}
            aria-label={`Buts ${match.team_away}`}
          />
        </div>

        {/* Équipe extérieure */}
        <div className="flex flex-1 flex-col items-center gap-1.5">
          <TeamLogo logo={match.away_team_logo} name={match.team_away} />
          <span className="line-clamp-2 text-center text-[11px] font-bold leading-tight text-white">
            {match.team_away}
          </span>
        </div>
      </div>

      {/* Section buteurs (optionnelle) */}
      {scoresValid && (homeInt > 0 || awayInt > 0) && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowScorers((v) => !v)}
            className="text-[11px] font-bold text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
          >
            {showScorers
              ? "Masquer les buteurs"
              : "+ Allouer les buts aux joueurs"}
          </button>

          {showScorers && (
            <div className="mt-3 flex flex-col gap-4">
              {/* Buteurs domicile */}
              {homeInt > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    {match.team_home} — {homeInt} but{homeInt > 1 ? "s" : ""}
                    {totalHomeGoals !== homeInt && (
                      <span className="ml-2 text-amber-400">
                        ({totalHomeGoals}/{homeInt})
                      </span>
                    )}
                  </span>
                  {homeScorers.map((e, i) => (
                    <ScorerRow
                      key={i}
                      entry={e}
                      playersList={homePlayers}
                      playersLoading={playersLoading}
                      disabled={isLocked || submitted}
                      onNameChange={(name) => updateScorer("home", i, { name })}
                      onGoalsChange={(delta) =>
                        updateScorer("home", i, {
                          goals: Math.max(1, e.goals + delta),
                        })
                      }
                      onRemove={() => removeScorer("home", i)}
                    />
                  ))}
                  {totalHomeGoals < homeInt && !isLocked && !submitted && (
                    <button
                      type="button"
                      onClick={() => addScorer("home")}
                      className="flex items-center gap-1 text-[11px] font-bold text-whistle hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" /> Ajouter un buteur
                    </button>
                  )}
                </div>
              )}

              {/* Buteurs extérieur */}
              {awayInt > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    {match.team_away} — {awayInt} but{awayInt > 1 ? "s" : ""}
                    {totalAwayGoals !== awayInt && (
                      <span className="ml-2 text-amber-400">
                        ({totalAwayGoals}/{awayInt})
                      </span>
                    )}
                  </span>
                  {awayScorers.map((e, i) => (
                    <ScorerRow
                      key={i}
                      entry={e}
                      playersList={awayPlayers}
                      playersLoading={playersLoading}
                      disabled={isLocked || submitted}
                      onNameChange={(name) => updateScorer("away", i, { name })}
                      onGoalsChange={(delta) =>
                        updateScorer("away", i, {
                          goals: Math.max(1, e.goals + delta),
                        })
                      }
                      onRemove={() => removeScorer("away", i)}
                    />
                  ))}
                  {totalAwayGoals < awayInt && !isLocked && !submitted && (
                    <button
                      type="button"
                      onClick={() => addScorer("away")}
                      className="flex items-center gap-1 text-[11px] font-bold text-whistle hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" /> Ajouter un buteur
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Bouton submit */}
      {isLocked ? (
        <div className="mt-4 flex w-full items-center justify-center rounded-xl bg-zinc-800/50 py-3 text-sm font-black uppercase tracking-wide text-zinc-500">
          Le match a commencé, pronos fermés 🔒
        </div>
      ) : (
        <button
          type="button"
          disabled={!canSubmit || loading}
          onClick={handleSubmit}
          className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-black uppercase tracking-wide transition active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${
            submitted
              ? "bg-green-600 text-white"
              : "bg-whistle text-pitch-900 hover:brightness-110"
          }`}
        >
          {submitted ? (
            <>
              <Check className="h-4 w-4" />
              Prono enregistré
            </>
          ) : loading ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-pitch-900/40 border-t-pitch-900" />
          ) : (
            <>
              <Target className="h-4 w-4" />
              Valider mon prono
            </>
          )}
        </button>
      )}
    </div>
  );
}

export function PronosticsHubClient({
  matches,
  existingPronos,
}: {
  matches: MatchStub[];
  existingPronos: ExistingProno[];
}) {
  const pronoByMatchId = new Map<
    string,
    {
      score: { home: string; away: string } | null;
      scorers: ScorersAlloc | null;
    }
  >();
  for (const p of existingPronos) {
    const entry = pronoByMatchId.get(p.match_id) ?? {
      score: null,
      scorers: null,
    };
    if (p.prono_type === "exact_score") {
      entry.score = parseExistingScore(p.prono_value);
    } else if (p.prono_type === "scorer_allocation") {
      entry.scorers = parseExistingScorers(p.prono_value);
    }
    pronoByMatchId.set(p.match_id, entry);
  }

  if (matches.length === 0) {
    return (
      <div className="rounded-2xl border border-white/8 bg-zinc-900/50 px-4 py-12 text-center">
        <Target
          className="mx-auto mb-3 h-10 w-10 text-zinc-700"
          strokeWidth={1.5}
        />
        <p className="text-sm font-bold text-zinc-400">
          Aucun match à venir dans les 7 prochains jours.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {matches.map((m) => {
        const p = pronoByMatchId.get(m.id);
        return (
          <MatchPronoCard
            key={m.id}
            match={m}
            existingScore={p?.score ?? null}
            existingScorers={p?.scorers ?? null}
          />
        );
      })}
    </div>
  );
}
