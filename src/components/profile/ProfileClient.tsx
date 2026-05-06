"use client";

import { useState } from "react";
import { TrophyWall } from "./TrophyWall";
import type { BadgeRow, BetStatus, MarketEventType } from "@/types/database";
import { Lock, Shield, Target, TrendingUp, Trophy, Zap } from "lucide-react";

export type ShortBetEntry = {
  id: string;
  status: BetStatus;
  chosen_option: string;
  amount_staked: number;
  potential_reward: number;
  placed_at: string;
  eventType?: MarketEventType;
  teamHome?: string;
  teamAway?: string;
};

export type PronoEntry = {
  id: string;
  status: "pending" | "won" | "lost";
  prono_type: "exact_score" | "scorer" | "scorer_allocation";
  prono_value: string;
  reward_amount: number;
  points_earned: number;
  contre_pied_bonus: number;
  placed_at: string;
  teamHome?: string;
  teamAway?: string;
};

type Props = {
  shortBets: ShortBetEntry[];
  pronos: PronoEntry[];
  allBadges: BadgeRow[];
  unlockedBadgeIds: string[];
  amisContent: React.ReactNode;
  refillContent: React.ReactNode;
  winRate: number;
  totalBets: number;
  totalEarned: number;
  xpTotal: number;
  bestStreak: number;
  trustScore: number;
  isModerateur: boolean;
  scoreAccuracy: number | null;
  totalMatchesPronoed: number;
};

const SHORT_LABELS: Record<string, { label: string; emoji: string }> = {
  penalty_check: { label: "Péno ?", emoji: "📢" },
  penalty_outcome: { label: "Résultat péno", emoji: "🥅" },
  var_goal: { label: "Hors-jeu / But", emoji: "🚩" },
  red_card: { label: "Carton rouge", emoji: "🟥" },
  injury_sub: { label: "Changement", emoji: "🔄" },
  free_kick: { label: "Coup franc", emoji: "🎯" },
  corner: { label: "Corner", emoji: "🏁" },
  stoppage_ht: { label: "Arrêts HT", emoji: "⏱️" },
  stoppage_ft: { label: "Arrêts FT", emoji: "⏱️" },
};

function statusCls(status: string) {
  if (status === "won") return "border-green-500/30 bg-green-500/20 text-green-400";
  if (status === "lost") return "border-red-500/30 bg-red-500/20 text-red-400";
  return "border-amber-500/25 bg-amber-500/15 text-amber-400";
}

function statusLabel(status: string, kind: "short" | "prono") {
  if (status === "won") return "Gagné";
  if (status === "lost") return "Perdu";
  return kind === "short" ? "VAR en cours" : "En attente";
}

function cardBorderCls(status: string) {
  if (status === "won") return "border-l-4 border-l-green-500 border border-green-500/15 bg-green-500/5";
  if (status === "lost") return "border-l-4 border-l-red-500 border border-red-500/10 bg-red-500/5";
  return "border-l-4 border-l-amber-500/40 border border-white/6 bg-zinc-900";
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
      if (parsed.home)
        parsed.home.forEach((s: { name: string; goals: number }) =>
          names.push(`${s.name}${s.goals > 1 ? ` (x${s.goals})` : ""}`),
        );
      if (parsed.away)
        parsed.away.forEach((s: { name: string; goals: number }) =>
          names.push(`${s.name}${s.goals > 1 ? ` (x${s.goals})` : ""}`),
        );
      if (names.length === 0) return `⚽ Buteurs : Aucun (Bunker)`;
      return `⚽ Buteurs : ${names.join(", ")}`;
    } catch {
      return `⚽ Buteurs : (Erreur format)`;
    }
  }
  return value;
}

function getTrustGrade(score: number) {
  if (score >= 200)
    return { label: "Arbitre Élite", icon: "🏅", color: "text-yellow-400", bar: "bg-yellow-400", glow: "shadow-[0_0_12px_rgba(234,179,8,0.4)]" };
  if (score >= 100)
    return { label: "Arbitre Officiel", icon: "✅", color: "text-green-400", bar: "bg-green-500", glow: "shadow-[0_0_12px_rgba(34,197,94,0.4)]" };
  if (score >= 50)
    return { label: "Lanceur d'Alerte", icon: "⚡", color: "text-blue-400", bar: "bg-blue-400", glow: "shadow-[0_0_12px_rgba(59,130,246,0.4)]" };
  return { label: "Carton Jaune", icon: "⚠️", color: "text-orange-400", bar: "bg-orange-400", glow: "shadow-[0_0_12px_rgba(249,115,22,0.4)]" };
}

const TABS = [
  { value: "profil", icon: "⚽", label: "Profil" },
  { value: "historique", icon: "📊", label: "Historique" },
  { value: "badges", icon: "🏅", label: "Badges" },
  { value: "amis", icon: "👥", label: "Amis" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export function ProfileClient({
  shortBets,
  pronos,
  allBadges,
  unlockedBadgeIds,
  amisContent,
  refillContent,
  winRate,
  totalBets,
  totalEarned,
  bestStreak,
  trustScore,
  isModerateur,
  scoreAccuracy,
  totalMatchesPronoed,
}: Props) {
  const [activeTab, setActiveTab] = useState<TabValue>("profil");
  const varCount = shortBets.length;
  const pronoCount = pronos.length;
  const trophyCount = unlockedBadgeIds.length;
  const grade = getTrustGrade(trustScore);

  const tabBadge = (value: TabValue): number | null => {
    if (value === "historique") return varCount + pronoCount > 0 ? varCount + pronoCount : null;
    if (value === "badges") return trophyCount > 0 ? trophyCount : null;
    return null;
  };

  const winRateColor =
    winRate >= 60 ? "text-green-400" : winRate >= 40 ? "text-amber-400" : "text-red-400";
  const winRateGrad =
    winRate >= 60
      ? "from-green-500/15 to-green-500/5 border-green-500/20"
      : winRate >= 40
        ? "from-amber-500/15 to-amber-500/5 border-amber-500/20"
        : "from-red-500/15 to-red-500/5 border-red-500/20";

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          const badge = tabBadge(tab.value);
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`shrink-0 flex items-center gap-1.5 rounded-full border px-4 py-2.5 text-[11px] font-black uppercase tracking-wide transition-all ${
                isActive
                  ? "border-white/25 bg-zinc-800 text-white shadow-[0_0_12px_rgba(255,255,255,0.08)]"
                  : "border-white/8 bg-zinc-900 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {badge !== null && (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[8px] font-black ${
                    isActive ? "bg-zinc-900 text-white" : "bg-zinc-700 text-zinc-400"
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {activeTab === "profil" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-3">
            <div className={`flex-1 rounded-2xl border bg-gradient-to-br p-4 ${winRateGrad}`}>
              <p className={`text-4xl font-black tabular-nums ${winRateColor}`}>
                {winRate}%
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-green-500/60">
                Win Rate
              </p>
            </div>
            <div className="flex-1 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/15 to-amber-500/5 p-4">
              <p className="text-4xl font-black tabular-nums text-amber-400">
                {totalEarned.toLocaleString("fr-FR")}
              </p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-amber-500/60">
                Points Gagnés
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900">
            <div className="flex divide-x divide-white/8">
              <div className="flex flex-1 flex-col items-center gap-1 px-3 py-4">
                <Trophy className="h-4 w-4 text-zinc-500" />
                <p className="text-base font-black text-white">{totalBets}</p>
                <p className="text-center text-[10px] font-semibold text-zinc-500">Paris</p>
              </div>
              <div className="flex flex-1 flex-col items-center gap-1 px-3 py-4">
                <Zap className="h-4 w-4 text-zinc-500" />
                <p className="text-base font-black text-white">{bestStreak}</p>
                <p className="text-center text-[10px] font-semibold text-zinc-500">Série max</p>
              </div>
              <div className="flex flex-1 flex-col items-center gap-1 px-3 py-4">
                <Target className="h-4 w-4 text-zinc-500" />
                <p className="text-base font-black text-white">{totalMatchesPronoed}</p>
                <p className="text-center text-[10px] font-semibold text-zinc-500">Matchs</p>
              </div>
            </div>
          </div>

          {scoreAccuracy !== null && (
            <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900">
              <div className="border-b border-white/5 px-5 py-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Mon arbitrage
                </p>
              </div>
              <div className="flex divide-x divide-white/5">
                <div className="flex flex-1 flex-col items-center gap-1 px-3 py-4">
                  <Target className="h-4 w-4 text-zinc-500" />
                  <p className="text-base font-black text-white">{scoreAccuracy}%</p>
                  <p className="text-center text-[10px] font-semibold text-zinc-500">Scores exacts</p>
                </div>
                <div className="flex flex-1 flex-col items-center gap-1 px-3 py-4">
                  <TrendingUp className="h-4 w-4 text-zinc-500" />
                  <p className="text-base font-black text-white">{bestStreak}</p>
                  <p className="text-center text-[10px] font-semibold text-zinc-500">Meilleure série</p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-white/8 bg-zinc-900 px-4 py-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wide text-zinc-500">
                Score de confiance
              </span>
              <span className={`text-[10px] font-black ${grade.color} ${grade.glow} rounded-full px-2 py-0.5`}>
                {grade.icon} {grade.label} · {trustScore}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full transition-[width] duration-500 ${grade.bar}`}
                style={{ width: `${Math.min(100, (trustScore / 1000) * 100)}%` }}
              />
            </div>
          </div>

          {refillContent}

          {isModerateur && (
            <div className="flex items-center gap-2 rounded-xl border border-yellow-500/20 bg-yellow-500/5 px-4 py-2.5">
              <Shield className="h-4 w-4 shrink-0 text-yellow-400" />
              <p className="text-xs font-bold text-yellow-400">
                Accès Modérateur activé — tu peux forcer les résultats VAR
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "historique" && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-zinc-900/60 px-4 py-2.5">
            <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <p className="text-[11px] text-zinc-500">
              Les pronostics des matchs à venir sont masqués pour éviter la triche.
            </p>
          </div>

          {pronos.length === 0 && shortBets.length === 0 ? (
            <EmptyState emoji="📊" text="Aucun pari enregistré pour l'instant." />
          ) : (
            <>
              {pronos.length > 0 && (
                <div>
                  <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Pronostics
                  </h3>
                  <div className="flex flex-col gap-2">
                    {pronos.map((p) => {
                      const line = formatPronoValue(p.prono_type, p.prono_value);
                      const chipCls = statusCls(p.status);
                      const lbl = statusLabel(p.status, "prono");
                      return (
                        <div
                          key={p.id}
                          className={`rounded-xl px-4 py-3 ${cardBorderCls(p.status)}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {p.teamHome && (
                                <p className="truncate text-sm font-bold text-white">
                                  {p.teamHome} — {p.teamAway}
                                </p>
                              )}
                              {p.prono_type === "exact_score" && p.prono_value !== "🔒" ? (
                                <div className="mt-2 flex items-center gap-2">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-base font-black text-amber-400 shadow-inner">
                                    {p.prono_value.split("-")[0]}
                                  </div>
                                  <span className="font-bold text-zinc-600">-</span>
                                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 text-base font-black text-amber-400 shadow-inner">
                                    {p.prono_value.split("-")[1]}
                                  </div>
                                </div>
                              ) : (
                                <p className="mt-0.5 text-xs text-zinc-400">{line}</p>
                              )}
                              <p className="mt-1 text-[10px] text-zinc-600">{fmtDate(p.placed_at)}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span
                                className={`rounded-full border px-2.5 py-0.5 text-[10px] font-black ${chipCls} ${p.status === "pending" ? "animate-pulse" : ""}`}
                              >
                                {p.status === "pending" && <span className="mr-1">·</span>}
                                {lbl}
                              </span>
                              {p.status === "won" && (
                                <span className="text-sm font-black text-green-400">
                                  +{(p.points_earned > 0 ? p.points_earned : p.reward_amount).toLocaleString("fr-FR")} pts
                                </span>
                              )}
                            </div>
                          </div>
                          {p.status === "won" && p.contre_pied_bonus === 100 && (
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] font-black text-amber-400">
                              💎 Le Braquage
                              <span className="font-normal text-zinc-500">+100 pts contre-pied</span>
                            </div>
                          )}
                          <div className="mt-1 text-[10px] text-zinc-600">
                            Gratuit · gain potentiel{" "}
                            <strong className="text-zinc-300">
                              {p.reward_amount.toLocaleString("fr-FR")} Pts
                            </strong>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {shortBets.length > 0 && (
                <div>
                  <h3 className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Paris VAR Live
                  </h3>
                  <div className="flex flex-col gap-2">
                    {shortBets.map((bet) => {
                      const eCfg = bet.eventType
                        ? (SHORT_LABELS[bet.eventType] ?? { label: bet.eventType, emoji: "⚡" })
                        : { label: "—", emoji: "⚡" };
                      const chipCls = statusCls(bet.status);
                      const lbl = statusLabel(bet.status, "short");
                      const reward = Math.round(Number(bet.potential_reward));
                      return (
                        <div
                          key={bet.id}
                          className={`rounded-xl px-4 py-3 ${cardBorderCls(bet.status)}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              {bet.teamHome && (
                                <p className="truncate text-sm font-bold text-white">
                                  {bet.teamHome} — {bet.teamAway}
                                </p>
                              )}
                              <p className="mt-0.5 text-xs text-zinc-400">
                                {eCfg.emoji} {eCfg.label}
                              </p>
                              <p className="mt-1 text-[10px] text-zinc-600">{fmtDate(bet.placed_at)}</p>
                            </div>
                            <span
                              className={`mt-0.5 shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${chipCls} ${bet.status === "pending" ? "animate-pulse" : ""}`}
                            >
                              {bet.status === "pending" && <span className="mr-1">·</span>}
                              {lbl}
                              {bet.status === "won" && ` +${reward.toLocaleString("fr-FR")}`}
                            </span>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-zinc-600">
                            <span>
                              Choix{" "}
                              <strong className="font-black uppercase text-white">
                                {bet.chosen_option === "🔒" ? "🔒 Masqué" : bet.chosen_option}
                              </strong>
                            </span>
                            <span>·</span>
                            <span>
                              Mise <strong className="text-zinc-300">{bet.amount_staked} pts</strong>
                            </span>
                            <span>·</span>
                            <span>
                              Pot. <strong className="text-zinc-300">{reward} pts</strong>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === "badges" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
              Badges
            </p>
            <span className="text-[11px] font-bold text-zinc-400">
              {unlockedBadgeIds.length}/{allBadges.length} débloqués
            </span>
          </div>
          {allBadges.length === 0 ? (
            <EmptyState emoji="🏅" text="Les trophées arrivent bientôt…" />
          ) : (
            <TrophyWall badges={allBadges} unlockedBadgeIds={unlockedBadgeIds} />
          )}
        </div>
      )}

      {activeTab === "amis" && (
        <div>{amisContent}</div>
      )}
    </div>
  );
}

function EmptyState({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/8 bg-zinc-900 px-6 py-10">
      <span className="text-3xl">{emoji}</span>
      <p className="text-center text-sm font-semibold text-zinc-400">{text}</p>
    </div>
  );
}
