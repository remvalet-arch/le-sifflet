"use client";

import Image from "next/image";
import { memo } from "react";
import type { LineupRow } from "@/types/database";
import { startersForPitchRow } from "@/lib/pitch-lineups";

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

function startersSortedForPitchRow(
  starters: LineupRow[],
  row: "G" | "D" | "M" | "A",
): LineupRow[] {
  return startersForPitchRow(starters, row).sort((a, b) =>
    a.player_name.localeCompare(b.player_name, "fr"),
  );
}

function PitchMarkings() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Surface de réparation haute */}
      <div className="absolute left-[12%] right-[12%] top-0 h-[18%] border-x border-b border-white/25" />
      <div className="absolute left-[32%] right-[32%] top-0 h-[7%] border-x border-b border-white/25" />
      {/* Ligne médiane */}
      <div className="absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 bg-white/35" />
      {/* Rond central */}
      <div className="absolute left-1/2 top-1/2 h-[22%] max-h-24 w-[22%] max-w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25" />
      <div className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/35" />
      {/* Surface de réparation basse */}
      <div className="absolute bottom-0 left-[12%] right-[12%] h-[18%] border-x border-t border-white/25" />
      <div className="absolute bottom-0 left-[32%] right-[32%] h-[7%] border-x border-t border-white/25" />
    </div>
  );
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
    <div className="flex max-w-[64px] flex-col items-center gap-0.5">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-black tabular-nums shadow-sm ${sizeClass} ${
          textIsWhite
            ? "border-white/35 text-white"
            : "border-black/25 text-zinc-900"
        }`}
        style={
          bgColor
            ? { backgroundColor: bgColor }
            : { backgroundColor: "rgba(0,0,0,0.35)" }
        }
      >
        {showNumber ? num : initials(name)}
      </div>
      <span className="w-full truncate text-center text-[9px] font-semibold leading-tight text-white drop-shadow-sm">
        {lastName(name)}
      </span>
    </div>
  );
}

function PositionRow({
  players,
  bgColor,
}: {
  players: LineupRow[];
  bgColor?: string | null;
}) {
  if (players.length === 0) return null;
  return (
    <div className="relative z-10 flex flex-wrap items-end justify-center gap-2 px-1 py-1.5">
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

type Props = {
  lineups: LineupRow[];
  teamHome: string;
  teamAway: string;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  homeTeamColor?: string | null;
  awayTeamColor?: string | null;
};

/** Terrain visuel type Google Sport : moitié haute domicile, moitié basse extérieur. */
export const MatchLineupsPitch = memo(function MatchLineupsPitch({
  lineups,
  teamHome,
  teamAway,
  homeTeamLogo,
  awayTeamLogo,
  homeTeamColor,
  awayTeamColor,
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

  const homeBg = homeTeamColor ?? "#166534";
  const awayBg = awayTeamColor ?? "#14532d";

  const homeOrder = ["G", "D", "M", "A"] as const;
  const awayOrder = ["A", "M", "D", "G"] as const;

  return (
    <div className="mt-6 space-y-4">
      <div
        className="relative overflow-hidden rounded-2xl border border-emerald-950/60 shadow-lg"
        style={{
          background:
            "linear-gradient(180deg, #1a5c38 0%, #14532d 48%, #134d2a 52%, #164e2f 100%)",
        }}
      >
        <PitchMarkings />

        <div className="relative z-10 flex flex-col">
          {/* Domicile — haut : G → D → M → A (vers le centre) */}
          <div className="flex flex-col px-1 pb-1 pt-2 sm:px-3">
            <div className="mb-1 flex items-center justify-center gap-2">
              <TeamLogoSmall url={homeTeamLogo} label={teamHome} />
              <span className="max-w-[70%] truncate text-center text-[10px] font-black uppercase tracking-widest text-white/85">
                {teamHome}
              </span>
            </div>
            {homeOrder.map((pos) => (
              <PositionRow
                key={`h-${pos}`}
                players={startersSortedForPitchRow(homeStarters, pos)}
                bgColor={homeBg}
              />
            ))}
          </div>

          <div
            className="relative z-10 mx-4 h-0.5 shrink-0 rounded-full bg-white/45 shadow-[0_0_8px_rgba(255,255,255,0.15)]"
            aria-hidden
          />

          {/* Extérieur — bas : A → M → D → G (miroir, attaquants vers le centre) */}
          <div className="flex flex-col px-1 pb-2 pt-1 sm:px-3">
            {awayOrder.map((pos) => (
              <PositionRow
                key={`a-${pos}`}
                players={startersSortedForPitchRow(awayStarters, pos)}
                bgColor={awayBg}
              />
            ))}
            <div className="mt-1 flex items-center justify-center gap-2">
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
