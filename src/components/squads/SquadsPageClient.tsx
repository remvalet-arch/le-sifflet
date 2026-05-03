"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Copy, Check, Users, Swords, Plus, Hash, LoaderCircle } from "lucide-react";
import { useActiveSquad } from "@/hooks/useActiveSquad";
import { readActiveSquadFromStorage } from "@/lib/squads/active-squad-storage";
import type { SquadRow } from "@/types/database";

type SquadMember = { user_id: string; username: string };

type SquadWithMembers = SquadRow & { members: SquadMember[] };

type ApiResponse<T> = { ok: boolean; data?: T; error?: string };
type Mode = null | "create" | "join";

export function SquadsPageClient({ userId }: { userId: string }) {
  const { squadId: activeId, setActiveSquad } = useActiveSquad();
  const [squads, setSquads] = useState<SquadWithMembers[] | null>(null);
  const [mode, setMode] = useState<Mode>(null);
  const [name, setName] = useState("");
  const [isPrivate, setIsPrivate] = useState(true);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copiedSquadId, setCopiedSquadId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const loadSquads = useCallback(() => {
    void fetch("/api/squads")
      .then((r) => r.json())
      .then((json: ApiResponse<{ squads: SquadWithMembers[] }>) => {
        if (!json.ok) {
          setSquads([]);
          return;
        }
        const list = json.data?.squads ?? [];
        setSquads(list);
      })
      .catch(() => setSquads([]));
  }, []);

  useEffect(() => {
    loadSquads();
  }, [loadSquads, tick]);

  /** Une seule squad : braquage actif par défaut si rien en localStorage. */
  useEffect(() => {
    if (!squads || squads.length !== 1) return;
    if (!readActiveSquadFromStorage()) {
      const s = squads[0]!;
      setActiveSquad({ id: s.id, name: s.name });
    }
  }, [squads, setActiveSquad]);

  async function handleCreate() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/squads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), is_private: isPrivate }),
      });
      const json = (await res.json()) as ApiResponse<{ squad: SquadWithMembers }>;
      if (!json.ok) {
        toast.error(json.error ?? "Erreur inattendue");
        return;
      }
      toast.success("Ligue créée !");
      setActiveSquad({ id: json.data!.squad.id, name: json.data!.squad.name });
      setMode(null);
      setName("");
      setTick((t) => t + 1);
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
      const res = await fetch("/api/squads/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_code: code.trim().toUpperCase() }),
      });
      const json = (await res.json()) as ApiResponse<{ squad: SquadRow }>;
      if (!json.ok) {
        toast.error(json.error ?? "Code invalide");
        return;
      }
      toast.success("Ligue rejointe !");
      setActiveSquad({ id: json.data!.squad.id, name: json.data!.squad.name });
      setMode(null);
      setCode("");
      setTick((t) => t + 1);
    } catch {
      toast.error("Connexion perdue, réessaie !");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLeave(squad: SquadWithMembers) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/squads/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ squad_id: squad.id }),
      });
      const json = (await res.json()) as ApiResponse<Record<string, never>>;
      if (!json.ok) {
        toast.error(json.error ?? "Erreur inattendue");
        return;
      }
      toast.success("Tu as quitté la ligue");
      if (activeId === squad.id) setActiveSquad(null);
      setTick((t) => t + 1);
    } catch {
      toast.error("Connexion perdue, réessaie !");
    } finally {
      setSubmitting(false);
    }
  }

  function copyInvite(squadId: string, inv: string) {
    void navigator.clipboard.writeText(inv);
    setCopiedSquadId(squadId);
    setTimeout(() => setCopiedSquadId((id) => (id === squadId ? null : id)), 2000);
    toast.success("Code copié !");
  }

  if (squads === null) {
    return (
      <div className="flex justify-center py-20">
        <LoaderCircle className="h-8 w-8 animate-spin text-zinc-600" />
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setMode(null)} className="text-xs font-bold text-zinc-500 hover:text-white">
          ← Retour
        </button>
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Nom de la ligue</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleCreate();
            }}
            maxLength={30}
            placeholder="Les Requins du Kop"
            autoFocus
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3.5 text-sm font-bold text-white placeholder-zinc-600 outline-none focus:border-amber-500/50"
          />
        </div>
        <button
          type="button"
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
          type="button"
          onClick={() => {
            void handleCreate();
          }}
          disabled={!name.trim() || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 text-sm font-black text-black transition hover:bg-amber-400 active:scale-[0.98] disabled:opacity-40"
        >
          {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Créer la ligue
        </button>
      </div>
    );
  }

  if (mode === "join") {
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setMode(null)} className="text-xs font-bold text-zinc-500 hover:text-white">
          ← Retour
        </button>
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">Code d&apos;invitation</p>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleJoin();
            }}
            maxLength={6}
            placeholder="XK3A9Q"
            autoFocus
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-4 py-3.5 font-mono text-2xl font-black tracking-[0.3em] text-amber-400 placeholder-zinc-700 outline-none focus:border-amber-500/50"
          />
        </div>
        <button
          type="button"
          onClick={() => {
            void handleJoin();
          }}
          disabled={code.length < 4 || submitting}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 text-sm font-black text-black transition hover:bg-amber-400 active:scale-[0.98] disabled:opacity-40"
        >
          {submitting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Hash className="h-4 w-4" />}
          Rejoindre
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-500">
        Tes ligues suivent ton compte : choisis celle utilisée pour le{" "}
        <span className="font-bold text-amber-400/90">braquage</span> sur les paris en direct.
      </p>

      {squads.length > 0 && (
        <ul className="flex flex-col gap-3">
          {squads.map((s) => (
            <li
              key={s.id}
              className="rounded-2xl border border-white/10 bg-zinc-900/70 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/80">
                    {s.is_private ? "Ligue privée" : "Publique"}
                  </p>
                  <p className="text-lg font-black text-white">{s.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                    <Users className="h-3.5 w-3.5" />
                    {s.members.length} membre{s.members.length > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSquad({ id: s.id, name: s.name });
                      toast.success(`Braquage : ${s.name}`);
                    }}
                    className={`rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wide transition ${
                      activeId === s.id
                        ? "bg-amber-500 text-black"
                        : "border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                    }`}
                  >
                    {activeId === s.id ? "Active" : "Utiliser"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void handleLeave(s);
                    }}
                    disabled={submitting}
                    className="rounded-xl border border-zinc-700 px-3 py-2 text-xs font-bold text-zinc-500 hover:border-red-500/40 hover:text-red-400 disabled:opacity-40"
                  >
                    Quitter
                  </button>
                </div>
              </div>

              {s.invite_code && s.owner_id === userId && (
                <button
                  type="button"
                  onClick={() => copyInvite(s.id, s.invite_code!)}
                  className="mt-3 flex w-full items-center justify-between rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2"
                >
                  <span className="font-mono text-sm font-black tracking-[0.2em] text-amber-400">{s.invite_code}</span>
                  {copiedSquadId === s.id ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4 text-zinc-500" />
                  )}
                </button>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {s.members.map((m) => (
                  <span
                    key={m.user_id}
                    className="rounded-full border border-zinc-700 bg-zinc-800/80 px-2 py-0.5 text-[10px] font-bold text-zinc-400"
                  >
                    {m.user_id === userId ? "Toi" : m.username}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="mb-1 flex items-center gap-2">
          <Swords className="h-4 w-4 text-amber-500/70" />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Braquage</p>
        </div>
        <p className="text-sm text-zinc-400">
          Les Pts perdus par les membres de ta ligue sur un même verdict sont redistribués aux gagnants de cette ligue
          uniquement.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setMode("create")}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 text-sm font-black text-black transition hover:bg-amber-400 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Créer une ligue
        </button>
        <button
          type="button"
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
