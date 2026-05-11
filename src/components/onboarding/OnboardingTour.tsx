"use client";

import { useState, useEffect } from "react";
import { trySubscribePush } from "@/components/pwa/PushOptIn";
import { Target, Trophy, Siren, BellRing, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LOBBY_TRACKED_LEAGUE_API_IDS } from "@/lib/constants/top-leagues";

const COMPETITION_FLAGS: Record<number, string> = {
  61: "🇫🇷",
  39: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  140: "🇪🇸",
  135: "🇮🇹",
  78: "🇩🇪",
  2: "🏆",
  3: "🥈",
};

type CompStub = {
  id: string;
  name: string;
  api_football_league_id: number | null;
};

export function OnboardingTour() {
  const [step, setStep] = useState<number | null>(null);
  const [availableComps, setAvailableComps] = useState<CompStub[]>([]);
  const [selectedCompIds, setSelectedCompIds] = useState<string[]>([]);
  const [savingComps, setSavingComps] = useState(false);

  useEffect(() => {
    // Ne s'affiche qu'une seule fois
    if (!localStorage.getItem("hasCompletedOnboarding")) {
      setTimeout(() => setStep(1), 0);
    }
  }, []);

  // Load available competitions when step 2 is shown
  useEffect(() => {
    if (step !== 2 || availableComps.length > 0) return;
    const supabase = createClient();
    void supabase
      .from("competitions")
      .select("id, name, api_football_league_id")
      .in("api_football_league_id", LOBBY_TRACKED_LEAGUE_API_IDS as number[])
      .then(({ data }) => {
        const sorted = (data ?? []).sort((a, b) => {
          const orderA = LOBBY_TRACKED_LEAGUE_API_IDS.indexOf(
            a.api_football_league_id ?? -1,
          );
          const orderB = LOBBY_TRACKED_LEAGUE_API_IDS.indexOf(
            b.api_football_league_id ?? -1,
          );
          return orderA - orderB;
        });
        setAvailableComps(sorted);
        // Pre-select all by default
        setSelectedCompIds(sorted.map((c) => c.id));
      });
  }, [step, availableComps.length]);

  if (step === null) return null;

  async function saveLeaguePrefs() {
    if (savingComps) return;
    setSavingComps(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferred_competitions: selectedCompIds }),
      });
    } catch {
      // Silent fail — user can edit in profile later
    } finally {
      setSavingComps(false);
    }
  }

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
          <button
            type="button"
            onClick={close}
            aria-label="Passer l'intro"
            data-testid="onboarding-skip"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
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
        <div className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-8">
          <button
            type="button"
            onClick={close}
            aria-label="Passer l'intro"
            data-testid="onboarding-skip"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-center text-xl font-black uppercase tracking-tight text-white">
            Choisis tes ligues
          </h2>
          <p className="mt-2 text-center text-sm leading-relaxed text-zinc-400">
            Tes pronos et notifs seront filtrés sur ces compétitions.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {availableComps.map((comp) => {
              const isSelected = selectedCompIds.includes(comp.id);
              const flag = comp.api_football_league_id
                ? (COMPETITION_FLAGS[comp.api_football_league_id] ?? "⚽")
                : "⚽";
              return (
                <button
                  key={comp.id}
                  type="button"
                  onClick={() =>
                    setSelectedCompIds((prev) =>
                      isSelected
                        ? prev.filter((id) => id !== comp.id)
                        : [...prev, comp.id],
                    )
                  }
                  className={`rounded-full border px-3 py-2 text-[11px] font-black uppercase tracking-wide transition ${
                    isSelected
                      ? "border-whistle bg-whistle/20 text-whistle"
                      : "border-white/10 bg-zinc-800 text-zinc-400"
                  }`}
                >
                  {flag} {comp.name}
                </button>
              );
            })}
          </div>
          <button
            onClick={async () => {
              await saveLeaguePrefs();
              setStep(3);
            }}
            disabled={savingComps}
            className="mt-6 h-14 w-full rounded-2xl bg-whistle font-black uppercase tracking-wide text-pitch-900 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition hover:opacity-90 active:scale-[0.98] disabled:opacity-60"
          >
            C&apos;est parti !
          </button>
        </div>
      )}

      {step === 3 && (
        <div className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-white/10 bg-zinc-900 p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-8">
          <button
            type="button"
            onClick={close}
            aria-label="Passer l'intro"
            data-testid="onboarding-skip"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
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
            onClick={() => setStep(4)}
            className="mt-8 h-14 w-full rounded-2xl bg-whistle font-black uppercase tracking-wide text-zinc-950 shadow-[0_0_20px_rgba(250,204,21,0.3)] transition hover:bg-whistle/90 active:scale-[0.98]"
          >
            Suivant
          </button>
        </div>
      )}

      {step === 4 && (
        <div className="relative z-10 w-full h-full sm:h-auto sm:max-w-sm sm:rounded-3xl border-t border-white/10 sm:border bg-zinc-900 flex flex-col animate-in fade-in slide-in-from-bottom-8">
          <button
            type="button"
            onClick={close}
            aria-label="Passer l'intro"
            data-testid="onboarding-skip"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-zinc-300"
          >
            <X className="h-4 w-4" />
          </button>
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

          <div
            className="p-6 pt-0 sm:pb-6 flex flex-col gap-3"
            style={{
              paddingBottom: "max(env(safe-area-inset-bottom, 0px), 2.5rem)",
            }}
          >
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
