"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Target,
  Shuffle,
  Users,
  Copy,
  Check,
  X,
} from "lucide-react";
import { ShareButton } from "@/components/ui/ShareButton";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics";

type Mode = "classic" | "braquage";

export function CreateLeagueWizard({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (id: string, name: string) => void;
}) {
  const t = useTranslations("Ligues");
  const tCommon = useTranslations("Common");
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [logo, setLogo] = useState("🏆");
  const [mode, setMode] = useState<Mode>("classic");
  const [submitting, setSubmitting] = useState(false);
  const [createdSquad, setCreatedSquad] = useState<{
    id: string;
    name: string;
    invite_code: string;
  } | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const supabase = createClient();

  function handleCloseAttempt() {
    if (step <= 1 || step === 4) {
      onClose();
    } else {
      setConfirmClose(true);
    }
  }

  const LOGOS = [
    "🏆",
    "⚽",
    "🔥",
    "👑",
    "🍺",
    "🍕",
    "🤡",
    "💰",
    "⚡",
    "🦁",
    "🐉",
    "💀",
    "🎯",
    "🌟",
    "🦅",
    "🐺",
    "🎭",
    "🧨",
    "🦊",
    "🧠",
  ];

  async function handleCreate() {
    if (!name.trim() || submitting) return;
    setSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Non authentifié");

      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const invite_code = Array.from(
        { length: 6 },
        () => chars[Math.floor(Math.random() * chars.length)],
      ).join("");

      const { data: squad, error: squadErr } = await supabase
        .from("squads")
        .insert({
          name: name.trim(),
          is_private: true,
          invite_code,
          owner_id: user.id,
          game_mode: mode,
        })
        .select()
        .single();

      if (squadErr || !squad)
        throw new Error(squadErr?.message || "Erreur de création");

      const { error: memberErr } = await supabase
        .from("squad_members")
        .insert({ squad_id: squad.id, user_id: user.id });

      if (memberErr) throw new Error(memberErr.message);

      toast.success(t("wizardCreateSuccess"));
      track("squad_created", {
        squad_id: squad.id,
        game_mode: mode,
        is_private: true,
      });
      setCreatedSquad({ id: squad.id, name: squad.name, invite_code });
      setStep(4);
    } catch (e: unknown) {
      if (e instanceof Error) {
        toast.error(e.message || t("wizardCreateError"));
      } else {
        toast.error(t("wizardCreateError"));
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-950 sm:items-center sm:justify-center sm:bg-black/80 sm:backdrop-blur-sm">
      <div className="relative flex h-full w-full flex-col sm:h-auto sm:max-w-md sm:rounded-3xl sm:border sm:border-white/10 sm:bg-zinc-950 sm:shadow-2xl overflow-hidden animate-in slide-in-from-bottom-8">
        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-zinc-800">
          <div
            className="h-full bg-whistle transition-all duration-300"
            style={{ width: step >= 4 ? "100%" : `${(step / 3) * 100}%` }}
          />
        </div>

        {/* Header — safe-area-inset-top pour notch/Dynamic Island */}
        <div
          className="flex items-center p-4"
          style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 1rem)" }}
        >
          {step < 4 ? (
            <button
              onClick={step === 1 ? onClose : () => setStep(step - 1)}
              className="p-2 text-zinc-400 hover:text-white transition"
            >
              <ArrowLeft className="h-6 w-6" />
            </button>
          ) : (
            <div className="w-10" />
          )}
          <span className="flex-1 text-center font-black uppercase tracking-widest text-zinc-500 text-[10px]">
            {step < 4 ? t("wizardStep", { step }) : "🎉"}
          </span>
          <button
            onClick={handleCloseAttempt}
            className="p-2 text-zinc-400 hover:text-white transition"
            aria-label={tCommon("close")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Confirmation abandon */}
        {confirmClose && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="mx-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-zinc-900 p-6 text-center">
              <p className="text-lg font-black text-white">
                {t("wizardAbandonTitle")}
              </p>
              <p className="text-sm text-zinc-400">{t("wizardAbandonDesc")}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmClose(false)}
                  className="flex-1 rounded-2xl border border-white/10 bg-zinc-800 py-3 text-sm font-bold text-zinc-300 transition hover:bg-zinc-700 active:scale-95"
                >
                  {t("wizardAbandonContinue")}
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 rounded-2xl bg-red-500/20 py-3 text-sm font-bold text-red-400 transition hover:bg-red-500/30 active:scale-95"
                >
                  {t("wizardAbandonConfirm")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 flex flex-col p-6 sm:px-8 sm:pb-8 justify-between">
          {step === 1 && (
            <div className="flex flex-col items-center flex-1 justify-center space-y-8 animate-in fade-in">
              <h2 className="text-3xl font-black text-white text-center">
                {t("wizardStep1Title")}
              </h2>
              <input
                type="text"
                aria-label={t("wizardStep1Title")}
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) =>
                  e.key === "Enter" && name.trim() && setStep(2)
                }
                placeholder={t("wizardStep1Placeholder")}
                maxLength={30}
                className="w-full text-center text-3xl font-black bg-transparent border-b-2 border-zinc-700 py-2 focus:outline-none focus:border-whistle text-whistle placeholder-zinc-700 transition"
              />
              <button
                onClick={() => setStep(2)}
                disabled={!name.trim()}
                className="w-full h-14 rounded-2xl bg-whistle font-black uppercase tracking-wide text-zinc-950 disabled:opacity-40 transition active:scale-95"
              >
                {tCommon("next")}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col flex-1 space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="text-center">
                <h2 className="text-2xl font-black text-white">
                  {t("wizardStep2Title")}
                </h2>
                <p className="text-sm text-zinc-400 mt-2">
                  {t("wizardStep2Subtitle")}
                </p>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center">
                <div className="h-24 w-24 rounded-full bg-zinc-800 border-2 border-whistle flex items-center justify-center text-5xl shadow-[0_0_30px_rgba(250,204,21,0.2)] mb-8 transition-transform">
                  {logo}
                </div>

                <div className="grid grid-cols-5 gap-2 w-full">
                  {LOGOS.map((l) => (
                    <button
                      key={l}
                      onClick={() => setLogo(l)}
                      className={`aspect-square rounded-2xl flex items-center justify-center text-3xl transition active:scale-95 ${logo === l ? "bg-whistle/20 border-2 border-whistle" : "bg-zinc-800/50 border border-white/5 hover:bg-zinc-800"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep(3)}
                className="w-full h-14 rounded-2xl bg-whistle font-black uppercase tracking-wide text-zinc-950 transition active:scale-95 mt-auto"
              >
                {tCommon("continue")}
              </button>
            </div>
          )}

          {step === 4 && createdSquad && (
            <div className="flex flex-col flex-1 items-center space-y-6 animate-in fade-in">
              <div className="flex flex-col items-center text-center gap-3">
                <div className="text-6xl">{logo}</div>
                <h2 className="text-2xl font-black text-white">
                  {t("wizardCelebTitle")}
                </h2>
                <p className="text-sm text-zinc-400">
                  {t("wizardCelebSubtitle", { name: createdSquad.name })}
                </p>
                <span className="rounded-full border border-white/10 bg-zinc-800 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  {mode === "classic"
                    ? t("wizardModeClassicName")
                    : t("wizardMode1vs1Name")}
                </span>
              </div>

              <div className="w-full rounded-2xl border border-whistle/30 bg-whistle/5 p-5 text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-whistle/70 mb-3">
                  {t("wizardCelebInviteHint")}
                </p>
                <p className="font-mono text-4xl font-black tracking-[0.3em] text-whistle">
                  {createdSquad.invite_code}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(createdSquad.invite_code);
                  setCopiedInvite(true);
                  setTimeout(() => setCopiedInvite(false), 2000);
                }}
                className="flex w-full items-center justify-center gap-2 h-12 rounded-2xl border border-white/10 bg-zinc-800 font-bold text-zinc-300 text-sm transition hover:bg-zinc-700 active:scale-95"
              >
                {copiedInvite ? (
                  <>
                    <Check className="h-4 w-4 text-green-400" />
                    {t("wizardCelebCopied")}
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    {t("wizardCelebCopyBtn")}
                  </>
                )}
              </button>

              <ShareButton
                title={t("shareJoinTitle", { name: createdSquad.name })}
                text={t("shareTextBody", {
                  from: t("shareTextFrom"),
                  name: createdSquad.name,
                })}
                url={`https://vartime.app/join/${createdSquad.invite_code}`}
                label={t("inviteButton")}
                labelCopy={t("shareViaCopy")}
                labelCopied={t("shareCopied")}
                labelWhatsApp={t("shareViaWhatsApp")}
                labelSms={t("shareViaSms")}
                className="w-full [&>button]:w-full [&>button]:justify-center [&>button]:h-12 [&>button]:rounded-2xl [&>button]:text-sm"
              />

              <button
                type="button"
                onClick={() => onCreated(createdSquad.id, createdSquad.name)}
                className="w-full h-14 rounded-2xl bg-whistle font-black uppercase tracking-wide text-zinc-950 transition active:scale-95"
              >
                {t("wizardGoToLeague")} →
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col flex-1 space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="text-center">
                <h2 className="text-2xl font-black text-white">
                  {t("wizardStep3Title")}
                </h2>
              </div>

              <div className="flex-1 flex flex-col gap-4 justify-center">
                <button
                  onClick={() => setMode("classic")}
                  className={`flex items-start gap-4 p-5 rounded-3xl border-2 text-left transition active:scale-95 ${mode === "classic" ? "border-whistle bg-whistle/10 shadow-[0_0_30px_rgba(250,204,21,0.1)]" : "border-zinc-800 bg-zinc-900"}`}
                >
                  <div
                    className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${mode === "classic" ? "bg-whistle text-zinc-950" : "bg-zinc-800 text-zinc-500"}`}
                  >
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <h3
                      className={`font-black text-lg ${mode === "classic" ? "text-whistle" : "text-white"}`}
                    >
                      {t("wizardModeClassicName")}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1">
                      {t("wizardModeClassicDesc")}
                    </p>
                  </div>
                </button>

                <button
                  onClick={() => setMode("braquage")}
                  className={`flex items-start gap-4 p-5 rounded-3xl border-2 text-left transition active:scale-95 ${mode === "braquage" ? "border-purple-500 bg-purple-500/10 shadow-[0_0_30px_rgba(168,85,247,0.1)]" : "border-zinc-800 bg-zinc-900"}`}
                >
                  <div
                    className={`mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${mode === "braquage" ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-500"}`}
                  >
                    <Shuffle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3
                      className={`font-black text-lg ${mode === "braquage" ? "text-purple-400" : "text-white"}`}
                    >
                      {t("wizardMode1vs1Name")}
                    </h3>
                    <p className="text-sm text-zinc-400 mt-1">
                      {t("wizardMode1vs1Desc")}
                    </p>
                  </div>
                </button>
              </div>

              <button
                onClick={handleCreate}
                disabled={submitting}
                className="w-full h-14 rounded-2xl bg-white font-black uppercase tracking-wide text-black transition active:scale-95 disabled:opacity-50 mt-auto flex items-center justify-center gap-2"
              >
                {submitting ? (
                  t("wizardCreatingText")
                ) : (
                  <>
                    {t("wizardCreateButton")} <Users className="w-5 h-5 ml-1" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
