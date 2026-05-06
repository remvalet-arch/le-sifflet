"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Copy,
  Users,
  Swords,
  Plus,
  Hash,
  LoaderCircle,
  Wallet,
  ChevronRight,
  LogOut,
  X,
} from "lucide-react";
import { useActiveSquad } from "@/hooks/useActiveSquad";
import { readActiveSquadFromStorage } from "@/lib/squads/active-squad-storage";
import type { SquadRow } from "@/types/database";
import { CreateLeagueWizard } from "./CreateLeagueWizard";

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

export function LiguesPageClient({ userId }: { userId: string }) {
  const router = useRouter();
  const { squadId: activeId, setActiveSquad } = useActiveSquad();
  const [squads, setSquads] = useState<SquadWithMembers[] | null>(null);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copiedSquadId, setCopiedSquadId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

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
      setJoinOpen(false);
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
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const message = `Hey ! ⚽ ${from} t'invite à rejoindre sa ligue "${squadName}" sur VAR TIME.\n\nRentre ce code pour intégrer le vestiaire : ${inv}\n\nLien: ${origin}/ligues`;

    if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
      navigator
        .share({ title: `Rejoins ${squadName} sur VAR TIME`, text: message })
        .catch(() => writeToClipboard(squadId, message));
    } else {
      writeToClipboard(squadId, message);
    }
  }

  function writeToClipboard(squadId: string, message: string) {
    void navigator.clipboard.writeText(message);
    setCopiedSquadId(squadId);
    setTimeout(
      () => setCopiedSquadId((id) => (id === squadId ? null : id)),
      2000,
    );
    toast.success("Message d'invitation copié !");
  }

  return (
    <div className="space-y-4">
      {/* CTA row */}
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 py-3 text-sm font-black text-amber-300 transition active:scale-[0.98] hover:bg-amber-500/20"
        >
          <Plus className="h-4 w-4" />
          Créer
        </button>
        <button
          type="button"
          onClick={() => setJoinOpen(true)}
          className="flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-zinc-800/60 py-3 text-sm font-black text-zinc-300 transition active:scale-[0.98] hover:bg-zinc-800"
        >
          <Hash className="h-4 w-4" />
          Rejoindre
        </button>
      </div>

      {/* Squads list */}
      {squads === null ? (
        <div className="flex justify-center py-16">
          <LoaderCircle className="h-8 w-8 animate-spin text-zinc-600" />
        </div>
      ) : squads.length > 0 ? (
        <ul className="flex flex-col gap-3">
          {squads.map((s) => (
            <li key={s.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => router.push(`/ligues/${s.id}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") router.push(`/ligues/${s.id}`);
                }}
                className="cursor-pointer rounded-2xl border border-white/10 bg-zinc-900/70 px-5 py-4 transition hover:border-white/20 hover:bg-zinc-900 active:scale-[0.99]"
              >
                {/* Main info row */}
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="mb-0.5 text-[10px] font-black uppercase tracking-widest text-amber-500/80">
                      {s.is_private ? "Ligue privée" : "Publique"}
                    </p>
                    <p className="text-xl font-black tracking-tight text-white">
                      {s.name}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-1 text-[11px] font-medium text-zinc-500">
                        <Users className="h-3 w-3 shrink-0" />
                        {s.members.length} membre
                        {s.members.length > 1 ? "s" : ""}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] font-bold text-green-400/90">
                        <Wallet className="h-3 w-3 shrink-0" aria-hidden />
                        {s.pot_commun.toLocaleString("fr-FR")} Pts
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-zinc-600" />
                </div>

                {/* Sub-actions row — stopPropagation to avoid card navigation */}
                <div
                  className="mt-3 flex items-center gap-2 border-t border-white/5 pt-3"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  {s.is_private && s.invite_code && (
                    <button
                      type="button"
                      onClick={() =>
                        copyInvite(s.id, s.invite_code!, s.name, s.members)
                      }
                      className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-800 px-3 py-1.5 text-[11px] font-bold text-zinc-400 hover:bg-zinc-700"
                    >
                      <Copy className="h-3 w-3" />
                      {copiedSquadId === s.id
                        ? "Copié !"
                        : `Code: ${s.invite_code}`}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void handleLeave(s)}
                    disabled={submitting}
                    className="ml-auto flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-1.5 text-[11px] font-bold text-zinc-500 transition-colors hover:border-red-500/40 hover:bg-red-500/20 hover:text-red-400 disabled:opacity-40"
                    title="Quitter la ligue"
                  >
                    <LogOut className="h-3 w-3" />
                    Quitter
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-700 px-5 py-10 text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-3xl">
            ⚽
          </div>
          <div>
            <p className="text-base font-black text-white">
              Tu joues en solo pour l&apos;instant
            </p>
            <p className="mt-1.5 text-sm text-zinc-400">
              Chambrage entre potes, classement de ligue, mode 1vs1… crée ta
              ligue ou rejoins celle d&apos;un ami !
            </p>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="mx-auto flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-black text-black transition hover:bg-amber-400 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              Créer une ligue
            </button>
            <button
              type="button"
              onClick={() => setJoinOpen(true)}
              className="mx-auto text-sm font-bold text-amber-400 hover:underline"
            >
              J&apos;ai un code d&apos;invitation
            </button>
          </div>
        </div>
      )}

      {/* Braquage info */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
        <div className="mb-1 flex items-center gap-2">
          <Swords className="h-4 w-4 text-amber-500/70" aria-hidden />
          <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Braquage
          </p>
        </div>
        <p className="text-sm text-zinc-400">
          Tu joues contre toute la communauté. Les Pts des joueurs qui se
          trompent financent les gagnants — ta ligue sert de classement et de
          lieu de chambrage entre amis.
        </p>
      </div>

      {/* Join bottom sheet */}
      {joinOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-end"
          onClick={() => setJoinOpen(false)}
        >
          <div
            className="relative w-full rounded-t-3xl border-t border-white/10 bg-zinc-900 px-5 pb-8 pt-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-base font-black text-white">
                Rejoindre une ligue
              </p>
              <button
                type="button"
                onClick={() => setJoinOpen(false)}
                className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
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
            <button
              type="button"
              onClick={() => void handleJoin()}
              disabled={code.length < 4 || submitting}
              className="mt-4 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-amber-500 py-4 text-sm font-black text-black transition hover:bg-amber-400 active:scale-[0.98] disabled:opacity-40"
            >
              {submitting ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Hash className="h-4 w-4" />
              )}
              Rejoindre la ligue
            </button>
          </div>
        </div>
      )}

      {wizardOpen && (
        <CreateLeagueWizard
          onClose={() => setWizardOpen(false)}
          onCreated={(newSquadId, newSquadName) => {
            setActiveSquad({ id: newSquadId, name: newSquadName });
            setWizardOpen(false);
            setTick((t) => t + 1);
          }}
        />
      )}
    </div>
  );
}
