"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import type { MarketEventType } from "@/types/database";

const BCP47: Record<string, string> = {
  fr: "fr-FR",
  en: "en-GB",
  es: "es-ES",
  de: "de-DE",
  it: "it-IT",
};

const EVENT_LABEL: Record<MarketEventType, string> = {
  penalty_check: "PENALTY",
  penalty_outcome: "PÉNALTY TIRÉ",
  var_goal: "VAR BUT",
  red_card: "CARTON ROUGE",
  free_kick: "COUP FRANC",
  corner: "CORNER",
  stoppage_ht: "ARRÊTS MT",
  stoppage_ft: "ARRÊTS FT",
};

type Predictor = {
  rank: number;
  user_id: string;
  username: string;
  avatar_url: string | null;
  reward: number;
};

type Props = {
  eventType: MarketEventType;
  eventId: string;
  won: boolean;
  reward: number;
  username?: string;
  matchLabel?: string;
  onClose: () => void;
};

const RANK_MEDAL = ["🥇", "🥈", "🥉", "4.", "5."];

const PARTICLES = ["🔥", "⚡", "💥", "✨", "🎯"] as const;

export function VerdictOverlay({
  eventType,
  eventId,
  won,
  reward,
  username,
  matchLabel,
  onClose,
}: Props) {
  const t = useTranslations("Verdict");
  const locale = useLocale();
  const bcp47 = BCP47[locale] ?? "fr-FR";
  const [phase, setPhase] = useState<"suspense" | "result">("suspense");
  const [predictors, setPredictors] = useState<Predictor[]>([]);

  // Phase suspense → result after 1.5s
  useEffect(() => {
    const id = setTimeout(() => setPhase("result"), 1500);
    return () => clearTimeout(id);
  }, []);

  // Auto-close result after 7s
  useEffect(() => {
    if (phase !== "result") return;
    const id = setTimeout(onClose, 7000);
    return () => clearTimeout(id);
  }, [phase, onClose]);

  // Fetch top predictors once in result phase
  useEffect(() => {
    if (phase !== "result") return;
    void fetch(`/api/market-events/${eventId}/top-predictors`)
      .then((r) => r.json())
      .then((d: { ok?: boolean; data?: { predictors: Predictor[] } }) => {
        if (d.ok && d.data?.predictors?.length) {
          setPredictors(d.data.predictors);
        }
      })
      .catch(() => {
        /* silent */
      });
  }, [phase, eventId]);

  const isFireworks = won && reward >= 200;
  const eventLabel = EVENT_LABEL[eventType] ?? "VERDICT";

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 backdrop-blur-md"
      style={{
        paddingTop: "max(env(safe-area-inset-top, 0px), 1rem)",
        paddingBottom: "max(env(safe-area-inset-bottom, 0px), 2rem)",
      }}
      onClick={phase === "result" ? onClose : undefined}
    >
      {phase === "suspense" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="animate-float text-7xl">⏳</span>
          <p className="text-2xl font-black uppercase tracking-widest text-zinc-300">
            {t("suspense")}
          </p>
        </div>
      )}

      {phase === "result" && (
        <div className="relative flex w-full max-w-sm flex-col items-center gap-5 px-6 text-center">
          {/* Floating particles for big wins */}
          {isFireworks && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {PARTICLES.map((p, i) => (
                <span
                  key={`particle-${i}`}
                  className="absolute text-3xl"
                  style={{
                    left: `${15 + i * 18}%`,
                    bottom: "20%",
                    animationName: "float-up",
                    animationDuration: `${1.4 + i * 0.25}s`,
                    animationTimingFunction: "ease-out",
                    animationFillMode: "forwards",
                    animationDelay: `${i * 0.15}s`,
                  }}
                >
                  {p}
                </span>
              ))}
            </div>
          )}

          {/* Event label */}
          <div className="animate-verdict-pop">
            <p
              className={`text-4xl font-black uppercase tracking-tight ${
                won ? "text-green-400" : "text-red-400"
              }`}
              style={{
                animationName: "pulse-glow",
                animationDuration: "1.5s",
                animationIterationCount: "infinite",
              }}
            >
              {eventLabel} !
            </p>
          </div>

          {/* Win/Loss message */}
          {won ? (
            <div
              className="animate-verdict-pop flex flex-col items-center gap-1"
              style={{ animationDelay: "100ms" }}
            >
              <p className="text-xl font-black text-white">
                {t("won")} {isFireworks && <span>🔥</span>}
              </p>
              <p className="text-4xl font-black text-green-400">
                +{reward.toLocaleString(bcp47)} 🪙
              </p>
            </div>
          ) : (
            <div
              className="animate-verdict-pop flex flex-col items-center gap-1"
              style={{ animationDelay: "100ms" }}
            >
              <p className="text-xl font-black text-zinc-300">{t("lost")}</p>
              <p className="text-sm text-zinc-500">{t("nextTime")}</p>
            </div>
          )}

          {/* Top predictors */}
          {predictors.length > 0 && (
            <div
              className="animate-verdict-pop w-full rounded-2xl border border-white/10 bg-zinc-900/80 p-4"
              style={{ animationDelay: "300ms" }}
            >
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                🏆 {t("topPredictors")}
              </p>
              <div className="flex flex-col gap-1.5">
                {predictors.map((p) => (
                  <div
                    key={p.user_id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span>{RANK_MEDAL[p.rank - 1] ?? `${p.rank}.`}</span>
                      <span className="font-bold text-white">{p.username}</span>
                    </span>
                    <span className="font-black text-green-400">
                      +{p.reward.toLocaleString(bcp47)} 🪙
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Share button for big wins */}
          {won && reward >= 200 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const params = new URLSearchParams({
                  username: username ?? "Arbitre",
                  pts: String(reward),
                  match: matchLabel ?? "Match VAR TIME",
                  type: "var_win",
                });
                const ogUrl = `https://vartime.app/api/og/victory?${params}`;
                if (navigator.share) {
                  void navigator.share({
                    title: `J'ai gagné +${reward} 🪙 sur VAR TIME !`,
                    text: `${username ?? "Arbitre"} a gagné +${reward} 🪙 sur ${matchLabel ?? "VAR TIME"} 🔥`,
                    url: "https://vartime.app",
                  });
                } else {
                  void navigator.clipboard.writeText(ogUrl);
                }
              }}
              className="animate-verdict-pop flex items-center gap-2 rounded-2xl border border-green-500/30 bg-green-500/10 px-5 py-2.5 text-sm font-black text-green-400 transition hover:bg-green-500/20 active:scale-95"
              style={{ animationDelay: "400ms" }}
            >
              🔗 {t("shareVictory")}
            </button>
          )}

          <p className="text-xs text-zinc-600">{t("tapToClose")}</p>
        </div>
      )}
    </div>
  );
}
