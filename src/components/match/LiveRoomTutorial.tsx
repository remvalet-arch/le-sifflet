"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "hasSeenLiveRoomTutorial";

const STEPS = [
  {
    emoji: "🚨",
    title: "SIGNALE UNE ACTION",
    body: "Tu repères une VAR douteuse ? Appuie sur le bouton correspondant dans la LiveRoom. Si assez de joueurs confirment en 30s, un marché de paris s'ouvre !",
  },
  {
    emoji: "⏱️",
    title: "MISE TES SIFFLETS EN 90S",
    body: "Tu as 90 secondes pour miser sur OUI (arbitre valide) ou NON (décision inversée). Les cotes bougent en temps réel selon les mises de tous. Plus tu es malin, plus tu gagnes.",
  },
];

export function LiveRoomTutorial() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      setTimeout(() => setVisible(true), 0);
    }
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  function next() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }

  if (!visible) return null;

  const current = STEPS[step]!;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/80 pb-8 px-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-whistle" : "w-1.5 bg-zinc-700"}`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1 text-zinc-600 hover:text-zinc-400 transition"
            aria-label="Fermer le tutoriel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="text-center space-y-3">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-800 text-3xl">
            {current.emoji}
          </div>
          <h2 className="text-lg font-black text-white">{current.title}</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            {current.body}
          </p>
        </div>

        <button
          type="button"
          onClick={next}
          className="mt-6 w-full flex items-center justify-center rounded-2xl bg-whistle py-4 text-sm font-black uppercase tracking-wide text-black transition hover:opacity-90 active:scale-[0.98]"
        >
          {step < STEPS.length - 1 ? "Suivant →" : "C'est parti !"}
        </button>

        {step < STEPS.length - 1 && (
          <button
            type="button"
            onClick={dismiss}
            className="mt-2 w-full text-center text-xs font-bold text-zinc-600 hover:text-zinc-400 py-1"
          >
            Passer le tutoriel
          </button>
        )}
      </div>
    </div>
  );
}
