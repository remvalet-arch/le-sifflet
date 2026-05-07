"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { ProfileEditModal } from "./ProfileEditModal";

type TeamInfo = { id: string; name: string; logo_url: string | null } | null;

function getRankRing(rankLabel: string) {
  const t = rankLabel.toLowerCase();
  if (t.includes("boss"))
    return "ring-4 ring-yellow-400 shadow-[0_0_24px_rgba(234,179,8,0.5)]";
  if (t.includes("argent"))
    return "ring-4 ring-slate-400 shadow-[0_0_24px_rgba(148,163,184,0.4)]";
  if (t.includes("bronze"))
    return "ring-4 ring-amber-600 shadow-[0_0_24px_rgba(217,119,6,0.5)]";
  return "ring-2 ring-white/20";
}

function getXpProgress(xp: number): {
  level: string;
  pct: number;
  next: number;
} {
  if (xp >= 5000) return { level: "Boss", pct: 100, next: 5000 };
  if (xp >= 2000)
    return {
      level: "Argent",
      pct: Math.round(((xp - 2000) / 3000) * 100),
      next: 5000,
    };
  if (xp >= 500)
    return {
      level: "Bronze",
      pct: Math.round(((xp - 500) / 1500) * 100),
      next: 2000,
    };
  return { level: "District", pct: Math.round((xp / 500) * 100), next: 500 };
}

function getTrustGradeCompact(score: number) {
  if (score >= 200)
    return {
      icon: "🏅",
      label: "Arbitre Élite",
      color: "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
    };
  if (score >= 100)
    return {
      icon: "✅",
      label: "Arbitre Officiel",
      color: "text-green-400 border-green-500/30 bg-green-500/10",
    };
  if (score >= 50)
    return {
      icon: "⚡",
      label: "Lanceur d'Alerte",
      color: "text-blue-400 border-blue-500/30 bg-blue-500/10",
    };
  return {
    icon: "⚠️",
    label: "Carton Jaune",
    color: "text-orange-400 border-orange-500/30 bg-orange-500/10",
  };
}

export function ProfileHeader({
  username: initialUsername,
  avatarUrl: initialAvatarUrl,
  favoriteTeam: initialTeam,
  rank,
  xpTotal,
  balance,
  loginStreak,
  lastLoginDate,
  trustScore,
  compact = false,
  preferredCompetitions = [],
}: {
  username: string;
  avatarUrl: string | null;
  favoriteTeam: TeamInfo;
  karma?: { emoji: string; label: string; cls: string };
  rank: { emoji: string; label: string };
  xpTotal: number;
  balance: number;
  loginStreak?: number;
  lastLoginDate?: string | null;
  trustScore?: number;
  compact?: boolean;
  preferredCompetitions?: string[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [username, setUsername] = useState(initialUsername);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [team, setTeam] = useState<TeamInfo>(initialTeam);
  const [claimingStreak, setClaimingStreak] = useState(false);
  const [streakClaimed, setStreakClaimed] = useState(() => {
    if (typeof window === "undefined") return false;
    const todayStr = new Date().toISOString().slice(0, 10);
    return lastLoginDate === todayStr;
  });

  const streak = loginStreak ?? 0;
  const canClaimStreak = streak > 0 && !streakClaimed;
  const avatar = avatarUrl ?? "🎽";
  const ringCls = getRankRing(rank.label);
  const xpInfo = getXpProgress(xpTotal);
  const trust = trustScore != null ? getTrustGradeCompact(trustScore) : null;

  async function handleClaimStreak() {
    if (!canClaimStreak || claimingStreak) return;
    setClaimingStreak(true);
    try {
      const res = await fetch("/api/claim-daily-streak", { method: "POST" });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { bonus: number };
        error?: string;
      };
      if (!json.ok) {
        toast.error(json.error ?? "Déjà réclamé !");
        setStreakClaimed(true);
      } else {
        toast.success(`+${json.data!.bonus} Pts — Série de ${streak} jours !`);
        setStreakClaimed(true);
      }
    } catch {
      toast.error("Connexion perdue, réessaie !");
    } finally {
      setClaimingStreak(false);
    }
  }

  if (compact) {
    return (
      <div className="mb-3 flex h-14 items-center gap-3 rounded-xl border border-white/8 bg-zinc-900/80 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-lg">
          {avatar.startsWith("http") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatar}
              alt={username}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            avatar
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-white">{username}</p>
          <p className="text-[10px] font-bold text-zinc-500">
            {rank.emoji} {rank.label}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/8 text-zinc-500 hover:text-white"
          aria-label="Modifier le profil"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {editOpen && (
          <ProfileEditModal
            onClose={() => setEditOpen(false)}
            initialUsername={username}
            initialAvatarUrl={avatarUrl}
            initialTeamId={team?.id ?? null}
            initialTeamName={team?.name ?? null}
            initialTeamLogo={team?.logo_url ?? null}
            initialPreferredCompetitions={preferredCompetitions}
            xp={xpTotal}
            onSaved={(data) => {
              setUsername(data.username);
              setAvatarUrl(data.avatar_url);
              setTeam(
                data.favorite_team_id
                  ? {
                      id: data.favorite_team_id,
                      name: data.team_name ?? "",
                      logo_url: data.team_logo,
                    }
                  : null,
              );
            }}
          />
        )}
      </div>
    );
  }

  return (
    <>
      <div
        className="relative overflow-hidden rounded-2xl border border-white/8"
        style={{
          background: "linear-gradient(135deg, #064e3b 0%, #18181b 70%)",
        }}
      >
        <div
          className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-emerald-500 opacity-20 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-8 right-0 h-36 w-36 rounded-full bg-amber-500 opacity-15 blur-3xl"
          aria-hidden
        />

        <button
          type="button"
          onClick={() => setEditOpen(true)}
          className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 transition hover:bg-white/20 hover:text-white"
          aria-label="Modifier le profil"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>

        <div className="relative px-5 pt-5 pb-4">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-3xl ${ringCls}`}
            >
              {avatar.startsWith("http") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar}
                  alt={username}
                  className="h-20 w-20 rounded-full object-cover"
                />
              ) : (
                avatar
              )}
            </div>

            <div className="min-w-0 flex-1 pt-1">
              <p className="text-xl font-black text-white leading-tight">
                {username}
              </p>
              <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/8 px-2.5 py-0.5 text-[10px] font-black text-white/80">
                {rank.emoji} {rank.label}
              </span>
              {team && (
                <div className="mt-2 flex items-center gap-1.5">
                  {team.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={team.logo_url}
                      alt={team.name}
                      className="h-4 w-4 object-contain"
                    />
                  ) : (
                    <span className="text-xs">🏳️</span>
                  )}
                  <span className="text-[11px] font-bold text-white/60">
                    {team.name}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[9px] font-black uppercase tracking-widest text-white/40">
                XP · {xpInfo.level}
              </span>
              <span className="text-[9px] font-black tabular-nums text-white/40">
                {xpTotal.toLocaleString("fr-FR")} /{" "}
                {xpInfo.next.toLocaleString("fr-FR")}
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-emerald-400 transition-[width] duration-500"
                style={{ width: `${xpInfo.pct}%` }}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-2 shadow-[0_0_20px_rgba(34,197,94,0.3)]">
              <span className="text-2xl font-black tabular-nums text-green-400">
                {balance.toLocaleString("fr-FR")}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest text-green-500/60">
                pts
              </span>
            </div>

            {streak > 0 && (
              <button
                type="button"
                onClick={() => void handleClaimStreak()}
                disabled={!canClaimStreak || claimingStreak}
                className={`flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-black transition ${
                  canClaimStreak
                    ? "border border-orange-500/40 bg-orange-500/20 text-orange-400 hover:bg-orange-500/30"
                    : "border border-white/10 bg-zinc-800 text-zinc-500 cursor-default"
                }`}
              >
                🔥 {streak}j
                {canClaimStreak && ` +${50 * Math.min(streak, 7)}pts`}
              </button>
            )}

            {trust && trustScore != null && (
              <span
                className={`flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-[10px] font-black ${trust.color}`}
              >
                {trust.icon} {trust.label}
              </span>
            )}
          </div>
        </div>
      </div>

      {editOpen && (
        <ProfileEditModal
          onClose={() => setEditOpen(false)}
          initialUsername={username}
          initialAvatarUrl={avatarUrl}
          initialTeamId={team?.id ?? null}
          initialTeamName={team?.name ?? null}
          initialTeamLogo={team?.logo_url ?? null}
          xp={xpTotal}
          onSaved={(data) => {
            setUsername(data.username);
            setAvatarUrl(data.avatar_url);
            setTeam(
              data.favorite_team_id
                ? {
                    id: data.favorite_team_id,
                    name: data.team_name ?? "",
                    logo_url: data.team_logo,
                  }
                : null,
            );
          }}
        />
      )}
    </>
  );
}
