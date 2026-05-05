"use client";

import Image from "next/image";
import { memo, useEffect, useState } from "react";
import { User, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { LineupRow, PlayerRow } from "@/types/database";
import { MatchLineupsPitch } from "./MatchLineupsPitch";

const POS_ORDER: Record<string, number> = { G: 0, D: 1, M: 2, A: 3 };

const POS_LABEL: Record<string, string> = {
  G: "Gardien",
  D: "Défenseur",
  M: "Milieu",
  A: "Attaquant",
};

const LOGO_HOSTS = new Set(["www.thesportsdb.com", "r2.thesportsdb.com"]);

function isNextImageRemoteLogo(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && LOGO_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

function TeamLogo({
  url,
  label,
}: {
  url: string | null | undefined;
  label: string;
}) {
  const trimmed = (url ?? "").trim();
  const box =
    "h-7 w-7 shrink-0 rounded-md border border-white/10 bg-zinc-900/80 object-contain p-0.5";

  if (trimmed.startsWith("http") && isNextImageRemoteLogo(trimmed)) {
    return (
      <Image
        src={trimmed}
        alt=""
        width={28}
        height={28}
        className={box}
        sizes="28px"
        title={label}
      />
    );
  }
  if (trimmed.startsWith("http")) {
    // eslint-disable-next-line @next/next/no-img-element -- hôte hors remotePatterns
    return <img src={trimmed} alt="" className={box} title={label} />;
  }
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-zinc-800 text-[10px] text-zinc-500"
      aria-hidden
    >
      ⚽
    </div>
  );
}

function sortByPosition<
  T extends { position: string | null; player_name: string },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const pa = POS_ORDER[a.position ?? ""] ?? 9;
    const pb = POS_ORDER[b.position ?? ""] ?? 9;
    if (pa !== pb) return pa - pb;
    return a.player_name.localeCompare(b.player_name, "fr");
  });
}

function initialsFromName(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0] ?? "")
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function pickPlayerPhotoUrl(
  imageUrl: string | null | undefined,
  cutoutUrl: string | null | undefined,
): string {
  const img = (imageUrl ?? "").trim();
  if (img.startsWith("http")) return img;
  const cut = (cutoutUrl ?? "").trim();
  if (cut.startsWith("http")) return cut;
  return "";
}

function PlayerRosterAvatar({
  name,
  imageUrl,
  cutoutUrl,
}: {
  name: string;
  imageUrl: string | null;
  cutoutUrl: string | null;
}) {
  const [broken, setBroken] = useState(false);
  const url = pickPlayerPhotoUrl(imageUrl, cutoutUrl);
  const showImg = url !== "" && !broken;
  const ring =
    "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-800";

  if (showImg && isNextImageRemoteLogo(url)) {
    return (
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-zinc-800">
        <Image
          src={url}
          alt=""
          fill
          className="object-cover"
          sizes="40px"
          onError={() => setBroken(true)}
        />
      </div>
    );
  }

  if (showImg) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- hôte hors remotePatterns
      <img
        src={url}
        alt=""
        className={`${ring} object-cover`}
        onError={() => setBroken(true)}
      />
    );
  }

  const ini = initialsFromName(name);
  if (ini.length > 0) {
    return (
      <div className={`${ring} text-[11px] font-black text-zinc-300`}>
        {ini}
      </div>
    );
  }

  return (
    <div className={ring} aria-hidden>
      <User className="h-5 w-5 text-zinc-500" />
    </div>
  );
}

function PlayerLine({
  shirtNumber,
  name,
  position,
  imageUrl,
  cutoutUrl,
}: {
  shirtNumber: string | null;
  name: string;
  position: string | null;
  imageUrl: string | null;
  cutoutUrl: string | null;
}) {
  const pos = (position ?? "").trim();
  const posLabel =
    pos && POS_LABEL[pos] ? POS_LABEL[pos] : pos.length > 0 ? pos : null;
  return (
    <li className="flex gap-2 border-b border-white/5 py-2 last:border-0">
      <PlayerRosterAvatar
        name={name}
        imageUrl={imageUrl}
        cutoutUrl={cutoutUrl}
      />
      <span className="w-8 shrink-0 self-center text-right text-xs font-black tabular-nums text-zinc-500">
        {shirtNumber ?? "—"}
      </span>
      <div className="min-w-0 flex-1 self-center">
        <p className="truncate text-sm font-semibold text-white">{name}</p>
        {posLabel && (
          <p
            className="mt-0.5 truncate text-[10px] text-zinc-500"
            title={posLabel}
          >
            {posLabel}
          </p>
        )}
      </div>
    </li>
  );
}

type Props = {
  matchId: string;
  teamHome: string;
  teamAway: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeTeamLogo?: string | null;
  awayTeamLogo?: string | null;
  homeTeamColor?: string | null;
  awayTeamColor?: string | null;
  homeTeamPrimaryColor?: string | null;
  homeTeamSecondaryColor?: string | null;
  awayTeamPrimaryColor?: string | null;
  awayTeamSecondaryColor?: string | null;
};

export const MatchLineups = memo(function MatchLineups({
  matchId,
  teamHome,
  teamAway,
  homeTeamId,
  awayTeamId,
  homeTeamLogo,
  awayTeamLogo,
  homeTeamColor,
  awayTeamColor,
  homeTeamPrimaryColor,
  homeTeamSecondaryColor,
  awayTeamPrimaryColor,
  awayTeamSecondaryColor,
}: Props) {
  const [lineups, setLineups] = useState<LineupRow[]>([]);
  const [homeRoster, setHomeRoster] = useState<PlayerRow[]>([]);
  const [awayRoster, setAwayRoster] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function fetchData() {
      const { data: lu, error: errLu } = await supabase
        .from("lineups")
        .select("*")
        .eq("match_id", matchId);

      if (cancelled) return;

      if (errLu) {
        console.error("[MatchLineups] lineups", errLu.message);
      }

      const lineupRows = lu ?? [];
      setLineups(lineupRows);

      if (lineupRows.length > 0) {
        setHomeRoster([]);
        setAwayRoster([]);
        setLoading(false);
        return;
      }

      if (!homeTeamId || !awayTeamId) {
        setHomeRoster([]);
        setAwayRoster([]);
        setLoading(false);
        return;
      }

      const { data: pl, error: errPl } = await supabase
        .from("players")
        .select("*")
        .in("team_id", [homeTeamId, awayTeamId])
        .not("team_thesportsdb_id", "is", null)
        .neq("team_thesportsdb_id", "");

      if (cancelled) return;

      if (errPl) {
        console.error("[MatchLineups] players", errPl.message);
        setHomeRoster([]);
        setAwayRoster([]);
        setLoading(false);
        return;
      }

      const all = pl ?? [];
      setHomeRoster(all.filter((p) => p.team_id === homeTeamId));
      setAwayRoster(all.filter((p) => p.team_id === awayTeamId));
      setLoading(false);
    }

    void fetchData();

    return () => {
      cancelled = true;
    };
  }, [matchId, homeTeamId, awayTeamId]);

  if (loading) {
    return (
      <div className="mt-6 grid animate-pulse gap-3 md:grid-cols-2">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-zinc-900 p-4"
          >
            <div className="mb-4 flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-zinc-800" />
              <div className="h-4 w-32 rounded-full bg-zinc-800" />
            </div>
            <div className="space-y-2">
              {Array.from({ length: 6 }).map((_, j) => (
                <div key={j} className="flex gap-2">
                  <div className="h-4 w-8 rounded bg-zinc-800" />
                  <div className="h-4 flex-1 rounded-full bg-zinc-800" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const useLineups = lineups.length > 0;
  const hasRoster = homeRoster.length > 0 || awayRoster.length > 0;
  const hasAny = useLineups || hasRoster;

  if (!hasAny) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900 px-6 py-12">
        <Users className="h-10 w-10 text-zinc-600" />
        <p className="text-center text-sm font-semibold text-zinc-400">
          Les compos ne sont pas encore tombées. Le coach fait durer le
          suspense.
        </p>
      </div>
    );
  }

  function teamBlockRoster(side: "home" | "away") {
    const team = side === "home" ? teamHome : teamAway;
    const logo = side === "home" ? homeTeamLogo : awayTeamLogo;
    const rows = sortByPosition(side === "home" ? homeRoster : awayRoster);

    return (
      <section className="rounded-2xl border border-white/10 bg-zinc-900/80 p-4">
        <header className="mb-4 flex items-center gap-2 border-b border-white/8 pb-3">
          <TeamLogo url={logo} label={team} />
          <h3 className="line-clamp-2 min-w-0 flex-1 text-sm font-black uppercase leading-tight tracking-wide text-white">
            {team}
          </h3>
        </header>
        {rows.length === 0 ? (
          <p className="text-xs text-zinc-600">
            Aucun joueur en base pour cette équipe.
          </p>
        ) : (
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Effectif
            </p>
            <ul>
              {rows.map((p) => (
                <PlayerLine
                  key={p.id}
                  shirtNumber={null}
                  name={p.player_name}
                  position={p.position}
                  imageUrl={p.image_url}
                  cutoutUrl={p.cutout_url}
                />
              ))}
            </ul>
          </div>
        )}
      </section>
    );
  }

  if (useLineups) {
    return (
      <MatchLineupsPitch
        lineups={lineups}
        teamHome={teamHome}
        teamAway={teamAway}
        homeTeamLogo={homeTeamLogo}
        awayTeamLogo={awayTeamLogo}
        homeTeamColor={homeTeamColor || homeTeamPrimaryColor}
        homeTeamSecondaryColor={homeTeamSecondaryColor}
        awayTeamColor={awayTeamColor || awayTeamPrimaryColor}
        awayTeamSecondaryColor={awayTeamSecondaryColor}
      />
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-4 md:flex-row md:gap-4">
      <div className="min-w-0 flex-1">{teamBlockRoster("home")}</div>
      <div className="min-w-0 flex-1">{teamBlockRoster("away")}</div>
    </div>
  );
});
