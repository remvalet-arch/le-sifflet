"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { BarChart2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MatchStatisticsRow, MatchStatus } from "@/types/database";

const FINISHED_STATUSES = new Set<MatchStatus>(["finished"]);

/** Stats affichées dans cet ordre — les autres sont ignorées. */
const FEATURED_STATS: { type: string; label: string }[] = [
  { type: "Ball Possession",  label: "Possession" },
  { type: "Shots on Goal",    label: "Tirs cadrés" },
  { type: "Total Shots",      label: "Tirs totaux" },
  { type: "Corner Kicks",     label: "Corners" },
  { type: "Fouls",            label: "Fautes" },
  { type: "Yellow Cards",     label: "Cartons jaunes" },
  { type: "Red Cards",        label: "Cartons rouges" },
  { type: "Offsides",         label: "Hors-jeux" },
  { type: "Goalkeeper Saves", label: "Arrêts" },
  { type: "Passes %",         label: "Précision passes" },
];

type Props = {
  matchId: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  teamHome: string;
  teamAway: string;
  homeTeamLogo: string | null;
  awayTeamLogo: string | null;
  homeTeamColor?: string | null;
  awayTeamColor?: string | null;
  matchStatus: MatchStatus;
};

/** Fallbacks distincts quand aucune couleur d'équipe n'est disponible. */
const FALLBACK_HOME = "#3b82f6"; // blue-500
const FALLBACK_AWAY = "#f97316"; // orange-500

export function isHexColor(v: string | null | undefined): v is string {
  return !!v && /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(v.trim());
}

function parseStatValue(v: string | null): number {
  if (!v || v === "null") return 0;
  const n = parseFloat(v.replace("%", "").replace(",", ".").trim());
  return Number.isNaN(n) ? 0 : n;
}

function StatRow({
  label,
  homeRaw,
  awayRaw,
  homeColor,
  awayColor,
}: {
  label: string;
  homeRaw: string | null;
  awayRaw: string | null;
  homeColor: string;
  awayColor: string;
}) {
  const h = parseStatValue(homeRaw);
  const a = parseStatValue(awayRaw);
  const total = h + a;
  const homePct = total === 0 ? 50 : Math.round((h / total) * 100);
  const awayPct = 100 - homePct;

  const homeWins = h > a;
  const awayWins = a > h;
  const tie = h === a;

  const homeOpacity = tie ? 0.9 : homeWins ? 1 : 0.45;
  const awayOpacity = tie ? 0.9 : awayWins ? 1 : 0.45;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className={homeWins || tie ? "font-bold text-white" : "text-zinc-400"}>
          {homeRaw ?? "—"}
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
          {label}
        </span>
        <span className={awayWins || tie ? "font-bold text-white" : "text-zinc-400"}>
          {awayRaw ?? "—"}
        </span>
      </div>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-zinc-800/90">
        <div
          className="h-full rounded-l-full transition-all duration-700"
          style={{ width: `${homePct}%`, backgroundColor: homeColor, opacity: homeOpacity }}
        />
        <div
          className="h-full rounded-r-full transition-all duration-700"
          style={{ width: `${awayPct}%`, backgroundColor: awayColor, opacity: awayOpacity }}
        />
      </div>
    </div>
  );
}

export const MatchStats = memo(function MatchStats({
  matchId,
  homeTeamId,
  awayTeamId,
  teamHome,
  teamAway,
  homeTeamLogo,
  awayTeamLogo,
  homeTeamColor,
  awayTeamColor,
  matchStatus,
}: Props) {
  const [rows, setRows] = useState<MatchStatisticsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const forceSyncTriggered = useRef(false);

  // Couleurs résolues : props en premier, sinon chargées depuis la table teams
  const [resolvedHomeColor, setResolvedHomeColor] = useState<string | null>(
    isHexColor(homeTeamColor) ? homeTeamColor : null,
  );
  const [resolvedAwayColor, setResolvedAwayColor] = useState<string | null>(
    isHexColor(awayTeamColor) ? awayTeamColor : null,
  );

  // Charge les couleurs manquantes depuis la table `teams`
  useEffect(() => {
    const needsHome = !isHexColor(homeTeamColor) && homeTeamId != null;
    const needsAway = !isHexColor(awayTeamColor) && awayTeamId != null;
    if (!needsHome && !needsAway) return;

    const ids = [
      ...(needsHome ? [homeTeamId!] : []),
      ...(needsAway ? [awayTeamId!] : []),
    ];

    const supabase = createClient();
    void supabase
      .from("teams")
      .select("id, color_primary, color_secondary")
      .in("id", ids)
      .then(({ data }) => {
        for (const team of data ?? []) {
          const best =
            isHexColor(team.color_primary) ? team.color_primary
            : isHexColor(team.color_secondary) ? team.color_secondary
            : null;
          if (needsHome && team.id === homeTeamId) setResolvedHomeColor(best);
          if (needsAway && team.id === awayTeamId) setResolvedAwayColor(best);
        }
      });
  }, [homeTeamId, awayTeamId, homeTeamColor, awayTeamColor]);

  const fetchStats = useCallback((supabase: ReturnType<typeof createClient>) => {
    return supabase
      .from("match_statistics")
      .select("*")
      .eq("match_id", matchId)
      .then(({ data }) => data ?? []);
  }, [matchId]);

  const triggerForceSync = useCallback(async () => {
    if (forceSyncTriggered.current) return;
    forceSyncTriggered.current = true;
    setSyncing(true);
    try {
      await fetch("/api/match/force-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId }),
      });
      const supabase = createClient();
      const data = await fetchStats(supabase);
      setRows(data);
    } finally {
      setSyncing(false);
    }
  }, [matchId, fetchStats]);

  useEffect(() => {
    const supabase = createClient();

    void fetchStats(supabase).then((data) => {
      setRows(data);
      setLoading(false);
    });

    const channel = supabase
      .channel(`match-stats-${matchId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "match_statistics", filter: `match_id=eq.${matchId}` },
        () => { void fetchStats(supabase).then((data) => setRows(data)); },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [matchId, fetchStats]);

  // Lazy sync : déclenche automatiquement si match terminé sans stats
  useEffect(() => {
    if (!loading && rows.length === 0 && FINISHED_STATUSES.has(matchStatus)) {
      void triggerForceSync();
    }
  }, [loading, rows.length, matchStatus, triggerForceSync]);

  const statsMap = new Map<string, { home: string | null; away: string | null }>();
  for (const row of rows) {
    const isHome = row.team_id === homeTeamId;
    const isAway = row.team_id === awayTeamId;
    if (!isHome && !isAway) continue;
    const entry = statsMap.get(row.type) ?? { home: null, away: null };
    if (isHome) entry.home = row.value;
    else entry.away = row.value;
    statsMap.set(row.type, entry);
  }

  const hasStats = statsMap.size > 0;
  const visibleStats = FEATURED_STATS.filter((s) => statsMap.has(s.type));
  const isUpcoming = matchStatus === "upcoming";

  const homeColor = resolvedHomeColor ?? FALLBACK_HOME;
  const awayColor = resolvedAwayColor ?? FALLBACK_AWAY;

  if (loading || syncing) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 px-4 pb-10 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-zinc-600 border-t-whistle" />
        {syncing && (
          <p className="text-xs font-bold text-zinc-500">
            Récupération des archives du match…
          </p>
        )}
      </div>
    );
  }

  if (!hasStats) {
    return (
      <div className="mt-6 flex flex-col items-center gap-3 px-4 pb-16 text-center">
        <BarChart2 className="h-10 w-10 text-zinc-700" strokeWidth={1.5} />
        <p className="text-sm font-bold text-zinc-500">
          {isUpcoming
            ? "Les statistiques seront disponibles dès le coup d'envoi."
            : "Statistiques en cours de chargement…"}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-6 px-4 pb-6">
      {/* En-tête équipes avec swatch couleur */}
      <div className="flex items-center justify-between">
        <TeamHeader name={teamHome} logo={homeTeamLogo} color={homeColor} align="left" />
        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600">Stats</span>
        <TeamHeader name={teamAway} logo={awayTeamLogo} color={awayColor} align="right" />
      </div>

      {/* Barres de stats */}
      <div className="space-y-5">
        {visibleStats.map((s) => {
          const entry = statsMap.get(s.type)!;
          return (
            <StatRow
              key={s.type}
              label={s.label}
              homeRaw={entry.home}
              awayRaw={entry.away}
              homeColor={homeColor}
              awayColor={awayColor}
            />
          );
        })}
      </div>
    </div>
  );
});

function TeamHeader({
  name,
  logo,
  color,
  align,
}: {
  name: string;
  logo: string | null;
  color: string;
  align: "left" | "right";
}) {
  return (
    <div className={`flex items-center gap-2 ${align === "right" ? "flex-row-reverse" : ""}`}>
      <div className="relative shrink-0">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={name} className="h-7 w-7 object-contain" />
        ) : (
          <div
            className="h-7 w-7 rounded-full"
            style={{ backgroundColor: color, opacity: 0.85 }}
          />
        )}
        {/* Swatch couleur maillot sous le logo */}
        <span
          className="absolute -bottom-1 left-1/2 h-1.5 w-5 -translate-x-1/2 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      </div>
      <span className="line-clamp-2 max-w-[88px] text-xs font-bold leading-tight text-zinc-300">{name}</span>
    </div>
  );
}
