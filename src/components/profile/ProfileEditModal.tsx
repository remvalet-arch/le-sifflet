"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { X, Search, LoaderCircle, Check, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useBcp47 } from "@/lib/use-bcp47";
import { useScrollLock } from "@/hooks/useScrollLock";

type AvatarTier = { emoji: string; minXp: number };

const AVATAR_TIERS: AvatarTier[] = [
  // Tier 1 — District (0 xp)
  { emoji: "⚽", minXp: 0 },
  { emoji: "🥅", minXp: 0 },
  { emoji: "🏟️", minXp: 0 },
  { emoji: "🎽", minXp: 0 },
  { emoji: "👕", minXp: 0 },
  // Tier 2 — Bronze (500 xp)
  { emoji: "🦁", minXp: 500 },
  { emoji: "🐯", minXp: 500 },
  { emoji: "🦊", minXp: 500 },
  { emoji: "🐺", minXp: 500 },
  { emoji: "🦅", minXp: 500 },
  // Tier 3 — Argent (2000 xp)
  { emoji: "⚡", minXp: 2000 },
  { emoji: "🔥", minXp: 2000 },
  { emoji: "💪", minXp: 2000 },
  { emoji: "🎯", minXp: 2000 },
  { emoji: "🏆", minXp: 2000 },
  // Tier 4 — Boss (5000 xp)
  { emoji: "👑", minXp: 5000 },
  { emoji: "🛡️", minXp: 5000 },
  { emoji: "🐻", minXp: 5000 },
  { emoji: "📢", minXp: 5000 },
  { emoji: "🎪", minXp: 5000 },
];

type TeamResult = { id: string; name: string; logo_url: string | null };

type CompetitionResult = {
  id: string;
  name: string;
  badge_url: string | null;
  api_football_league_id: number | null;
};

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

const COMPETITION_FLAGS: Record<number, string> = {
  61: "🇫🇷",
  39: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  140: "🇪🇸",
  135: "🇮🇹",
  78: "🇩🇪",
  2: "🏆",
  3: "🥈",
};

export function ProfileEditModal({
  onClose,
  initialUsername,
  initialAvatarUrl,
  initialTeamId,
  initialTeamName,
  initialTeamLogo,
  initialPreferredCompetitions = [],
  xp = 0,
  onSaved,
}: {
  onClose: () => void;
  initialUsername: string;
  initialAvatarUrl: string | null;
  initialTeamId: string | null;
  initialTeamName: string | null;
  initialTeamLogo: string | null;
  initialPreferredCompetitions?: string[];
  xp?: number;
  onSaved: (data: {
    username: string;
    avatar_url: string | null;
    favorite_team_id: string | null;
    team_name: string | null;
    team_logo: string | null;
    preferred_competitions: string[];
  }) => void;
}) {
  const isClient = useIsClient();

  // State initialized from props — component remounts on each open so no reset needed
  const bcp47 = useBcp47();
  const [username, setUsername] = useState(initialUsername);
  const [avatar, setAvatar] = useState<string | null>(initialAvatarUrl);
  const [teamId, setTeamId] = useState<string | null>(initialTeamId);
  const [teamName, setTeamName] = useState<string | null>(initialTeamName);
  const [teamLogo, setTeamLogo] = useState<string | null>(initialTeamLogo);
  const [preferredComps, setPreferredComps] = useState<string[]>(
    initialPreferredCompetitions,
  );
  const [competitions, setCompetitions] = useState<CompetitionResult[]>([]);
  const [teamSearch, setTeamSearch] = useState("");
  const [teamResults, setTeamResults] = useState<TeamResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialogRef = useFocusTrap(true, onClose);
  useScrollLock(true);

  // Fetch available competitions on mount
  useEffect(() => {
    const supabase = createClient();
    void supabase
      .from("competitions")
      .select("id, name, badge_url, api_football_league_id")
      .not("api_football_league_id", "is", null)
      .order("name")
      .then(({ data }) => {
        setCompetitions(
          (data ?? []).map((c) => ({
            id: c.id,
            name: c.name,
            badge_url: c.badge_url,
            api_football_league_id: c.api_football_league_id ?? null,
          })),
        );
      });
  }, []);

  // Debounced team search — called directly from onChange, not in an effect
  function handleTeamSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTeamSearch(val);

    if (searchTimer.current) clearTimeout(searchTimer.current);

    const q = val.trim();
    if (q.length < 2) {
      setTeamResults([]);
      return;
    }

    searchTimer.current = setTimeout(() => {
      setSearchLoading(true);
      const supabase = createClient();
      void supabase
        .from("teams")
        .select("id, name, logo_url")
        .ilike("name", `%${q}%`)
        .not("api_football_id", "is", null)
        .order("name")
        .limit(8)
        .then(({ data }) => {
          setTeamResults(data ?? []);
          setSearchLoading(false);
        });
    }, 300);
  }

  async function handleSave() {
    if (!/^[a-zA-Z0-9_]{3,25}$/.test(username)) {
      toast.error("Pseudo invalide (3-25 caractères, lettres/chiffres/_)");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          avatar_url: avatar,
          favorite_team_id: teamId,
          preferred_competitions: preferredComps,
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        toast.error(json.error ?? "Erreur lors de la sauvegarde");
        return;
      }
      toast.success("Profil mis à jour !");
      onSaved({
        username,
        avatar_url: avatar,
        favorite_team_id: teamId,
        team_name: teamName,
        team_logo: teamLogo,
        preferred_competitions: preferredComps,
      });
      onClose();
    } catch {
      toast.error("Connexion perdue");
    } finally {
      setSaving(false);
    }
  }

  if (!isClient) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-edit-title"
        className="relative z-10 mx-auto flex w-full max-w-md flex-col rounded-t-3xl bg-zinc-950 shadow-2xl"
      >
        {/* Handle */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-zinc-700" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2
            id="profile-edit-title"
            className="text-base font-black text-white"
          >
            Modifier mon profil
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 hover:text-white"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div
          className="flex-1 overflow-y-auto px-5 pb-6"
          style={{ maxHeight: "72vh" }}
        >
          {/* ── Pseudo ──────────────────────────────────────────────────── */}
          <section className="mb-6">
            <label className="mb-2 block text-[11px] font-black uppercase tracking-widest text-zinc-500">
              Pseudo
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={25}
              placeholder="ton_pseudo"
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm font-bold text-white placeholder-zinc-600 outline-none focus:border-whistle"
            />
            <p className="mt-1.5 text-[10px] text-zinc-600">
              3-25 caractères · lettres, chiffres et _
            </p>
          </section>

          {/* ── Avatar emoji ─────────────────────────────────────────────── */}
          <section className="mb-6">
            <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-zinc-500">
              Avatar
            </p>
            <div className="grid grid-cols-5 gap-2">
              {AVATAR_TIERS.map(({ emoji, minXp }) => {
                const locked = xp < minXp;
                return (
                  <button
                    key={emoji}
                    type="button"
                    disabled={locked}
                    onClick={() => !locked && setAvatar(emoji)}
                    title={
                      locked
                        ? `Débloqué à ${minXp.toLocaleString(bcp47)} XP`
                        : undefined
                    }
                    className={`relative flex h-12 w-full items-center justify-center rounded-xl text-2xl transition ${
                      locked
                        ? "cursor-not-allowed bg-zinc-900/40 opacity-40"
                        : avatar === emoji
                          ? "bg-whistle/20 ring-2 ring-whistle"
                          : "bg-zinc-900 hover:bg-zinc-800"
                    }`}
                  >
                    {locked ? (
                      <>
                        <span className="opacity-30">{emoji}</span>
                        <Lock className="absolute bottom-1 right-1 h-2.5 w-2.5 text-zinc-500" />
                      </>
                    ) : (
                      emoji
                    )}
                  </button>
                );
              })}
            </div>
            {xp < 5000 && (
              <p className="mt-2 text-[10px] text-zinc-600">
                🔒 Gagne de l&apos;XP pour débloquer de nouveaux avatars
              </p>
            )}
          </section>

          {/* ── Mes ligues ───────────────────────────────────────────────── */}
          {competitions.length > 0 && (
            <section className="mb-6">
              <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-zinc-500">
                Mes ligues
              </p>
              <div className="flex flex-wrap gap-2">
                {competitions.map((comp) => {
                  const flag = comp.api_football_league_id
                    ? (COMPETITION_FLAGS[comp.api_football_league_id] ?? "⚽")
                    : "⚽";
                  const isSelected = preferredComps.includes(comp.id);
                  return (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() =>
                        setPreferredComps((prev) =>
                          isSelected
                            ? prev.filter((id) => id !== comp.id)
                            : [...prev, comp.id],
                        )
                      }
                      className={`rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-wide transition ${
                        isSelected
                          ? "border-whistle bg-whistle/20 text-whistle"
                          : "border-white/10 bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {flag} {comp.name}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[10px] text-zinc-600">
                Filtrage des pronos et notifications
              </p>
            </section>
          )}

          {/* ── Équipe favorite ──────────────────────────────────────────── */}
          <section>
            <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-zinc-500">
              Club de cœur
            </p>

            {/* Club sélectionné */}
            {teamId && (
              <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-whistle/30 bg-whistle/10 px-4 py-3">
                <div className="flex items-center gap-2">
                  {teamLogo ? (
                    <Image
                      src={teamLogo}
                      alt={teamName ?? ""}
                      width={28}
                      height={28}
                      className="h-7 w-7 object-contain"
                    />
                  ) : (
                    <span className="text-lg">⚽</span>
                  )}
                  <span className="text-sm font-bold text-white">
                    {teamName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTeamId(null);
                    setTeamName(null);
                    setTeamLogo(null);
                  }}
                  className="text-xs font-bold text-zinc-500 hover:text-white"
                >
                  Retirer
                </button>
              </div>
            )}

            {/* Recherche */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={teamSearch}
                onChange={handleTeamSearchChange}
                placeholder="Recherche un club…"
                className="w-full rounded-xl border border-white/10 bg-zinc-900 py-3 pl-9 pr-4 text-sm text-white placeholder-zinc-600 outline-none focus:border-whistle"
              />
              {searchLoading && (
                <LoaderCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500" />
              )}
            </div>

            {teamResults.length > 0 && (
              <ul className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
                {teamResults.map((t) => (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setTeamId(t.id);
                        setTeamName(t.name);
                        setTeamLogo(t.logo_url);
                        setTeamSearch("");
                        setTeamResults([]);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-zinc-800"
                    >
                      {t.logo_url ? (
                        <Image
                          src={t.logo_url}
                          alt={t.name}
                          width={24}
                          height={24}
                          className="h-6 w-6 shrink-0 object-contain"
                        />
                      ) : (
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center text-base">
                          ⚽
                        </span>
                      )}
                      <span className="flex-1 text-sm font-bold text-white">
                        {t.name}
                      </span>
                      {teamId === t.id && (
                        <Check className="h-4 w-4 text-whistle" />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="border-t border-white/8 px-5 py-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex w-full min-h-[52px] items-center justify-center gap-2 rounded-2xl bg-whistle font-black text-pitch-900 transition active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              "Sauvegarder"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
