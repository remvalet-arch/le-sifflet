"use client";

import { useState, useEffect, useRef } from "react";
import { trySubscribePush } from "@/components/pwa/PushOptIn";
import { X, BellRing, Siren, CheckCircle2, ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";

const TOTAL_STEPS = 4;
type VarVote = "oui" | "non" | "timeout" | null;

function ProgressDots({
  current,
  onBack,
}: {
  current: number;
  onBack?: () => void;
}) {
  return (
    <div className="mb-6 flex items-center gap-3">
      {onBack && current > 1 ? (
        <button
          type="button"
          onClick={onBack}
          aria-label="Étape précédente"
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-zinc-300"
        >
          <ChevronLeft className="size-4" />
        </button>
      ) : (
        <div className="size-7 shrink-0" aria-hidden />
      )}
      <div className="flex flex-1 items-center justify-center gap-1.5">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={onBack && i + 1 < current ? onBack : undefined}
            aria-label={i + 1 < current ? "Revenir à cette étape" : undefined}
            className={`rounded-full transition-all duration-300 ${
              i + 1 === current
                ? "h-2 w-6 bg-whistle"
                : i + 1 < current
                  ? "size-2 cursor-pointer bg-whistle/60 hover:bg-whistle/90"
                  : "size-2 bg-white/15"
            }`}
          />
        ))}
      </div>
      <div className="size-7 shrink-0" aria-hidden />
    </div>
  );
}

export function OnboardingTour() {
  const t = useTranslations("Onboarding");
  const [step, setStep] = useState<number | null>(null);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);

  // Step 2 — VAR simulation
  const [varVote, setVarVote] = useState<VarVote>(null);
  const [varTimer, setVarTimer] = useState(30);
  const [showVarResult, setShowVarResult] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Step 3 — guided prono
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [pronoSubmitted, setPronoSubmitted] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("hasCompletedOnboarding")) return;
    const saved = localStorage.getItem("onboardingStep");
    const startStep = saved ? parseInt(saved, 10) : 1;
    const id = setTimeout(() => setStep(startStep), 0);
    return () => clearTimeout(id);
  }, []);

  // Step 2 countdown timer — varTimer already initialized to 30 via useState
  useEffect(() => {
    if (step !== 2 || varVote !== null || showVarResult) return;
    timerRef.current = setInterval(() => {
      setVarTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => {
            setVarVote("timeout");
            setShowVarResult(true);
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [step, varVote, showVarResult]);

  if (step === null) return null;

  function saveStep(s: number) {
    localStorage.setItem("onboardingStep", String(s));
    setStep(s);
  }

  function goBack() {
    if (!step || step <= 1) return;
    // Réinitialise les états de la step qu'on quitte
    if (step === 2) {
      if (timerRef.current) clearInterval(timerRef.current);
      setVarVote(null);
      setVarTimer(30);
      setShowVarResult(false);
    }
    if (step === 3) {
      setHomeScore("");
      setAwayScore("");
      setPronoSubmitted(false);
    }
    saveStep(step - 1);
  }

  function close() {
    localStorage.setItem("hasCompletedOnboarding", "true");
    localStorage.removeItem("onboardingStep");
    setStep(null);
  }

  function handleVote(vote: "oui" | "non") {
    if (timerRef.current) clearInterval(timerRef.current);
    setVarVote(vote);
    setTimeout(() => setShowVarResult(true), 350);
  }

  // Skip confirmation overlay
  if (showSkipConfirm) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px]" />
        <div className="relative z-10 w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-900 p-8 shadow-2xl animate-in fade-in zoom-in-95">
          <h2 className="text-center text-xl font-semibold text-white">
            {t("skipConfirm")}
          </h2>
          <p className="mt-2 text-center text-sm text-zinc-400">
            {t("skipConfirmDesc")}
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              onClick={close}
              className="h-12 w-full rounded-2xl border border-red-500/30 bg-red-500/10 font-black text-red-400 transition hover:bg-red-500/20 active:scale-[0.98]"
            >
              {t("skipYes")}
            </button>
            <button
              type="button"
              onClick={() => setShowSkipConfirm(false)}
              className="h-12 w-full rounded-2xl font-bold text-zinc-400 transition hover:bg-white/5 active:scale-[0.98]"
            >
              {t("skipNo")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:pb-8">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-[2px]" />

      {/* ── Step 1 — Bienvenue ──────────────────────────────────────────── */}
      {step === 1 && (
        <div className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-white/10 bg-zinc-900 p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-8">
          <button
            type="button"
            onClick={() => setShowSkipConfirm(true)}
            aria-label={t("skip")}
            className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-zinc-300"
          >
            <X className="size-4" />
          </button>

          <ProgressDots current={1} onBack={goBack} />

          <div className="mb-6 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-whistle/20">
              <span className="text-3xl" aria-hidden="true">
                🏆
              </span>
            </div>
            <h2 className="text-3xl font-semibold uppercase tracking-tight text-white">
              VAR TIME
            </h2>
            <p className="mt-1 text-xs font-black uppercase tracking-widest text-whistle">
              {t("step1Tagline")}
            </p>
          </div>

          <p className="text-center text-sm leading-relaxed text-zinc-300">
            {t("step1Body")}
          </p>

          <button
            type="button"
            onClick={() => saveStep(2)}
            className="mt-8 h-14 w-full rounded-2xl bg-whistle font-black uppercase tracking-wide text-zinc-950 shadow-[0_0_20px_rgba(250,204,21,0.3)] transition hover:bg-whistle/90 active:scale-[0.98]"
          >
            {t("step1Cta")}
          </button>
        </div>
      )}

      {/* ── Step 2 — Simulation pari VAR ───────────────────────────────── */}
      {step === 2 && (
        <div className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl animate-in fade-in slide-in-from-bottom-8 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowSkipConfirm(true)}
            aria-label={t("skip")}
            className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-zinc-300"
          >
            <X className="size-4" />
          </button>

          {!showVarResult ? (
            <div className="p-6">
              <ProgressDots current={2} onBack={goBack} />

              <p className="mb-1 text-center text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {t("step2Subtitle")}
              </p>
              <h2 className="mb-5 text-center text-xl font-semibold text-white">
                {t("step2Title")}
              </h2>

              {/* Fake live match */}
              <div className="mb-4 rounded-2xl bg-zinc-800/60 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-black text-zinc-400">
                    {t("step2FakeMatch")}
                  </span>
                  <span className="text-xs font-black text-red-400 animate-pulse">
                    ● LIVE
                  </span>
                </div>
                <div className="flex items-center justify-center gap-6">
                  <p className="text-sm font-black text-white">PSG</p>
                  <div className="text-center">
                    <p className="text-3xl font-black text-white">1 : 1</p>
                    <p className="text-[10px] text-zinc-500">68&apos;</p>
                  </div>
                  <p className="text-sm font-black text-white">Real</p>
                </div>
              </div>

              {/* VAR question card */}
              <div className="mb-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <p className="mb-1 text-xs font-black uppercase tracking-widest text-amber-400">
                  ⚡ VAR
                </p>
                <p className="text-base font-black text-white">
                  {t("step2Question")}
                </p>
                <p className="mt-2 text-xs text-zinc-400">{t("step2Stake")}</p>
              </div>

              {/* Timer */}
              <p className="mb-4 text-center text-sm font-black text-zinc-400">
                {t("step2Timer", { s: varTimer })}
              </p>

              {/* OUI / NON */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleVote("oui")}
                  className="h-16 rounded-2xl border-2 border-green-500/40 bg-green-500/20 text-xl font-black text-green-400 transition hover:border-green-400 hover:bg-green-500/30 active:scale-[0.97]"
                >
                  {t("step2Yes")}
                </button>
                <button
                  type="button"
                  onClick={() => handleVote("non")}
                  className="h-16 rounded-2xl border-2 border-red-500/40 bg-red-500/20 text-xl font-black text-red-400 transition hover:border-red-400 hover:bg-red-500/30 active:scale-[0.97]"
                >
                  {t("step2No")}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <ProgressDots current={2} onBack={goBack} />

              {/* Result badge */}
              <div
                className={`mb-5 rounded-2xl border p-4 text-center ${
                  varVote === "oui"
                    ? "border-green-500/20 bg-green-500/10"
                    : varVote === "timeout"
                      ? "border-zinc-700/40 bg-zinc-800/60"
                      : "border-zinc-700/40 bg-zinc-800/60"
                }`}
              >
                <p className="mb-2 text-3xl" aria-hidden="true">
                  {varVote === "oui"
                    ? "🎉"
                    : varVote === "timeout"
                      ? "⏱️"
                      : "😤"}
                </p>
                <p className="text-xl font-black text-white">
                  {varVote === "oui"
                    ? t("step2WinTitle")
                    : varVote === "timeout"
                      ? t("step2TimeUpTitle")
                      : t("step2LoseTitle")}
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {varVote === "oui"
                    ? t("step2WinBody")
                    : varVote === "timeout"
                      ? t("step2TimeUpBody")
                      : t("step2LoseBody")}
                </p>
              </div>

              {/* Rules */}
              <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                {t("step2RulesTitle")}
              </h3>
              <ul className="mb-5 space-y-2">
                {[t("step2Rule1"), t("step2Rule2"), t("step2Rule3")].map(
                  (rule, i) => (
                    <li key={`step-`} className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-whistle/20 text-xs font-black text-whistle">
                        {i + 1}
                      </span>
                      <p className="text-sm leading-snug text-zinc-300">
                        {rule}
                      </p>
                    </li>
                  ),
                )}
              </ul>

              <button
                type="button"
                onClick={() => saveStep(3)}
                className="h-14 w-full rounded-2xl bg-whistle font-black uppercase tracking-wide text-zinc-950 shadow-[0_0_20px_rgba(250,204,21,0.3)] transition hover:bg-whistle/90 active:scale-[0.98]"
              >
                {t("step2Next")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 3 — Premier prono guidé ───────────────────────────────── */}
      {step === 3 && (
        <div className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-8">
          <button
            type="button"
            onClick={() => setShowSkipConfirm(true)}
            aria-label={t("skip")}
            className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white/10 hover:text-zinc-300"
          >
            <X className="size-4" />
          </button>

          <ProgressDots current={3} onBack={goBack} />

          <h2 className="mb-1 text-center text-xl font-semibold text-white">
            {t("step3Title")}
          </h2>
          <p className="mb-5 text-center text-sm text-zinc-400">
            {t("step3Subtitle")}
          </p>

          {!pronoSubmitted ? (
            <>
              {/* Fictive match */}
              <div className="mb-4 rounded-2xl bg-zinc-800/60 p-4 text-center">
                <p className="mb-1 text-[11px] text-zinc-500">
                  {t("step3FakeDate")}
                </p>
                <p className="text-base font-black text-white">
                  {t("step3FakeMatch")}
                </p>
              </div>

              {/* Hint arrow */}
              <p className="mb-2 text-center text-xs font-black uppercase tracking-widest text-whistle">
                ↓ {t("step3Hint")}
              </p>

              {/* Score inputs */}
              <div className="flex items-center gap-3">
                <div className="flex-1 text-center">
                  <label className="mb-1 block text-xs font-black text-zinc-500">
                    PSG
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={20}
                    value={homeScore}
                    onChange={(e) => setHomeScore(e.target.value)}
                    placeholder="0"
                    aria-label={t("step3HomeLabel")}
                    className="w-full rounded-2xl border-2 border-whistle bg-whistle/10 py-3 text-center text-2xl font-black text-white placeholder-zinc-600 focus:outline-none"
                  />
                </div>
                <span
                  className="text-xl font-black text-zinc-500"
                  aria-hidden="true"
                >
                  :
                </span>
                <div className="flex-1 text-center">
                  <label className="mb-1 block text-xs font-black text-zinc-500">
                    Real
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={20}
                    value={awayScore}
                    onChange={(e) => setAwayScore(e.target.value)}
                    placeholder="0"
                    aria-label={t("step3AwayLabel")}
                    className="w-full rounded-2xl border-2 border-whistle bg-whistle/10 py-3 text-center text-2xl font-black text-white placeholder-zinc-600 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (homeScore !== "" && awayScore !== "") {
                    setPronoSubmitted(true);
                  }
                }}
                disabled={homeScore === "" || awayScore === ""}
                className="mt-5 h-14 w-full rounded-2xl bg-whistle font-black uppercase tracking-wide text-zinc-950 shadow-[0_0_20px_rgba(250,204,21,0.3)] transition hover:bg-whistle/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t("step3Cta")}
              </button>
            </>
          ) : (
            <div className="text-center">
              <CheckCircle2
                className="mx-auto mb-4 size-16 text-green-400"
                aria-hidden="true"
              />
              <h3 className="text-2xl font-semibold text-white">
                {t("step3SuccessTitle")}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                {t("step3SuccessBody")}
              </p>
              <div className="mt-4 inline-block rounded-2xl bg-zinc-800/60 px-6 py-3">
                <p
                  className="text-2xl font-black text-white"
                  aria-label={`${homeScore} à ${awayScore}`}
                >
                  {homeScore} · {awayScore}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  PSG vs Real Madrid
                </p>
              </div>
              <button
                type="button"
                onClick={() => saveStep(4)}
                className="mt-6 h-14 w-full rounded-2xl bg-whistle font-black uppercase tracking-wide text-zinc-950 shadow-[0_0_20px_rgba(250,204,21,0.3)] transition hover:bg-whistle/90 active:scale-[0.98]"
              >
                {t("step3Next")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Step 4 — Notifications ──────────────────────────────────────── */}
      {step === 4 && (
        <div className="relative z-10 w-full max-w-sm rounded-t-3xl sm:rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl animate-in fade-in slide-in-from-bottom-8">
          <div className="flex flex-col items-center p-8 text-center">
            <ProgressDots current={4} onBack={goBack} />

            <div className="relative mb-5 flex size-20 items-center justify-center rounded-full border-4 border-whistle/20 bg-whistle/10 text-whistle">
              <Siren className="size-10" aria-hidden="true" />
              <div
                aria-hidden="true"
                className="absolute -right-1 -top-1 flex size-6 animate-bounce items-center justify-center rounded-full bg-red-500"
              >
                <span className="text-[10px] font-black text-white">1</span>
              </div>
            </div>

            <h2 className="text-2xl font-semibold uppercase tracking-tight text-white">
              {t("step5Title")}
            </h2>
            <p className="mx-auto mt-3 max-w-[280px] text-sm leading-relaxed text-zinc-400">
              {t("step5Body")}
            </p>
          </div>

          <div className="flex flex-col gap-3 px-6 pb-8">
            <button
              type="button"
              onClick={async () => {
                await trySubscribePush();
                close();
              }}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-white font-black uppercase tracking-wide text-zinc-950 shadow-lg transition hover:bg-zinc-100 active:scale-[0.98]"
            >
              <BellRing className="size-5" aria-hidden="true" />
              {t("step5Allow")}
            </button>
            <button
              type="button"
              onClick={close}
              className="h-12 w-full rounded-2xl font-bold text-zinc-500 transition hover:bg-white/5 active:scale-[0.98]"
            >
              {t("step5Later")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
