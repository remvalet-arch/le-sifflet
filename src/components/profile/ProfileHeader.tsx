"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { ProfileEditModal } from "./ProfileEditModal";

type TeamInfo = { id: string; name: string; logo_url: string | null } | null;

export function ProfileHeader({
  username: initialUsername,
  avatarUrl: initialAvatarUrl,
  favoriteTeam: initialTeam,
  karma,
  rank,
  xpTotal,
  balance,
}: {
  username: string;
  avatarUrl: string | null;
  favoriteTeam: TeamInfo;
  karma: { emoji: string; label: string; cls: string };
  rank: { emoji: string; label: string };
  xpTotal: number;
  balance: number;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [username, setUsername] = useState(initialUsername);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [team, setTeam] = useState<TeamInfo>(initialTeam);

  const avatar = avatarUrl ?? "🎽";

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-white/8 bg-zinc-900">
        <div className="flex items-center gap-4 px-5 py-4">
          {/* Avatar */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-2xl">
            {avatar.startsWith("http") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt={username}
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : (
              avatar
            )}
          </div>

          {/* Info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-black text-white">{username}</p>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[9px] font-black ${karma.cls}`}
              >
                {karma.emoji} {karma.label}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-zinc-500">
              {rank.emoji} {rank.label}
            </p>
            <p className="mt-0.5 text-[11px] font-bold tabular-nums text-zinc-600">
              {xpTotal.toLocaleString("fr-FR")} XP
            </p>
            {/* Club favori */}
            {team && (
              <div className="mt-1.5 flex items-center gap-1.5">
                {team.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={team.logo_url}
                    alt={team.name}
                    className="h-4 w-4 object-contain"
                  />
                ) : (
                  <span className="text-xs">⚽</span>
                )}
                <span className="text-[11px] font-bold text-zinc-400">
                  {team.name}
                </span>
              </div>
            )}
          </div>

          {/* Solde + bouton edit */}
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <p className="text-2xl font-black tabular-nums text-white">
                {balance.toLocaleString("fr-FR")}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                Pts
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1 rounded-lg bg-zinc-800 px-2.5 py-1.5 text-[11px] font-bold text-zinc-400 transition hover:bg-zinc-700 hover:text-white"
            >
              <Pencil className="h-3 w-3" />
              Modifier
            </button>
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
