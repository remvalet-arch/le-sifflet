"use client";

import { LoaderCircle } from "lucide-react";
import type { AlertActionType } from "@/types/database";

const ALERTS: {
  type: AlertActionType;
  emoji: string;
  label: string;
  featured?: boolean;
}[] = [
  { type: "penalty_check",   emoji: "📢", label: "Y'A PÉNO LÀ !!",          featured: true },
  { type: "penalty_outcome", emoji: "🥅", label: "PÉNO : AU FOND OU PAS ?" },
  { type: "var_goal",        emoji: "🚩", label: "HORS-JEU / BUT ANNULÉ ?"  },
  { type: "red_card",        emoji: "🟥", label: "SORTEZ LE ROUGE !"         },
  { type: "injury_sub",      emoji: "🚑", label: "CINÉMA OU CIVIÈRE ?"       },
];

type Props = {
  open: boolean;
  onClose: () => void;
  isOnCooldown: boolean;
  cooldownMins: number;
  cooldownSecs: string;
  pendingType: AlertActionType | null;
  signaledTypes: Set<AlertActionType>;
  onAlert: (type: AlertActionType) => void;
};

export function AlertDrawer({
  open,
  onClose,
  isOnCooldown,
  cooldownMins,
  cooldownSecs,
  pendingType,
  signaledTypes,
  onAlert,
}: Props) {
  return (
    <>
      {/* Backdrop — au-dessus de la BottomNav (z-50) */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-[90] bg-black/60 transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Drawer — colle au bas de l'écran */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[100] rounded-t-3xl border-t border-white/10 bg-zinc-900 pt-4 transition-transform duration-300 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-zinc-700" />

        <p className="mb-4 text-center text-xs font-black uppercase tracking-widest text-zinc-500">
          T&apos;as vu quelque chose ?
        </p>

        {isOnCooldown ? (
          <div className="mx-4 flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-6 py-8 text-center">
            <LoaderCircle className="h-8 w-8 animate-spin text-yellow-400" />
            <p className="font-black uppercase tracking-wide text-white">
              L&apos;arbitre consulte la VAR…
            </p>
            <p className="text-sm text-zinc-400">
              Retour dans{" "}
              <span className="font-bold text-yellow-400">
                {cooldownMins}:{cooldownSecs}
              </span>
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 px-4">
            {ALERTS.map(({ type, emoji, label, featured }) => {
              const isPending = pendingType === type;
              const isSignaled = signaledTypes.has(type);
              const disabled = !!pendingType || isSignaled;

              if (featured) {
                return (
                  <button
                    key={type}
                    onClick={() => { onAlert(type); onClose(); }}
                    disabled={disabled}
                    className={`col-span-2 flex h-20 items-center justify-center gap-3 rounded-2xl border-2 bg-zinc-800 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                      isSignaled
                        ? "border-yellow-400/50 bg-yellow-400/10"
                        : "border-green-500/50 hover:bg-zinc-700"
                    }`}
                  >
                    <span className="text-3xl leading-none">
                      {isPending ? "" : isSignaled ? "⏳" : emoji}
                    </span>
                    {isPending ? (
                      <LoaderCircle className="h-5 w-5 animate-spin text-zinc-400" />
                    ) : (
                      <span
                        className={`text-base font-black uppercase tracking-wide ${
                          isSignaled ? "text-yellow-400" : "text-white"
                        }`}
                      >
                        {isSignaled ? "Signal envoyé…" : label}
                      </span>
                    )}
                  </button>
                );
              }

              return (
                <button
                  key={type}
                  onClick={() => { onAlert(type); onClose(); }}
                  disabled={disabled}
                  className={`flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border bg-zinc-800 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${
                    isSignaled
                      ? "border-yellow-400/40 bg-yellow-400/10"
                      : "border-zinc-700 hover:bg-zinc-700"
                  }`}
                >
                  <span className="text-3xl leading-none">
                    {isPending ? "" : isSignaled ? "⏳" : emoji}
                  </span>
                  {isPending ? (
                    <LoaderCircle className="h-4 w-4 animate-spin text-zinc-400" />
                  ) : (
                    <span
                      className={`px-2 text-center text-[11px] font-black uppercase leading-tight ${
                        isSignaled ? "text-yellow-400" : "text-zinc-300"
                      }`}
                    >
                      {isSignaled ? "En attente…" : label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
