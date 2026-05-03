"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { LoaderCircle, Trophy, Wallet, ChevronLeft } from "lucide-react";
import type { SquadRow } from "@/types/database";

type LeaderboardRow = {
  user_id: string;
  username: string;
  xp: number;
  sifflets_balance: number;
  rank: string;
};

type ApiPayload = {
  squad: SquadRow;
  leaderboard: LeaderboardRow[];
  pot_commun: number;
};

type ApiResponse<T> = { ok: boolean; data?: T; error?: string };

export function SquadDetailClient({ squadId, currentUserId }: { squadId: string; currentUserId: string }) {
  const [data, setData] = useState<ApiPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void fetch(`/api/squads/${squadId}`)
      .then((r) => r.json())
      .then((json: ApiResponse<ApiPayload>) => {
        if (!alive) return;
        if (!json.ok) {
          toast.error(json.error ?? "Erreur");
          setData(null);
          return;
        }
        setData(json.data ?? null);
      })
      .catch(() => {
        if (!alive) return;
        toast.error("Connexion perdue");
        setData(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [squadId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <LoaderCircle className="h-8 w-8 animate-spin text-zinc-600" />
      </div>
    );
  }

  if (!data) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        Impossible de charger cette ligue.{" "}
        <Link href="/ligues" className="font-bold text-amber-400 underline">
          Retour
        </Link>
      </p>
    );
  }

  const { squad, leaderboard, pot_commun } = data;

  return (
    <div className="space-y-6">
      <Link
        href="/ligues"
        className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-white"
      >
        <ChevronLeft className="h-4 w-4" />
        Mes ligues
      </Link>

      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/80">
          {squad.is_private ? "Ligue privée" : "Publique"}
        </p>
        <h1 className="text-2xl font-black tracking-tight text-white">{squad.name}</h1>
        <p className="mt-3 flex flex-wrap items-center gap-3 text-sm font-bold text-green-400/90">
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="h-4 w-4" aria-hidden />
            Pot commun :{" "}
            <span className="font-black tabular-nums">{pot_commun.toLocaleString("fr-FR")} Pts</span>
          </span>
        </p>
      </div>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-400" aria-hidden />
          <h2 className="text-sm font-black uppercase tracking-wide text-white">Classement</h2>
        </div>
        <p className="mb-3 text-xs text-zinc-500">Tri par XP (puis pseudo). Solde Pts affiché pour le fun du vestiaire.</p>
        <ol className="flex flex-col gap-2">
          {leaderboard.map((row, idx) => (
            <li
              key={row.user_id}
              className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                row.user_id === currentUserId
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-white/10 bg-zinc-900/60"
              }`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                    idx === 0 ? "bg-amber-500 text-black" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold text-white">
                    {row.user_id === currentUserId ? "Toi" : row.username}
                  </p>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{row.rank}</p>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-sm font-black tabular-nums text-amber-300">{row.xp.toLocaleString("fr-FR")} XP</p>
                <p className="text-[10px] font-bold text-zinc-500">{row.sifflets_balance.toLocaleString("fr-FR")} Pts</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
