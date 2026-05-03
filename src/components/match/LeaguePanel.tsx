"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Copy, Check, Users, Swords, LogOut, Plus, Hash, LoaderCircle } from "lucide-react";

type RoomMember = { user_id: string; username: string };

type RoomData = {
  id: string;
  name: string;
  is_private: boolean;
  invite_code: string | null;
  match_id: string;
  members: RoomMember[];
};

type ApiResponse<T> = { ok: boolean; data?: T; error?: string };
type Mode = null | "create" | "join";

type Props = {
  matchId: string;
  userId: string;
  onRoomChange: (roomId: string | null) => void;
};

export function LeaguePanel({ matchId, userId, onRoomChange }: Props) {
  const [room, setRoom] = useState<RoomData | null | undefined>(undefined);
  const [mode, setMode] = useState<Mode>(null);
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  // Incrémenter pour déclencher un re-fetch
  const [tick, setTick] = useState(0);

  // Notifie le parent dès que room change
  const notifyParent = useCallback(
    (r: RoomData | null) => onRoomChange(r?.id ?? null),
    [onRoomChange],
  );

  // Charge la room via .then() pour éviter setState direct dans l'effet
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/rooms?match_id=${matchId}`)
      .then((r) => r.json())
      .then((json: ApiResponse<{ room: RoomData | null }>) => {
        if (cancelled) return;
        if (json.ok) {
          const r = json.data?.room ?? null;
          setRoom(r);
          notifyParent(r);
        }
      })
      .catch(() => {
        if (!cancelled) setRoom(null);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId, notifyParent, tick]);

  async function handleCreate() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ match_id: matchId, name: name.trim(), is_private: isPrivate }),
      });
      const json = (await res.json()) as ApiResponse<{ room: RoomData }>;
      if (!json.ok) { toast.error(json.error ?? "Erreur inattendue"); return; }
      toast.success("Ligue créée !");
      const newRoom = { ...json.data!.room, members: [{ user_id: userId, username: "Toi" }] };
      setRoom(newRoom);
      notifyParent(newRoom);
      setMode(null);
      setName("");
    } catch {
      toast.error("Connexion perdue, réessaie !");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJoin() {
    if (code.length < 4 || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: code.trim().toUpperCase() }),
      });
      const json = (await res.json()) as ApiResponse<{ room: RoomData }>;
      if (!json.ok) { toast.error(json.error ?? "Code invalide"); return; }
      toast.success("Ligue rejointe !");
      setMode(null);
      setCode("");
      // Re-fetch pour récupérer la liste complète des membres
      setTick((t) => t + 1);
    } catch {
      toast.error("Connexion perdue, réessaie !");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLeave() {
    if (!room || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/rooms/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room_id: room.id }),
      });
      const json = (await res.json()) as ApiResponse<Record<string, never>>;
      if (!json.ok) { toast.error(json.error ?? "Erreur inattendue"); return; }
      toast.success("Tu as quitté la ligue");
      setRoom(null);
      notifyParent(null);
    } catch {
      toast.error("Connexion perdue, réessaie !");
    } finally {
      setSubmitting(false);
    }
  }

  function copyCode() {
    if (!room?.invite_code) return;
    void navigator.clipboard.writeText(room.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Code copié !");
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (room === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoaderCircle className="h-6 w-6 animate-spin text-zinc-600" />
      </div>
    );
  }

  // ── Dans une room ─────────────────────────────────────────────────────────
  if (room) {
    return (
      <div className="space-y-5 px-4 py-5">
        {/* Room header */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <span className="absolute left-3 top-3 block h-4 w-4 rounded-tl border-l-2 border-t-2 border-amber-500/40" />
          <span className="absolute right-3 top-3 block h-4 w-4 rounded-tr border-r-2 border-t-2 border-amber-500/40" />
          <span className="absolute bottom-3 left-3 block h-4 w-4 rounded-bl border-b-2 border-l-2 border-amber-500/40" />
          <span className="absolute bottom-3 right-3 block h-4 w-4 rounded-br border-b-2 border-r-2 border-amber-500/40" />
          <p className="mb-1 text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/70">
            {room.is_private ? "Ligue privée" : "Ligue publique"}
          </p>
          <p className="text-xl font-black text-white">{room.name}</p>
        </div>

        {/* Code d'invitation */}
        {room.invite_code && (
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Code d&apos;invitation
            </p>
            <button
              onClick={copyCode}
              className="flex w-full items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-4 transition hover:border-amber-500/50 active:scale-[0.98]"
            >
              <span className="font-mono text-2xl font-black tracking-[0.3em] text-amber-400">
                {room.invite_code}
              </span>
              {copied ? (
                <Check className="h-5 w-5 text-green-400" />
              ) : (
                <Copy className="h-5 w-5 text-zinc-500" />
              )}
            </button>
          </div>
        )}

        {/* Membres */}
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-zinc-500" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Membres ({room.members.length})
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {room.members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center gap-2 rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5"
              >
                <div
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-black ${
                    m.user_id === userId
                      ? "bg-amber-500 text-black"
                      : "bg-zinc-700 text-zinc-300"
                  }`}
                >
                  {m.username.slice(0, 2).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-zinc-300">
                  {m.user_id === userId ? "Toi" : m.username}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Braquage */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="mb-1.5 flex items-center gap-2">
            <Swords className="h-4 w-4 text-amber-500/70" />
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Braquage actif
            </p>
          </div>
          <p className="text-sm text-zinc-400">
            Les Sifflets perdus par ta ligue sont redistribués proportionnellement aux gagnants.
          </p>
        </div>

        {/* Quitter */}
        <button
          onClick={() => { void handleLeave(); }}
          disabled={submitting}
          className="flex w-full items-center justify-center gap-2 py-3 text-xs font-bold text-zinc-600 transition hover:text-red-400 disabled:opacity-40"
        >
          <LogOut className="h-3.5 w-3.5" />
          Quitter la ligue
        </button>
      </div>
    );
  }

  // ── Créer une ligue ──────────────────────────────────────────────────────────
  if (mode === "create") {
    return (
      <div className="space-y-4 px-4 py-5">
        <button onClick={() => setMode(null)} className="text-xs font-bold text-zinc-500 hover:text-white">
          ← Retour
        </button>
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Nom de la ligue
          </p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleCreate(); }}
            maxLength={30}
            placeholder="Les Requins du Kop"
            autoFocus
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3.5 text-sm font-bold text-white placeholder-zinc-600 outline-none focus:border-amber-500/50"
          />
        </div>
        <button
          onClick={() => setIsPrivate(!isPrivate)}
          className="flex w-full items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3.5 transition hover:border-zinc-600"
        >
          <span className="text-sm font-bold text-zinc-300">Ligue privée</span>
          <span
            className={`relative h-6 w-11 rounded-full transition-colors ${isPrivate ? "bg-amber-500" : "bg-zinc-700"}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${isPrivate ? "left-[22px]" : "left-0.5"}`}
            />
          </span>
        </button>
        <button
          onClick={() => { void handleCreate(); }}
          disabled={!name.trim() || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 text-sm font-black text-black transition hover:bg-amber-400 active:scale-[0.98] disabled:opacity-40"
        >
          {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Créer la ligue
        </button>
      </div>
    );
  }

  // ── Rejoindre avec un code ───────────────────────────────────────────────────
  if (mode === "join") {
    return (
      <div className="space-y-4 px-4 py-5">
        <button onClick={() => setMode(null)} className="text-xs font-bold text-zinc-500 hover:text-white">
          ← Retour
        </button>
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Code d&apos;invitation
          </p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter") void handleJoin(); }}
            maxLength={6}
            placeholder="XK3A9Q"
            autoFocus
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3.5 font-mono text-2xl font-black tracking-[0.3em] text-amber-400 placeholder-zinc-700 outline-none focus:border-amber-500/50"
          />
        </div>
        <button
          onClick={() => { void handleJoin(); }}
          disabled={code.length < 4 || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 text-sm font-black text-black transition hover:bg-amber-400 active:scale-[0.98] disabled:opacity-40"
        >
          {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Hash className="h-4 w-4" />}
          Rejoindre
        </button>
      </div>
    );
  }

  // ── Écran d'accueil — aucune ligue ───────────────────────────────────────────
  return (
    <div className="flex flex-col items-center px-4 py-10 text-center">
      <div className="relative mb-6 h-20 w-20">
        <span className="absolute left-0 top-0 block h-7 w-7 border-l-[3px] border-t-[3px] border-amber-500/40" />
        <span className="absolute right-0 top-0 block h-7 w-7 border-r-[3px] border-t-[3px] border-amber-500/40" />
        <span className="absolute bottom-0 left-0 block h-7 w-7 border-b-[3px] border-l-[3px] border-amber-500/40" />
        <span className="absolute bottom-0 right-0 block h-7 w-7 border-b-[3px] border-r-[3px] border-amber-500/40" />
        <Swords className="absolute inset-0 m-auto h-8 w-8 text-amber-500/60" />
      </div>

      <p className="text-xl font-black text-white">Rejoins une ligue</p>
      <p className="mt-2 max-w-xs text-sm text-zinc-500">
        Chambre tes amis — leurs Sifflets perdus viennent gonfler tes gains sur ce match.
      </p>

      <div className="mt-8 w-full space-y-3">
        <button
          onClick={() => setMode("create")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 text-sm font-black text-black transition hover:bg-amber-400 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Créer ma ligue
        </button>
        <button
          onClick={() => setMode("join")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-900 py-4 text-sm font-bold text-zinc-300 transition hover:border-zinc-500 hover:text-white active:scale-[0.98]"
        >
          <Hash className="h-4 w-4" />
          Rejoindre avec un code
        </button>
      </div>
    </div>
  );
}
