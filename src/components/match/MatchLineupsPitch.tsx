"use client";

import Image from "next/image";
import { memo } from "react";
import type { LineupRow } from "@/types/database";
import { resolveMatchColors } from "@/lib/colors";

const LOGO_HOSTS = new Set(["www.thesportsdb.com", "r2.thesportsdb.com"]);

function isNextImageRemoteLogo(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && LOGO_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

function TeamLogoSmall({
  url,
  label,
}: {
  url: string | null | undefined;
  label: string;
}) {
  const trimmed = (url ?? "").trim();
  const box =
    "h-6 w-6 shrink-0 rounded border border-white/20 bg-black/20 object-contain p-px";

  if (trimmed.startsWith("http") && isNextImageRemoteLogo(trimmed)) {
    return (
      <Image
        src={trimmed}
        alt=""
        width={24}
        height={24}
        className={box}
        sizes="24px"
        title={label}
      />
    );
  }
  if (trimmed.startsWith("http")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={trimmed} alt="" className={box} title={label} />;
  }
  return (
    <div
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-white/20 bg-black/30 text-[8px] text-white/50"
      aria-hidden
    >
      ⚽
    </div>
  );
}

function lastName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? fullName;
}

function initials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function contrastText(hex: string | null | undefined): "white" | "black" {
  if (!hex || !/^#[0-9A-Fa-f]{6}$/i.test(hex)) return "white";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? "black" : "white";
}

/** Parse "row:col" → { row, col } or null */
function parseGrid(
  g: string | null | undefined,
): { row: number; col: number } | null {
  if (!g) return null;
  const [r, c] = g.split(":").map(Number);
  if (!r || !c || isNaN(r) || isNaN(c)) return null;
  return { row: r, col: c };
}

/**
 * Group starters by pitch row using grid_position when available,
 * falling back to position (G/D/M/A). Returns rows sorted top→bottom.
 */
function groupByPitchRow(starters: LineupRow[]): LineupRow[][] {
  const hasGrid = starters.some((p) => p.grid_position != null);

  if (hasGrid) {
    // Group by grid row, sort each row by column
    const rowMap = new Map<number, LineupRow[]>();
    for (const p of starters) {
      const g = parseGrid(p.grid_position);
      const rowKey = g?.row ?? 99;
      if (!rowMap.has(rowKey)) rowMap.set(rowKey, []);
      rowMap.get(rowKey)!.push(p);
    }
    return [...rowMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([, players]) =>
        [...players].sort((a, b) => {
          const ga = parseGrid(a.grid_position)?.col ?? 0;
          const gb = parseGrid(b.grid_position)?.col ?? 0;
          return ga - gb;
        }),
      );
  }

  // Fallback: position-based rows
  const order = ["G", "D", "M", "A"] as const;
  const PITCH_STRICT = new Set(["G", "D", "A"]);
  return order
    .map((pos) => {
      const players =
        pos === "M"
          ? starters.filter((p) => !PITCH_STRICT.has(p.position))
          : starters.filter((p) => p.position === pos);
      return [...players].sort((a, b) =>
        a.player_name.localeCompare(b.player_name, "fr"),
      );
    })
    .filter((row) => row.length > 0);
}

function PlayerOnPitch({
  name,
  shirtNumber,
  bgColor,
}: {
  name: string;
  shirtNumber?: string | null;
  bgColor?: string | null;
}) {
  const textIsWhite = contrastText(bgColor ?? undefined) === "white";
  const num = (shirtNumber ?? "").trim();
  const showNumber = num.length > 0;
  const sizeClass = showNumber
    ? num.length >= 2
      ? "text-[9px] leading-none tracking-tight"
      : "text-[11px] leading-none"
    : "text-[10px] leading-none";

  return (
    <div
      className="flex flex-col items-center gap-1 min-w-0"
      style={{ width: "clamp(44px, 13%, 64px)" }}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 font-black tabular-nums shadow-md ${sizeClass} ${
          textIsWhite
            ? "border-white/40 text-white"
            : "border-black/25 text-zinc-900"
        }`}
        style={
          bgColor
            ? { backgroundColor: bgColor }
            : { backgroundColor: "rgba(0,0,0,0.45)" }
        }
      >
        {showNumber ? num : initials(name)}
      </div>
      <span className="w-full truncate text-center text-[9px] font-semibold leading-tight text-white/90 drop-shadow-sm">
        {lastName(name)}
      </span>
    </div>
  );
}

function PitchRow({
  players,
  bgColor,
}: {
  players: LineupRow[];
  bgColor?: string | null;
}) {
  if (players.length === 0) return null;
  return (
    <div className="relative z-10 flex items-center justify-around px-2 py-3">
      {players.map((p) => (
        <PlayerOnPitch
          key={p.id}
          name={p.player_name}
          shirtNumber={p.shirt_number}
          bgColor={bgColor}
        />
      ))}
    </div>
  );
}

function PitchMarkings() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-[12%] right-[12%] top-0 h-[18%] border-x border-b border-white/20" />
      <div className="absolute left-[32%] right-[32%] top-0 h-[7%] border-x border-b border-white/20" />
      <div className="absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-white/30" />
      <div className="absolute left-1/2 top-1/2 h-[22%] max-h-24 w-[22%] max-w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/30" />
      <div className="absolute bottom-0 left-[12%] right-[12%] h-[18%] border-x border-t border-white/20" />
      <div className="absolute bottom-0 left-[32%] right-[32%] h-[7%] border-x border-t border-white/20" />
    </div>
  );
}

type Props = {
  lineups: LineupRow[];
  teamHome: string;
  teamAway: string;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  homeTeamColor?: string | null;
  homeTeamSecondaryColor?: string | null;
  awayTeamColor?: string | null;
  awayTeamSecondaryColor?: string | null;
};

export const MatchLineupsPitch = memo(function MatchLineupsPitch({
  lineups,
  teamHome,
  teamAway,
  homeTeamLogo,
  awayTeamLogo,
  homeTeamColor,
  homeTeamSecondaryColor,
  awayTeamColor,
  awayTeamSecondaryColor,
}: Props) {
  const homeStarters = lineups.filter(
    (p) => p.team_side === "home" && p.status === "starter",
  );
  const awayStarters = lineups.filter(
    (p) => p.team_side === "away" && p.status === "starter",
  );
  const homeBench = lineups.filter(
    (p) => p.team_side === "home" && p.status === "bench",
  );
  const awayBench = lineups.filter(
    (p) => p.team_side === "away" && p.status === "bench",
  );

  const { finalHomeColor: homeBg, finalAwayColor: awayBg } = resolveMatchColors(
    homeTeamColor,
    homeTeamSecondaryColor,
    awayTeamColor,
    awayTeamSecondaryColor,
  );

  // Home: rows sorted top→bottom (GK at top, FWD at bottom = nearest center)
  const homeRows = groupByPitchRow(homeStarters);
  // Away: rows sorted bottom→top (GK at bottom, FWD at top = nearest center)
  const awayRows = [...groupByPitchRow(awayStarters)].reverse();

  return (
    <div className="mt-6 space-y-4">
      <div
        className="relative overflow-hidden rounded-2xl border border-emerald-950/60 shadow-xl"
        style={{
          background:
            "linear-gradient(180deg, #1a5c38 0%, #14532d 48%, #134d2a 52%, #164e2f 100%)",
        }}
      >
        <PitchMarkings />

        <div className="relative z-10 flex flex-col">
          {/* Domicile — GK haut, attaque vers le centre */}
          <div className="flex flex-col px-1 pt-3 pb-1">
            <div className="mb-2 flex items-center justify-center gap-2">
              <TeamLogoSmall url={homeTeamLogo} label={teamHome} />
              <span className="max-w-[70%] truncate text-center text-[10px] font-black uppercase tracking-widest text-white/85">
                {teamHome}
              </span>
            </div>
            {homeRows.map((row, i) => (
              <PitchRow key={i} players={row} bgColor={homeBg} />
            ))}
          </div>

          <div
            className="relative z-10 mx-4 h-0.5 shrink-0 rounded-full bg-white/40 shadow-[0_0_8px_rgba(255,255,255,0.15)]"
            aria-hidden
          />

          {/* Extérieur — attaque vers le centre, GK bas */}
          <div className="flex flex-col px-1 pt-1 pb-3">
            {awayRows.map((row, i) => (
              <PitchRow key={i} players={row} bgColor={awayBg} />
            ))}
            <div className="mt-2 flex items-center justify-center gap-2">
              <TeamLogoSmall url={awayTeamLogo} label={teamAway} />
              <span className="max-w-[70%] truncate text-center text-[10px] font-black uppercase tracking-widest text-white/85">
                {teamAway}
              </span>
            </div>
          </div>
        </div>
      </div>

      {(homeBench.length > 0 || awayBench.length > 0) && (
        <div className="rounded-2xl border border-white/10 bg-zinc-900/90 p-4">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Remplaçants
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {homeBench.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-bold text-zinc-400">
                  <TeamLogoSmall url={homeTeamLogo} label={teamHome} />
                  <span className="truncate">{teamHome}</span>
                </p>
                <ul className="flex flex-col gap-1.5">
                  {homeBench
                    .slice()
                    .sort((a, b) =>
                      a.player_name.localeCompare(b.player_name, "fr"),
                    )
                    .map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-zinc-800/60 px-2.5 py-1.5 text-xs text-zinc-200"
                      >
                        <span className="min-w-0 truncate font-medium">
                          {p.player_name}
                        </span>
                        <span className="shrink-0 text-[10px] font-bold text-zinc-500">
                          {p.position}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
            {awayBench.length > 0 && (
              <div>
                <p className="mb-2 flex items-center gap-2 text-xs font-bold text-zinc-400">
                  <TeamLogoSmall url={awayTeamLogo} label={teamAway} />
                  <span className="truncate">{teamAway}</span>
                </p>
                <ul className="flex flex-col gap-1.5">
                  {awayBench
                    .slice()
                    .sort((a, b) =>
                      a.player_name.localeCompare(b.player_name, "fr"),
                    )
                    .map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded-lg bg-zinc-800/60 px-2.5 py-1.5 text-xs text-zinc-200"
                      >
                        <span className="min-w-0 truncate font-medium">
                          {p.player_name}
                        </span>
                        <span className="shrink-0 text-[10px] font-bold text-zinc-500">
                          {p.position}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
