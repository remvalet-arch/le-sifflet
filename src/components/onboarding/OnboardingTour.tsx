"use client";

import { useState, useEffect } from "react";
import { trySubscribePush } from "@/components/pwa/PushOptIn";
import { Target, Trophy, Siren, BellRing } from "lucide-react";

export function OnboardingTour() {
  const [step, setStep] = useState<number | null>(null);

  useEffect(() => {
    // Ne s'affiche qu'une seule fois
    if (!localStorage.getItem("hasCompletedOnboarding")) {
      setTimeout(() => setStep(1), 0);
    }
  }, []);

  if (step === null) return null;

  function close() {
    localStorage.setItem("hasCompletedOnboarding", "true");
    setStep(null);
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center sm:items-end sm:pb-8">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-[2px]"
        onClick={close}
      />

      {step === 1 && (
        <div className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-white/10 bg-zinc-900 p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20 text-green-400">
            <Target className="h-7 w-7" />
          </div>
          <h2 className="text-center text-2xl font-black uppercase tracking-tight text-white">
            FAIS TES PRONOS
          </h2>
          <p className="mt-3 text-center text-base leading-relaxed text-zinc-400">
            Saisis tes pronos et découvre ton classement après chaque match 🤩
          </p>
          <button
            onClick={() => setStep(2)}
            className="mt-8 h-14 w-full rounded-2xl bg-green-500 font-black uppercase tracking-wide text-zinc-950 shadow-[0_0_20px_rgba(34,197,94,0.3)] transition hover:bg-green-400 active:scale-[0.98]"
          >
            J&apos;ai compris
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-white/10 bg-zinc-900 p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-8">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
            <Trophy className="h-7 w-7" />
          </div>
          <h2 className="text-center text-2xl font-black uppercase tracking-tight text-white">
            REJOINS LES LIGUES AVEC TES POTES
          </h2>
          <p className="mt-3 text-center text-base leading-relaxed text-zinc-400">
            Défie tes amis, rejoins une ligue, et braque la VAR !
          </p>
          <button
            onClick={() => setStep(3)}
            className="mt-8 h-14 w-full rounded-2xl bg-amber-500 font-black uppercase tracking-wide text-zinc-950 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition hover:bg-amber-400 active:scale-[0.98]"
          >
            Suivant
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="relative z-10 w-full h-full sm:h-auto sm:max-w-sm sm:rounded-3xl border-t border-white/10 sm:border bg-zinc-900 flex flex-col animate-in fade-in slide-in-from-bottom-8">
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border-4 border-red-500/20 bg-red-500/10 text-red-500 relative">
              <Siren className="h-10 w-10" />
              <div className="absolute -right-1 -top-1 rounded-full bg-red-500 w-6 h-6 flex items-center justify-center animate-bounce">
                <span className="text-[10px] font-black text-white">1</span>
              </div>
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight text-white">
              ACTIVE TES NOTIFS !
            </h2>
            <p className="mt-4 text-base leading-relaxed text-zinc-400">
              Pour ne rater aucune VAR ni les résultats de tes potes.
            </p>
          </div>

          <div className="p-6 pt-0 pb-10 sm:pb-6 flex flex-col gap-3">
            <button
              onClick={async () => {
                await trySubscribePush();
                close();
              }}
              className="h-14 w-full rounded-2xl flex items-center justify-center gap-2 bg-white font-black uppercase tracking-wide text-zinc-950 shadow-lg transition hover:bg-zinc-200 active:scale-[0.98]"
            >
              <BellRing className="h-5 w-5" />
              Activer les notifs
            </button>
            <button
              onClick={close}
              className="h-14 w-full rounded-2xl font-bold tracking-wide text-zinc-500 transition hover:bg-white/5 active:scale-[0.98]"
            >
              Plus tard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
