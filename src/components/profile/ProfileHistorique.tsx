"use client";

import { Lock } from "lucide-react";
import { useBcp47 } from "@/lib/use-bcp47";
import type { BetStatus, MarketEventType } from "@/types/database";

export type ShortBetEntry = {
  id: string;
  matchId: string;
  status: BetStatus;
  chosen_option: string;
  amount_staked: number;
  potential_reward: number;
  placed_at: string;
  eventType?: MarketEventType;
  teamHome?: string;
  teamAway?: string;
  homeScore?: number;
  awayScore?: number;
  matchStatus?: string;
  startTime?: string;
};

export type PronoEntry = {
  id: string;
  matchId: string;
  status: "pending" | "won" | "lost";
  prono_type: "exact_score" | "scorer" | "scorer_allocation";
  prono_value: string;
  reward_amount: number;
  points_earned: number;
  contre_pied_bonus: number;
  placed_at: string;
  teamHome?: string;
  teamAway?: string;
  homeScore?: number;
  awayScore?: number;
  matchStatus?: string;
  startTime?: string;
};

const SHORT_LABELS: Record<string, { label: string; emoji: string }> = {
  penalty_check: { label: "Péno ?", emoji: "📢" },
  penalty_outcome: { label: "Résultat péno", emoji: "🥅" },
  var_goal: { label: "Hors-jeu / But", emoji: "🚩" },
  red_card: { label: "Carton rouge", emoji: "🟥" },
  free_kick: { label: "Coup franc", emoji: "🎯" },
  corner: { label: "Corner", emoji: "🏁" },
  stoppage_ht: { label: "Arrêts HT", emoji: "⏱️" },
  stoppage_ft: { label: "Arrêts FT", emoji: "⏱️" },
};

function statusCls(status: string) {
  if (status === "won")
    return "border-green-500/30 bg-green-500/20 text-green-400";
  if (status === "lost") return "border-red-500/30 bg-red-500/20 text-red-400";
  return "border-amber-500/25 bg-amber-500/15 text-amber-400";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPronoValue(
  type: "exact_score" | "scorer" | "scorer_allocation",
  value: string,
) {
  if (value === "🔒") return "🔒 Pronostic masqué";
  if (type === "exact_score") return `🎯 Score exact : ${value}`;
  if (type === "scorer") return `⚽ Buteur : ${value}`;
  if (type === "scorer_allocation") {
    try {
      const parsed = JSON.parse(value);
      const names: string[] = [];
      const fmtScorer = (s: { name: string; goals: number }) => {
        const label = s.name === "CSC" ? "CSC (csc)" : s.name;
        return `${label}${s.goals > 1 ? ` (×${s.goals})` : ""}`;
      };
      if (parsed.home)
        parsed.home.forEach((s: { name: string; goals: number }) =>
          names.push(fmtScorer(s)),
        );
      if (parsed.away)
        parsed.away.forEach((s: { name: string; goals: number }) =>
          names.push(fmtScorer(s)),
        );
      if (names.length === 0) return `⚽ Buteurs : Aucun (Bunker)`;
      return `⚽ Buteurs : ${names.join(", ")}`;
    } catch {
      return `⚽ Buteurs : (Erreur format)`;
    }
  }
  return value;
}

type MatchGroup = {
  matchId: string;
  teamHome: string;
  teamAway: string;
  homeScore?: number;
  awayScore?: number;
  matchStatus?: string;
  startTime?: string;
  lastBetAt: string;
  pronos: PronoEntry[];
  varBets: ShortBetEntry[];
};

function buildMatchGroups(
  pronos: PronoEntry[],
  shortBets: ShortBetEntry[],
): MatchGroup[] {
  const map = new Map<string, MatchGroup>();

  function getOrCreate(
    id: string,
    teamHome?: string,
    teamAway?: string,
    homeScore?: number,
    awayScore?: number,
    matchStatus?: string,
    startTime?: string,
  ): MatchGroup {
    if (!map.has(id)) {
      map.set(id, {
        matchId: id,
        teamHome: teamHome ?? "?",
        teamAway: teamAway ?? "?",
        homeScore,
        awayScore,
        matchStatus,
        startTime,
        lastBetAt: "",
        pronos: [],
        varBets: [],
      });
    }
    return map.get(id)!;
  }

  for (const p of pronos) {
    const g = getOrCreate(
      p.matchId || "unknown",
      p.teamHome,
      p.teamAway,
      p.homeScore,
      p.awayScore,
      p.matchStatus,
      p.startTime,
    );
    g.pronos.push(p);
    if (!g.lastBetAt || p.placed_at > g.lastBetAt) g.lastBetAt = p.placed_at;
  }

  for (const b of shortBets) {
    const id = b.matchId || "unknown";
    const g = getOrCreate(
      id,
      b.teamHome,
      b.teamAway,
      b.homeScore,
      b.awayScore,
      b.matchStatus,
      b.startTime,
    );
    g.varBets.push(b);
    if (!g.lastBetAt || b.placed_at > g.lastBetAt) g.lastBetAt = b.placed_at;
  }

  const groups = [...map.values()];

  // Resolved groups first, then pending-only; chronologically desc within each tier
  function resolvePriority(g: MatchGroup): number {
    const all = [...g.pronos, ...g.varBets];
    return all.some((b) => b.status === "won" || b.status === "lost") ? 0 : 1;
  }

  groups.sort((a, b) => {
    const pa = resolvePriority(a);
    const pb = resolvePriority(b);
    if (pa !== pb) return pa - pb;
    return b.lastBetAt.localeCompare(a.lastBetAt);
  });

  return groups;
}

function matchStatusBadge(status?: string, startTime?: string) {
  if (status === "live")
    return (
      <span className="rounded-full bg-red-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-white animate-pulse">
        LIVE
      </span>
    );
  if (status === "finished")
    return (
      <span className="rounded-full border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-zinc-400">
        FT
      </span>
    );
  if (startTime) {
    const d = new Date(startTime);
    return (
      <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[9px] font-semibold text-zinc-500">
        {d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
      </span>
    );
  }
  return null;
}

export function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900 px-6 py-10">
      <span className="text-3xl">{emoji}</span>
      <p className="text-center text-sm font-semibold text-zinc-400">{text}</p>
    </div>
  );
}

function PronoRow({ prono: p }: { prono: PronoEntry }) {
  const bcp47 = useBcp47();
  const chipCls = statusCls(p.status);
  const isScore = p.prono_type === "exact_score" && p.prono_value !== "🔒";
  const line = formatPronoValue(p.prono_type, p.prono_value);
  const earned = p.points_earned > 0 ? p.points_earned : p.reward_amount;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${p.status === "won" ? "bg-green-500/5" : p.status === "lost" ? "bg-red-500/5" : ""}`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-sm">
        🎯
      </div>
      <div className="min-w-0 flex-1">
        {isScore ? (
          <p className="text-xs font-black text-white">
            Mon prono · {p.prono_value}
          </p>
        ) : (
          <p className="truncate text-xs font-semibold text-zinc-300">{line}</p>
        )}
        <p className="mt-0.5 text-[10px] text-zinc-600">
          {fmtDate(p.placed_at)}
        </p>
        {p.status === "won" && p.contre_pied_bonus === 100 && (
          <p className="mt-0.5 text-[9px] font-black text-amber-400">
            💎 Contre-pied +100 Points
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <span
          className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${chipCls} ${p.status === "pending" ? "animate-pulse" : ""}`}
        >
          {p.status === "pending" ? "⏳" : p.status === "won" ? "✓" : "✗"}
        </span>
        {p.status === "won" && (
          <p className="mt-1 text-[11px] font-black text-green-400">
            +{earned.toLocaleString(bcp47)}
          </p>
        )}
      </div>
    </div>
  );
}

function VarBetRow({ bet: b }: { bet: ShortBetEntry }) {
  const bcp47 = useBcp47();
  const chipCls = statusCls(b.status);
  const eCfg = b.eventType
    ? (SHORT_LABELS[b.eventType] ?? { label: b.eventType, emoji: "⚡" })
    : { label: "VAR", emoji: "⚡" };
  const reward = Math.round(Number(b.potential_reward));

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 ${b.status === "won" ? "bg-green-500/5" : b.status === "lost" ? "bg-red-500/5" : ""}`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800 text-sm">
        {eCfg.emoji}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-zinc-300">
          {eCfg.label}
        </p>
        <p className="mt-0.5 text-[10px] text-zinc-600">
          {b.chosen_option === "🔒" ? (
            "🔒 Masqué"
          ) : (
            <span className="font-black uppercase text-white/70">
              {b.chosen_option}
            </span>
          )}
          {" · "}
          {b.amount_staked} 🪙 misés
        </p>
      </div>
      <div className="shrink-0 text-right">
        <span
          className={`rounded-full border px-2 py-0.5 text-[9px] font-black ${chipCls} ${b.status === "pending" ? "animate-pulse" : ""}`}
        >
          {b.status === "pending" ? "⏳" : b.status === "won" ? "✓" : "✗"}
        </span>
        {b.status === "won" && (
          <p className="mt-1 text-[11px] font-black text-green-400">
            +{reward.toLocaleString(bcp47)}
          </p>
        )}
      </div>
    </div>
  );
}

export function HistoriqueTab({
  pronos,
  shortBets,
}: {
  pronos: PronoEntry[];
  shortBets: ShortBetEntry[];
}) {
  const bcp47 = useBcp47();
  const groups = buildMatchGroups(pronos, shortBets);

  // eslint-disable-next-line react-hooks/purity
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentEntries = [...pronos, ...shortBets].filter(
    (e) => new Date(e.placed_at).getTime() >= sevenDaysAgo,
  );
  const recentWon = recentEntries.filter((e) => e.status === "won").length;
  const recentLost = recentEntries.filter((e) => e.status === "lost").length;
  const recentPending = recentEntries.filter(
    (e) => e.status === "pending",
  ).length;
  const recentPts = recentEntries.reduce(
    (sum, e) =>
      sum + (e.status === "won" ? (e as PronoEntry).points_earned || 0 : 0),
    0,
  );

  if (groups.length === 0) {
    return (
      <EmptyState emoji="📊" text="Aucun pari enregistré pour l'instant." />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {recentEntries.length > 0 && (
        <div
          className={`rounded-xl border px-4 py-3 ${recentPts >= 0 ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5"}`}
        >
          <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">
            📊 Tes 7 derniers jours
          </p>
          <p
            className={`text-sm font-black ${recentPts >= 0 ? "text-green-400" : "text-red-400"}`}
          >
            {recentPts > 0 ? "+" : ""}
            {recentPts.toLocaleString(bcp47)} Points
            {recentWon > 0 && (
              <span className="ml-2 font-semibold text-zinc-400">
                · {recentWon} gagné{recentWon > 1 ? "s" : ""}
              </span>
            )}
            {recentLost > 0 && (
              <span className="ml-1 font-semibold text-zinc-400">
                · {recentLost} perdu{recentLost > 1 ? "s" : ""}
              </span>
            )}
            {recentPending > 0 && (
              <span className="ml-1 font-semibold text-zinc-400">
                · {recentPending} en attente
              </span>
            )}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-zinc-900/60 px-4 py-2.5">
        <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
        <p className="text-[11px] text-zinc-500">
          Les pronostics des matchs à venir sont masqués.
        </p>
      </div>

      {groups.map((g) => {
        const allBets = [...g.pronos, ...g.varBets];
        const wonCount = allBets.filter((b) => b.status === "won").length;
        const lostCount = allBets.filter((b) => b.status === "lost").length;
        const pendingCount = allBets.filter(
          (b) => b.status === "pending",
        ).length;
        const hasResolved = wonCount > 0 || lostCount > 0;
        const borderAccent = hasResolved
          ? wonCount >= lostCount
            ? "border-l-2 border-l-green-500"
            : "border-l-2 border-l-red-500"
          : "";

        return (
          <div
            key={g.matchId}
            className={`overflow-hidden rounded-2xl border border-white/8 bg-zinc-900 ${borderAccent}`}
          >
            <div className="flex items-center justify-between gap-2 border-b border-white/6 bg-zinc-800/60 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-white">
                  {g.teamHome} <span className="text-zinc-500">vs</span>{" "}
                  {g.teamAway}
                </p>
                {g.homeScore !== undefined && g.awayScore !== undefined && (
                  <p className="mt-0.5 text-[11px] font-black tabular-nums text-zinc-400">
                    {g.homeScore} – {g.awayScore}
                  </p>
                )}
              </div>
              <div className="shrink-0">
                {matchStatusBadge(g.matchStatus, g.startTime)}
              </div>
            </div>

            <div className="flex gap-2 border-b border-white/5 px-4 py-2.5">
              {wonCount > 0 && (
                <span className="rounded-full border border-green-500/30 bg-green-500/10 px-2.5 py-0.5 text-[10px] font-black text-green-400">
                  ✓ {wonCount} gagné{wonCount > 1 ? "s" : ""}
                </span>
              )}
              {lostCount > 0 && (
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 text-[10px] font-black text-red-400">
                  ✗ {lostCount} perdu{lostCount > 1 ? "s" : ""}
                </span>
              )}
              {pendingCount > 0 && (
                <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-black text-amber-400 animate-pulse">
                  ⏳ {pendingCount} en attente
                </span>
              )}
            </div>

            <div className="divide-y divide-white/5">
              {g.pronos.map((p) => (
                <PronoRow key={p.id} prono={p} />
              ))}
              {g.varBets.map((b) => (
                <VarBetRow key={b.id} bet={b} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
