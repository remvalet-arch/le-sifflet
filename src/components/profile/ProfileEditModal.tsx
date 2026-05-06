"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { X, Search, LoaderCircle, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const AVATARS = [
  "⚽",
  "🥅",
  "🏟️",
  "🎽",
  "👕",
  "🏆",
  "🎯",
  "👑",
  "🦁",
  "🐯",
  "🦊",
  "🐺",
  "🦅",
  "🐻",
  "⚡",
  "🔥",
  "💪",
  "🛡️",
  "📢",
  "🎪",
];

type TeamResult = { id: string; name: string; logo_url: string | null };

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function ProfileEditModal({
  onClose,
  initialUsername,
  initialAvatarUrl,
  initialTeamId,
  initialTeamName,
  initialTeamLogo,
  onSaved,
}: {
  onClose: () => void;
  initialUsername: string;
  initialAvatarUrl: string | null;
  initialTeamId: string | null;
  initialTeamName: string | null;
  initialTeamLogo: string | null;
  onSaved: (data: {
    username: string;
    avatar_url: string | null;
    favorite_team_id: string | null;
    team_name: string | null;
    team_logo: string | null;
  }) => void;
}) {
  const isClient = useIsClient();

  // State initialized from props — component remounts on each open so no reset needed
  const [username, setUsername] = useState(initialUsername);
  const [avatar, setAvatar] = useState<string | null>(initialAvatarUrl);
  const [teamId, setTeamId] = useState<string | null>(initialTeamId);
  const [teamName, setTeamName] = useState<string | null>(initialTeamName);
  const [teamLogo, setTeamLogo] = useState<string | null>(initialTeamLogo);
  const [teamSearch, setTeamSearch] = useState("");
  const [teamResults, setTeamResults] = useState<TeamResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Body scroll lock (pure DOM mutation — not setState, allowed in effects)
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
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
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col rounded-t-3xl bg-zinc-950 shadow-2xl">
        {/* Handle */}
        <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-zinc-700" />

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="text-base font-black text-white">
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
              {AVATARS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setAvatar(e)}
                  className={`flex h-12 w-full items-center justify-center rounded-xl text-2xl transition ${
                    avatar === e
                      ? "bg-whistle/20 ring-2 ring-whistle"
                      : "bg-zinc-900 hover:bg-zinc-800"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </section>

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
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={teamLogo}
                      alt={teamName ?? ""}
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
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={t.logo_url}
                          alt={t.name}
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
