"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Bell, ChevronRight, LogOut, Shield, Zap } from "lucide-react";
import Link from "next/link";
import { useTranslations, useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/actions/auth";

const BCP47: Record<string, string> = {
  fr: "fr-FR",
  en: "en-GB",
  es: "es-ES",
  de: "de-DE",
  it: "it-IT",
};

const STEP = 10;
const MIN = 10;
const MAX = 500;
const PRESETS = [10, 25, 50, 100, 200, 500];

export default function SettingsClient({
  userId,
  initialBetAmount,
  initialBalance,
  initialFreezesOwned,
}: {
  userId: string;
  initialBetAmount: number;
  initialBalance: number;
  initialFreezesOwned: number;
}) {
  const t = useTranslations("Settings");
  const locale = useLocale();
  const bcp47 = BCP47[locale] ?? "fr-FR";
  const [betAmount, setBetAmount] = useState(initialBetAmount);
  const [isPending, startTransition] = useTransition();
  const [freezesOwned, setFreezesOwned] = useState(initialFreezesOwned);
  const [balance, setBalance] = useState(initialBalance);
  const [buyingFreeze, setBuyingFreeze] = useState(false);

  async function handleBuyFreeze() {
    if (buyingFreeze || freezesOwned >= 3 || balance < 500) return;
    setBuyingFreeze(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("purchase_streak_freeze");
      if (error) {
        toast.error(error.message);
      } else if (data) {
        setFreezesOwned(data.freezes_owned);
        setBalance(data.remaining_balance);
        toast.success(t("streakFreezeBought", { count: data.freezes_owned }));
      }
    } catch {
      toast.error(t("connectionLost"));
    } finally {
      setBuyingFreeze(false);
    }
  }

  function handleSaveBetAmount(value: number) {
    startTransition(async () => {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ default_var_bet_amount: value })
        .eq("id", userId);
      if (error) {
        toast.error(t("saveBetError"));
      } else {
        toast.success(t("saveBetSuccess", { amount: value }));
        setBetAmount(value);
      }
    });
  }

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
      <h1 className="text-2xl font-black uppercase tracking-tight text-white">
        {t("title")}
      </h1>
      <p className="mt-1 text-sm text-zinc-400">{t("subtitle")}</p>

      {/* Section Pari rapide */}
      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <Zap className="h-3 w-3" />
          {t("quickBetTitle")}
        </h2>
        <div className="rounded-2xl border border-white/8 bg-zinc-900 p-5">
          <p className="text-sm leading-relaxed text-zinc-400">
            Quand tu reçois une notif VAR et que tu tapes{" "}
            <span className="font-bold text-white">OUI</span> ou{" "}
            <span className="font-bold text-white">NON</span> directement depuis
            la notification, ce montant est misé automatiquement &mdash; sans
            ouvrir l&apos;app.
          </p>

          {/* Current value display */}
          <div className="mt-5 text-center">
            <span className="text-4xl font-black text-white">{betAmount}</span>
            <span className="ml-2 text-lg text-zinc-400">🪙</span>
          </div>

          {/* Slider */}
          <div className="mt-4">
            <input
              type="range"
              min={MIN}
              max={MAX}
              step={STEP}
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              className="w-full accent-yellow-400"
              aria-label={t("quickBetAriaLabel")}
            />
            <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
              <span>{MIN} 🪙</span>
              <span>{MAX} 🪙</span>
            </div>
          </div>

          {/* Preset chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setBetAmount(p)}
                className={`rounded-xl px-3 py-1.5 text-xs font-black transition ${
                  betAmount === p
                    ? "bg-yellow-400 text-zinc-900"
                    : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                }`}
              >
                {p} 🪙
              </button>
            ))}
          </div>

          {/* Save button */}
          <button
            type="button"
            onClick={() => handleSaveBetAmount(betAmount)}
            disabled={isPending || betAmount === initialBetAmount}
            className="mt-5 w-full rounded-xl bg-yellow-400 py-3 text-sm font-black text-zinc-900 transition disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
          >
            {isPending ? t("saving") : t("save")}
          </button>
        </div>
      </section>

      {/* Section Streak Freeze */}
      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <Shield className="h-3 w-3" />
          {t("streakFreezeTitle")}
        </h2>
        <div className="rounded-2xl border border-white/8 bg-zinc-900 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-bold text-white">
                🛡️ {t("streakFreezeTitle")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                {t("streakFreezeDesc")}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                {t("streakFreezeBalance", {
                  balance: balance.toLocaleString(bcp47),
                })}
                {" · "}
                {t("streakFreezeStock", { count: freezesOwned })}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void handleBuyFreeze()}
            disabled={buyingFreeze || freezesOwned >= 3 || balance < 500}
            className="mt-4 w-full rounded-xl bg-sky-500/20 border border-sky-500/30 py-3 text-sm font-black text-sky-400 transition hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-40 active:scale-95"
          >
            {buyingFreeze
              ? t("streakFreezeBuying")
              : freezesOwned >= 3
                ? t("streakFreezeFullStock")
                : balance < 500
                  ? t("streakFreezeInsufficientBalance")
                  : t("streakFreezeBuy")}
          </button>
        </div>
      </section>

      {/* Section Notifications */}
      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <Bell className="h-3 w-3" />
          Notifications
        </h2>
        <Link
          href="/settings/notifications"
          className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-zinc-900 p-5 transition hover:bg-zinc-800/80 active:scale-[0.98]"
        >
          <div className="flex-1">
            <p className="text-sm font-bold text-white">
              Gérer les notifications
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-zinc-400">
              VAR, pronos, pré-match, bilan quotidien — configure chaque type.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
        </Link>
      </section>

      {/* Section Compte */}
      <section className="mt-6 mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
          <LogOut className="h-3 w-3" />
          Compte
        </h2>
        <form action={signOut}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/30 bg-transparent py-3 text-sm font-black text-red-400 transition hover:bg-red-500/10 active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </button>
        </form>
      </section>
    </main>
  );
}
