"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { completeOnboarding } from "@/app/actions/onboarding";

const STEPS = [
  {
    emoji: "🔥",
    title: "Bienvenue dans le Kop",
    text: "L'arbitre principal, c'est vous. Ici, les alertes sont lancées en direct par les supporters.",
  },
  {
    emoji: "⏱️",
    title: "La VAR hésite ?",
    text: "Une action litigieuse ? Lance l'alerte ! Si le stade confirme, les prédictions s'ouvrent. Prédis le verdict avant que l'arbitre ne tranche.",
  },
  {
    emoji: "🏆",
    title: "Pour la gloire (100% gratuit)",
    text: "Pas d'argent réel, on joue pour le respect. Gagne des Pts avec de bonnes prédictions. Les trolls perdent tout. Prêt ?",
  },
];

export function Onboarding() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  async function handleComplete() {
    setLoading(true);
    await completeOnboarding();
    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950/98 p-6 backdrop-blur-md">
      <div className="w-full max-w-sm">
        {/* Step card */}
        <div className="rounded-3xl border border-white/10 bg-zinc-900 p-8 text-center shadow-2xl">
          <span className="text-6xl leading-none">{current.emoji}</span>
          <h2 className="mt-5 text-2xl font-black uppercase tracking-tight text-white">
            {current.title}
          </h2>
          <p className="mt-3 text-base leading-relaxed text-zinc-400">
            {current.text}
          </p>

          {isLast ? (
            <button
              onClick={handleComplete}
              disabled={loading}
              className="mt-8 h-14 w-full rounded-2xl bg-green-500 font-black uppercase tracking-wide text-zinc-950 shadow-lg transition hover:bg-green-400 active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? "Chargement…" : "Entrer sur le terrain →"}
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="mt-8 h-14 w-full rounded-2xl bg-white/10 font-black uppercase tracking-wide text-white transition hover:bg-white/15 active:scale-[0.98]"
            >
              Suivant →
            </button>
          )}
        </div>

        {/* Pagination dots */}
        <div className="mt-6 flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-green-500" : "w-2 bg-zinc-700"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
