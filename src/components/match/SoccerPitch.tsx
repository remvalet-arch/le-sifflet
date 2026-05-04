"use client";

import { memo, useEffect, useState } from "react";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { LineupRow } from "@/types/database";
import { startersForPitchRow } from "@/lib/pitch-lineups";

const POS_ORDER: Record<string, number> = { G: 0, D: 1, M: 2, A: 3 };

function lastName(fullName: string) {
  const parts = fullName.trim().split(" ");
  return parts[parts.length - 1] ?? fullName;
}

function contrastText(hex: string): "white" | "black" {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.5 ? "black" : "white";
}

function PlayerDot({
  name,
  bgColor,
  textIsWhite,
}: {
  name: string;
  bgColor?: string;
  textIsWhite: boolean;
}) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-black ${
          textIsWhite
            ? "border-white/30 text-white"
            : "border-black/20 text-zinc-900"
        }`}
        style={bgColor ? { backgroundColor: bgColor } : undefined}
      >
        {initials}
      </div>
      <span className="max-w-[52px] truncate text-center text-[9px] font-semibold leading-tight text-white/80">
        {lastName(name)}
      </span>
    </div>
  );
}

function LineupRow({
  players,
  bgColor,
  textIsWhite,
}: {
  players: LineupRow[];
  bgColor?: string;
  textIsWhite: boolean;
}) {
  if (players.length === 0) return null;
  return (
    <div className="relative z-10 flex items-end justify-center gap-2 py-2">
      {players.map((p) => (
        <PlayerDot
          key={p.id}
          name={p.player_name}
          bgColor={bgColor}
          textIsWhite={textIsWhite}
        />
      ))}
    </div>
  );
}

// ── Vue liste (effectif global ou titulaires incomplets) ──────────────────────

function RosterList({
  teamHome,
  teamAway,
  homePlayers,
  awayPlayers,
  bench,
  isGlobal,
}: {
  teamHome: string;
  teamAway: string;
  homePlayers: { id: string; player_name: string; position: string }[];
  awayPlayers: { id: string; player_name: string; position: string }[];
  bench: { id: string; player_name: string }[];
  isGlobal: boolean;
}) {
  return (
    <div className="mt-4 space-y-3">
      {isGlobal && (
        <p className="text-center text-[11px] text-zinc-600">
          Effectif global — composition de match non disponible
        </p>
      )}
      {[
        { label: teamHome, players: homePlayers },
        { label: teamAway, players: awayPlayers },
      ].map(({ label, players }) => (
        <div
          key={label}
          className="rounded-2xl border border-white/10 bg-zinc-900 p-4"
        >
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">
            {label}
          </p>
          {players.length === 0 ? (
            <p className="text-xs text-zinc-600">Aucun joueur renseigné</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {players
                .sort(
                  (a, b) =>
                    (POS_ORDER[a.position] ?? 9) - (POS_ORDER[b.position] ?? 9),
                )
                .map((p) => (
                  <span
                    key={p.id}
                    className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-300"
                  >
                    <span className="mr-1 text-zinc-500">{p.position}</span>
                    {p.player_name}
                  </span>
                ))}
            </div>
          )}
        </div>
      ))}
      {bench.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
          <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">
            Remplaçants
          </p>
          <div className="flex flex-wrap gap-2">
            {bench.map((p) => (
              <span
                key={p.id}
                className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-400"
              >
                {p.player_name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Composant principal ───────────────────────────────────────────────────────

type Props = {
  matchId: string;
  teamHome: string;
  teamAway: string;
  homeTeamColor?: string;
  awayTeamColor?: string;
};

export const SoccerPitch = memo(function SoccerPitch({
  matchId,
  teamHome,
  teamAway,
  homeTeamColor,
  awayTeamColor,
}: Props) {
  const [lineups, setLineups] = useState<LineupRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("lineups")
      .select("*")
      .eq("match_id", matchId)
      .then(({ data }) => {
        setLineups(data ?? []);
        setLoading(false);
      });
  }, [matchId]);

  if (loading) {
    return (
      <div className="mt-4 animate-pulse overflow-hidden rounded-2xl border border-green-700/40 bg-green-800/30 py-6">
        {(
          [
            [1, 4, 3, 4, 1],
            [1, 4, 3, 4, 1],
          ] as number[][]
        ).map((rows, half) => (
          <div
            key={half}
            className={`flex flex-col gap-3 ${half === 1 ? "mt-4" : ""}`}
          >
            {rows.map((count, rowIdx) => (
              <div key={rowIdx} className="flex justify-center gap-3">
                {Array.from({ length: count }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="h-8 w-8 rounded-full bg-green-700/50" />
                    <div className="h-1.5 w-10 rounded-full bg-green-700/30" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  // ── Cas 1 : lineups spécifiques au match ──────────────────────────────────

  if (lineups.length > 0) {
    const starters = lineups.filter((p) => p.status === "starter");
    const bench = lineups.filter((p) => p.status === "bench");
    const homeStarters = starters.filter((p) => p.team_side === "home");
    const awayStarters = starters.filter((p) => p.team_side === "away");

    const byPosHome = (pos: "G" | "D" | "M" | "A") =>
      startersForPitchRow(homeStarters, pos).sort((a, b) =>
        a.player_name.localeCompare(b.player_name, "fr"),
      );
    const byPosAway = (pos: "G" | "D" | "M" | "A") =>
      startersForPitchRow(awayStarters, pos).sort((a, b) =>
        a.player_name.localeCompare(b.player_name, "fr"),
      );

    // Titulaires incomplets → liste
    if (homeStarters.length < 11 || awayStarters.length < 11) {
      return (
        <RosterList
          teamHome={teamHome}
          teamAway={teamAway}
          homePlayers={homeStarters}
          awayPlayers={awayStarters}
          bench={bench}
          isGlobal={false}
        />
      );
    }

    // Titulaires complets → terrain tactique
    const homeBg = homeTeamColor ?? "#166534";
    const awayBg = awayTeamColor ?? "#3f3f46";
    const homeTextWhite = contrastText(homeBg) === "white";
    const awayTextWhite = contrastText(awayBg) === "white";

    return (
      <div className="mt-4 space-y-3">
        <div className="relative overflow-hidden rounded-2xl border border-green-700/40 bg-green-800">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute left-[15%] right-[15%] top-0 h-12 border-b border-l border-r border-white/20" />
            <div className="absolute left-[35%] right-[35%] top-0 h-5 border-b border-l border-r border-white/20" />
            <div className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 bg-white/25" />
            <div className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
            <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40" />
            <div className="absolute bottom-0 left-[35%] right-[35%] h-5 border-l border-r border-t border-white/20" />
            <div className="absolute bottom-0 left-[15%] right-[15%] h-12 border-l border-r border-t border-white/20" />
          </div>

          <div className="pt-3">
            <p className="mb-0 text-center text-[9px] font-black uppercase tracking-widest text-white/40">
              {teamAway}
            </p>
            <LineupRow
              players={byPosAway("G")}
              bgColor={awayTeamColor}
              textIsWhite={awayTextWhite}
            />
            <LineupRow
              players={byPosAway("D")}
              bgColor={awayTeamColor}
              textIsWhite={awayTextWhite}
            />
            <LineupRow
              players={byPosAway("M")}
              bgColor={awayTeamColor}
              textIsWhite={awayTextWhite}
            />
            <LineupRow
              players={byPosAway("A")}
              bgColor={awayTeamColor}
              textIsWhite={awayTextWhite}
            />
          </div>

          <div className="h-8" />

          <div className="pb-3">
            <LineupRow
              players={byPosHome("A")}
              bgColor={homeTeamColor}
              textIsWhite={homeTextWhite}
            />
            <LineupRow
              players={byPosHome("M")}
              bgColor={homeTeamColor}
              textIsWhite={homeTextWhite}
            />
            <LineupRow
              players={byPosHome("D")}
              bgColor={homeTeamColor}
              textIsWhite={homeTextWhite}
            />
            <LineupRow
              players={byPosHome("G")}
              bgColor={homeTeamColor}
              textIsWhite={homeTextWhite}
            />
            <p className="mt-0 text-center text-[9px] font-black uppercase tracking-widest text-white/40">
              {teamHome}
            </p>
          </div>
        </div>

        {bench.length > 0 && (
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
            <p className="mb-3 text-xs font-black uppercase tracking-widest text-zinc-500">
              Remplaçants
            </p>
            <div className="flex flex-wrap gap-2">
              {bench.map((p) => (
                <span
                  key={p.id}
                  className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-400"
                >
                  {p.player_name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Cas 2 : aucune donnée ────────────────────────────────────────────────

  return (
    <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900 px-6 py-12">
      <Users className="h-10 w-10 text-zinc-600" />
      <p className="text-center text-sm font-semibold text-zinc-400">
        Les compos ne sont pas encore tombées. Le coach fait durer le suspense.
      </p>
    </div>
  );
});
