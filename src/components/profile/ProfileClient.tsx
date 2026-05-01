"use client";

import { useState } from "react";
import { TrophyWall } from "./TrophyWall";
import type { BadgeRow, BetStatus, MarketEventType } from "@/types/database";

// ── Types plats sérialisables passés depuis le Server Component ───────────────

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

export type LongBetEntry = {
  id: string;
  status: "pending" | "won" | "lost";
  bet_type: "scorer" | "exact_score";
  bet_value: string;
  amount_staked: number;
  potential_reward: number;
  placed_at: string;
  teamHome?: string;
  teamAway?: string;
};

type Props = {
  shortBets: ShortBetEntry[];
  longBets: LongBetEntry[];
  allBadges: BadgeRow[];
  unlockedBadgeIds: string[];
};

// ── Config labels ─────────────────────────────────────────────────────────────

const SHORT_LABELS: Record<string, { label: string; emoji: string }> = {
  penalty_check:   { label: "Péno ?",          emoji: "📢" },
  penalty_outcome: { label: "Résultat péno",   emoji: "🥅" },
  var_goal:        { label: "Hors-jeu / But",  emoji: "🚩" },
  red_card:        { label: "Carton rouge",    emoji: "🟥" },
  injury_sub:      { label: "Changement",      emoji: "🔄" },
};

const STATUS_BADGE = {
  won:  "bg-green-500/20 text-green-400 border-green-500/30",
  lost: "bg-red-500/20 text-red-400 border-red-500/30",
  pending_short: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  pending_long:  "bg-blue-500/15 text-blue-400 border-blue-500/25",
} as const;

function statusCls(status: string, kind: "short" | "long") {
  if (status === "won")  return STATUS_BADGE.won;
  if (status === "lost") return STATUS_BADGE.lost;
  return kind === "short" ? STATUS_BADGE.pending_short : STATUS_BADGE.pending_long;
}

function statusLabel(status: string, kind: "short" | "long") {
  if (status === "won")  return "Gagné";
  if (status === "lost") return "Perdu";
  return kind === "short" ? "⏳ VAR en cours" : "⏳ Fin du match";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

// ── Tab bar ───────────────────────────────────────────────────────────────────

type Tab = "var" | "pred" | "trophees";

const TABS: { id: Tab; label: string; count?: number }[] = [
  { id: "var",      label: "Paris VAR"    },
  { id: "pred",     label: "Prédictions"  },
  { id: "trophees", label: "Trophées"     },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function ProfileClient({
  shortBets,
  longBets,
  allBadges,
  unlockedBadgeIds,
}: Props) {
  const [tab, setTab] = useState<Tab>("var");

  const varCount  = shortBets.length;
  const predCount = longBets.length;
  const trophyCount = unlockedBadgeIds.length;

  return (
    <div className="mt-4">
      {/* Tab bar */}
      <div className="flex border-b border-white/8">
        {TABS.map(({ id, label }) => {
          const count = id === "var" ? varCount : id === "pred" ? predCount : trophyCount;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative flex flex-1 min-h-[44px] items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wide transition-colors ${
                tab === id ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {label}
              {count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${tab === id ? "bg-green-500/20 text-green-400" : "bg-zinc-800 text-zinc-500"}`}>
                  {count}
                </span>
              )}
              {tab === id && (
                <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-t-full bg-green-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="mt-3">

        {/* ── Paris VAR ── */}
        {tab === "var" && (
          shortBets.length === 0 ? (
            <EmptyState emoji="📢" text="Aucun pari VAR pour l'instant." />
          ) : (
            <div className="flex flex-col gap-2">
              {shortBets.map((bet) => {
                const eCfg = bet.eventType
                  ? (SHORT_LABELS[bet.eventType] ?? { label: bet.eventType, emoji: "⚡" })
                  : { label: "—", emoji: "⚡" };
                const cls = statusCls(bet.status, "short");
                const lbl = statusLabel(bet.status, "short");
                const reward = Math.round(Number(bet.potential_reward));
                return (
                  <div key={bet.id} className="rounded-xl border border-white/6 bg-zinc-900 px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] text-zinc-600">{fmtDate(bet.placed_at)}</p>
                        {bet.teamHome && (
                          <p className="truncate text-sm font-bold text-white">
                            {bet.teamHome} — {bet.teamAway}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {eCfg.emoji} {eCfg.label}
                        </p>
                      </div>
                      <span className={`mt-0.5 shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${cls}`}>
                        {lbl}{bet.status === "won" && ` +${reward.toLocaleString("fr-FR")}`}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-zinc-600">
                      <span>Choix <strong className="font-black uppercase text-white">{bet.chosen_option}</strong></span>
                      <span>·</span>
                      <span>Mise <strong className="text-zinc-300">{bet.amount_staked} pts</strong></span>
                      <span>·</span>
                      <span>Pot. <strong className="text-zinc-300">{reward} pts</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── Prédictions ── */}
        {tab === "pred" && (
          longBets.length === 0 ? (
            <EmptyState emoji="🎯" text="Aucune prédiction long terme pour l'instant." />
          ) : (
            <div className="flex flex-col gap-2">
              {longBets.map((ltb) => {
                const cls = statusCls(ltb.status, "long");
                const lbl = statusLabel(ltb.status, "long");
                const reward = Math.round(Number(ltb.potential_reward));
                const betLabel =
                  ltb.bet_type === "scorer"
                    ? `⚽ Buteur : ${ltb.bet_value}`
                    : `🎯 Score : ${ltb.bet_value}`;
                return (
                  <div key={ltb.id} className="rounded-xl border border-white/6 bg-zinc-900 px-4 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] text-zinc-600">{fmtDate(ltb.placed_at)}</p>
                        {ltb.teamHome && (
                          <p className="truncate text-sm font-bold text-white">
                            {ltb.teamHome} — {ltb.teamAway}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-zinc-500">{betLabel}</p>
                      </div>
                      <span className={`mt-0.5 shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${cls}`}>
                        {lbl}
                        {ltb.status === "won"  && ` +${reward.toLocaleString("fr-FR")}`}
                        {ltb.status === "lost" && ` −${ltb.amount_staked}`}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-zinc-600">
                      <span>Mise <strong className="text-zinc-300">{ltb.amount_staked} pts</strong></span>
                      <span>·</span>
                      <span>Pot. <strong className="text-zinc-300">{reward} pts</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── Trophées ── */}
        {tab === "trophees" && (
          allBadges.length === 0 ? (
            <EmptyState emoji="🏅" text="Les trophées arrivent bientôt…" />
          ) : (
            <TrophyWall badges={allBadges} unlockedBadgeIds={unlockedBadgeIds} />
          )
        )}
      </div>
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
