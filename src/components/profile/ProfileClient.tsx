"use client";

import { TrophyWall } from "./TrophyWall";
import type { BadgeRow, BetStatus, MarketEventType } from "@/types/database";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Lock } from "lucide-react";

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
  vestiaireContent?: React.ReactNode;
  amisContent?: React.ReactNode;
};

// ── Config labels ─────────────────────────────────────────────────────────────

const SHORT_LABELS: Record<string, { label: string; emoji: string }> = {
  penalty_check: { label: "Péno ?", emoji: "📢" },
  penalty_outcome: { label: "Résultat péno", emoji: "🥅" },
  var_goal: { label: "Hors-jeu / But", emoji: "🚩" },
  red_card: { label: "Carton rouge", emoji: "🟥" },
  injury_sub: { label: "Changement", emoji: "🔄" },
  free_kick: { label: "Coup franc", emoji: "🎯" },
  corner: { label: "Corner", emoji: "🏁" },
};

const STATUS_BADGE = {
  won: "bg-green-500/20 text-green-400 border-green-500/30",
  lost: "bg-red-500/20 text-red-400 border-red-500/30",
  pending_short: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  pending_prono: "bg-blue-500/15 text-blue-400 border-blue-500/25",
} as const;

function statusCls(status: string, kind: "short" | "prono") {
  if (status === "won") return STATUS_BADGE.won;
  if (status === "lost") return STATUS_BADGE.lost;
  return kind === "short"
    ? STATUS_BADGE.pending_short
    : STATUS_BADGE.pending_prono;
}

function statusLabel(status: string, kind: "short" | "prono") {
  if (status === "won") return "Gagné";
  if (status === "lost") return "Perdu";
  return kind === "short" ? "⏳ VAR en cours" : "⏳ En attente du match";
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

// ── Component ─────────────────────────────────────────────────────────────────

export function ProfileClient({
  shortBets,
  pronos,
  allBadges,
  unlockedBadgeIds,
  vestiaireContent,
  amisContent,
}: Props) {
  const varCount = shortBets.length;
  const pronoCount = pronos.length;
  const trophyCount = unlockedBadgeIds.length;

  return (
    <Tabs defaultValue="vestiaire" className="mt-4">
      <TabsList className="w-full flex">
        <TabsTrigger value="vestiaire" className="flex-1">
          Vestiaire
        </TabsTrigger>
        <TabsTrigger value="historique" className="flex-1">
          Historique
          {varCount + pronoCount > 0 && (
            <span className="ml-1.5 rounded bg-zinc-700 px-1 text-[9px]">
              {varCount + pronoCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="trophees" className="flex-1">
          Badges
          {trophyCount > 0 && (
            <span className="ml-1.5 rounded bg-zinc-700 px-1 text-[9px]">
              {trophyCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="amis" className="flex-1">
          Amis
        </TabsTrigger>
      </TabsList>

      <TabsContent value="vestiaire" className="mt-4">
        {vestiaireContent}
      </TabsContent>

      <TabsContent value="historique" className="mt-4 space-y-6">
        <div className="flex items-center gap-2 rounded-xl border border-white/8 bg-zinc-900/60 px-4 py-2.5">
          <Lock className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
          <p className="text-[11px] text-zinc-500">
            Les pronostics des matchs à venir sont masqués pour éviter la
            triche.
          </p>
        </div>
        <div>
          <h3 className="mb-3 text-sm font-black uppercase text-zinc-500">
            Pronostics
          </h3>
          {pronos.length === 0 ? (
            <EmptyState
              emoji="🎯"
              text="Aucun prono enregistré pour l'instant."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {pronos.map((p) => {
                const cls = statusCls(p.status, "prono");
                const lbl = statusLabel(p.status, "prono");
                const line = formatPronoValue(p.prono_type, p.prono_value);
                return (
                  <div
                    key={p.id}
                    className={`rounded-xl border ${p.status === "won" ? "border-green-500/50 bg-green-500/5 shadow-[0_0_15px_rgba(34,197,94,0.1)]" : p.status === "lost" ? "border-red-500/20 bg-red-500/5" : "border-white/6 bg-zinc-900"} px-4 py-3`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] text-zinc-600">
                          {fmtDate(p.placed_at)}
                        </p>
                        {p.teamHome && (
                          <p className="truncate text-sm font-bold text-white">
                            {p.teamHome} — {p.teamAway}
                          </p>
                        )}
                        {p.prono_type === "exact_score" &&
                        p.prono_value !== "🔒" ? (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-lg font-black text-amber-400 shadow-inner">
                              {p.prono_value.split("-")[0]}
                            </div>
                            <span className="text-zinc-600 font-bold">-</span>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-800 text-lg font-black text-amber-400 shadow-inner">
                              {p.prono_value.split("-")[1]}
                            </div>
                          </div>
                        ) : (
                          <p className="mt-0.5 text-xs text-zinc-500">{line}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${cls}`}
                        >
                          {lbl}
                        </span>
                        {p.status === "won" && (
                          <span className="text-sm font-black text-green-400">
                            +
                            {(p.points_earned > 0
                              ? p.points_earned
                              : p.reward_amount
                            ).toLocaleString("fr-FR")}{" "}
                            Pts
                          </span>
                        )}
                      </div>
                    </div>
                    {p.status === "won" && p.contre_pied_bonus === 100 && (
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] font-black text-amber-400">
                        💎 Le Braquage
                        <span className="font-normal text-zinc-500">
                          +100 pts contre-pied
                        </span>
                      </div>
                    )}
                    <div className="mt-1.5 text-[10px] text-zinc-600">
                      Gratuit · gain potentiel{" "}
                      <strong className="text-zinc-300">
                        {p.reward_amount.toLocaleString("fr-FR")} Pts
                      </strong>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-black uppercase text-zinc-500">
            Paris VAR Live
          </h3>
          {shortBets.length === 0 ? (
            <EmptyState emoji="📢" text="Aucun pari VAR pour l'instant." />
          ) : (
            <div className="flex flex-col gap-2">
              {shortBets.map((bet) => {
                const eCfg = bet.eventType
                  ? (SHORT_LABELS[bet.eventType] ?? {
                      label: bet.eventType,
                      emoji: "⚡",
                    })
                  : { label: "—", emoji: "⚡" };
                const cls = statusCls(bet.status, "short");
                const lbl = statusLabel(bet.status, "short");
                const reward = Math.round(Number(bet.potential_reward));
                return (
                  <div
                    key={bet.id}
                    className="rounded-xl border border-white/6 bg-zinc-900 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] text-zinc-600">
                          {fmtDate(bet.placed_at)}
                        </p>
                        {bet.teamHome && (
                          <p className="truncate text-sm font-bold text-white">
                            {bet.teamHome} — {bet.teamAway}
                          </p>
                        )}
                        <p className="mt-0.5 text-xs text-zinc-500">
                          {eCfg.emoji} {eCfg.label}
                        </p>
                      </div>
                      <span
                        className={`mt-0.5 shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-black ${cls}`}
                      >
                        {lbl}
                        {bet.status === "won" &&
                          ` +${reward.toLocaleString("fr-FR")}`}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-zinc-600">
                      <span>
                        Choix{" "}
                        <strong className="font-black uppercase text-white">
                          {bet.chosen_option === "🔒"
                            ? "🔒 Masqué"
                            : bet.chosen_option}
                        </strong>
                      </span>
                      <span>·</span>
                      <span>
                        Mise{" "}
                        <strong className="text-zinc-300">
                          {bet.amount_staked} pts
                        </strong>
                      </span>
                      <span>·</span>
                      <span>
                        Pot.{" "}
                        <strong className="text-zinc-300">{reward} pts</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="trophees" className="mt-4">
        {allBadges.length === 0 ? (
          <EmptyState emoji="🏅" text="Les trophées arrivent bientôt…" />
        ) : (
          <TrophyWall badges={allBadges} unlockedBadgeIds={unlockedBadgeIds} />
        )}
      </TabsContent>

      <TabsContent value="amis" className="mt-4">
        {amisContent}
      </TabsContent>
    </Tabs>
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
