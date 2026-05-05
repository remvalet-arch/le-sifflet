"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Copy,
  Check,
  Users,
  Swords,
  Plus,
  Hash,
  LoaderCircle,
  Trophy,
  Wallet,
} from "lucide-react";
import { useActiveSquad } from "@/hooks/useActiveSquad";
import { readActiveSquadFromStorage } from "@/lib/squads/active-squad-storage";
import type { SquadRow } from "@/types/database";

type SquadMember = {
  user_id: string;
  username: string;
  xp: number;
  sifflets_balance: number;
};

type SquadWithMembers = SquadRow & {
  members: SquadMember[];
  pot_commun: number;
};

type ApiResponse<T> = { ok: boolean; data?: T; error?: string };
type Tab = "mes" | "creer" | "rejoindre";

export function LiguesPageClient({ userId }: { userId: string }) {
  const { squadId: activeId, setActiveSquad } = useActiveSquad();
  const [squads, setSquads] = useState<SquadWithMembers[] | null>(null);
  const [tab, setTab] = useState<Tab>("mes");
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
        setSquads(json.data?.squads ?? []);
      })
      .catch(() => setSquads([]));
  }, []);

  useEffect(() => {
    loadSquads();
  }, [loadSquads, tick]);

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
      const json = (await res.json()) as ApiResponse<{
        squad: SquadWithMembers;
      }>;
      if (!json.ok) {
        toast.error(json.error ?? "Erreur inattendue");
        return;
      }
      toast.success("Ligue créée !");
      setActiveSquad({ id: json.data!.squad.id, name: json.data!.squad.name });
      setName("");
      setTab("mes");
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
      setCode("");
      setTab("mes");
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

  function copyInvite(
    squadId: string,
    inv: string,
    squadName: string,
    members: SquadMember[],
  ) {
    const myUsername = members.find((m) => m.user_id === userId)?.username;
    const from = myUsername ?? "Un pote";
    const message = `Hey ! ⚽ ${from} t'invite à rejoindre sa ligue "${squadName}" sur VAR TIME. Rentre ce code d'activation pour intégrer le vestiaire : ${inv}`;
    void navigator.clipboard.writeText(message);
    setCopiedSquadId(squadId);
    setTimeout(
      () => setCopiedSquadId((id) => (id === squadId ? null : id)),
      2000,
    );
    toast.success("Message d'invitation copié !");
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "mes", label: "Mes ligues" },
    { id: "creer", label: "Créer" },
    { id: "rejoindre", label: "Rejoindre" },
  ];

  return (
    <div className="space-y-5">
      <nav
        className="flex gap-1 rounded-2xl border border-white/10 bg-zinc-900/80 p-1"
        aria-label="Navigation ligues"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-xl py-2.5 text-center text-[10px] font-black uppercase tracking-widest transition ${
              tab === t.id
                ? "bg-amber-500 text-black"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "creer" && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Nom de la ligue
            </p>
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
            <span className="text-sm font-bold text-zinc-300">
              Ligue privée (code d&apos;invitation)
            </span>
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
            {submitting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Générer la ligue et le code
          </button>
        </div>
      )}

      {tab === "rejoindre" && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Code d&apos;invitation
            </p>
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
            {submitting ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Hash className="h-4 w-4" />
            )}
            Rejoindre la ligue
          </button>
        </div>
      )}

      {tab === "mes" && (
        <div className="space-y-4">
          <p className="text-sm text-zinc-500">
            Tes ligues suivent ton compte : choisis celle du{" "}
            <span className="font-bold text-amber-400/90">braquage</span> sur
            les paris en direct. Le{" "}
            <span className="font-bold text-white">pot commun</span>, c&apos;est
            la somme des Pts des membres (solde actuel).
          </p>

          {squads === null ? (
            <div className="flex justify-center py-16">
              <LoaderCircle className="h-8 w-8 animate-spin text-zinc-600" />
            </div>
          ) : squads.length > 0 ? (
            <ul className="flex flex-col gap-4">
              {squads.map((s) => (
                <li
                  key={s.id}
                  className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 flex flex-col gap-4"
                >
                  <div className="flex flex-col items-start justify-between gap-2">
                    <div className="min-w-0 w-full">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/80">
                          {s.is_private ? "Ligue privée" : "Publique"}
                        </p>
                        {s.is_private && s.invite_code && (
                          <button
                            onClick={() =>
                              copyInvite(
                                s.id,
                                s.invite_code!,
                                s.name,
                                s.members,
                              )
                            }
                            className="flex items-center gap-1 rounded border border-white/10 px-2 py-0.5 text-[10px] font-bold text-zinc-400 hover:text-white"
                          >
                            <Copy className="h-3 w-3" />
                            {copiedSquadId === s.id
                              ? "Copié!"
                              : `Code: ${s.invite_code}`}
                          </button>
                        )}
                      </div>
                      <p className="text-xl font-black text-white mt-1">
                        {s.name}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-zinc-400">
                        <Users className="h-3.5 w-3.5 shrink-0" />
                        {s.members.length} membre
                        {s.members.length > 1 ? "s" : ""}
                      </p>
                      <div className="mt-3 rounded-xl bg-green-500/10 border border-green-500/20 px-3 py-2 flex items-center gap-2 text-sm font-bold text-green-400/90 w-fit">
                        <Wallet className="h-4 w-4 shrink-0" aria-hidden />
                        Pot commun :{" "}
                        <span className="font-black tabular-nums">
                          {s.pot_commun.toLocaleString("fr-FR")} Pts
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                    <Link
                      href={`/ligues/${s.id}`}
                      className="inline-flex flex-1 justify-center items-center gap-1.5 rounded-xl border border-zinc-600 px-3 py-2.5 text-xs font-black uppercase tracking-wide text-zinc-200 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-300"
                    >
                      <Trophy className="h-3.5 w-3.5" />
                      Classement
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSquad({ id: s.id, name: s.name });
                        toast.success(`Braquage actif : ${s.name}`);
                      }}
                      className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-black uppercase tracking-wide transition ${
                        activeId === s.id
                          ? "bg-amber-500 text-black shadow-lg shadow-amber-500/20"
                          : "border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                      }`}
                    >
                      {activeId === s.id ? "Sélectionnée" : "Activer"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void handleLeave(s);
                      }}
                      disabled={submitting}
                      className="rounded-xl border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-xs font-bold text-zinc-400 hover:bg-red-500/20 hover:border-red-500/40 hover:text-red-400 disabled:opacity-40 transition-colors"
                      title="Quitter la ligue"
                    >
                      Quitter
                    </button>
                  </div>

                  {s.invite_code && s.owner_id === userId && (
                    <button
                      type="button"
                      onClick={() =>
                        copyInvite(s.id, s.invite_code!, s.name, s.members)
                      }
                      className="mt-3 flex w-full items-center justify-between rounded-xl border border-zinc-700 bg-zinc-950/80 px-3 py-2"
                    >
                      <span className="font-mono text-sm font-black tracking-[0.2em] text-amber-400">
                        {s.invite_code}
                      </span>
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
          ) : (
            <p className="rounded-2xl border border-dashed border-zinc-700 py-8 text-center text-sm text-zinc-500">
              Aucune ligue pour l&apos;instant — crée-en une ou rejoins avec un
              code.
            </p>
          )}

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="mb-1 flex items-center gap-2">
              <Swords className="h-4 w-4 text-amber-500/70" aria-hidden />
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Braquage
              </p>
            </div>
            <p className="text-sm text-zinc-400">
              Les Pts perdus par les membres de ta ligue sur un même verdict
              sont redistribués aux gagnants de cette ligue uniquement.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
