"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useBcp47 } from "@/lib/use-bcp47";
import { track } from "@/lib/analytics";

type Props = {
  isEligible: boolean;
  nextRefillAt: string | null;
  currentBalance?: number;
};

function useCountdown(targetIso: string | null) {
  const [seconds, setSeconds] = useState(() => {
    if (!targetIso) return 0;
    return Math.max(
      0,
      Math.ceil((new Date(targetIso).getTime() - Date.now()) / 1000),
    );
  });

  useEffect(() => {
    if (!targetIso) return;
    const id = setInterval(() => {
      const s = Math.max(
        0,
        Math.ceil((new Date(targetIso).getTime() - Date.now()) / 1000),
      );
      setSeconds(s);
      if (s === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [targetIso]);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h${String(m).padStart(2, "0")}m${String(s).padStart(2, "0")}s`;
}

export function RefillButton({
  isEligible,
  nextRefillAt,
  currentBalance = 0,
}: Props) {
  const t = useTranslations("Refill");
  const bcp47 = useBcp47();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const countdown = useCountdown(isEligible ? null : nextRefillAt);

  async function handleRefill() {
    if (!isEligible || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/refill", { method: "POST" });
      const json = (await res.json()) as {
        ok: boolean;
        data?: { new_balance: number };
        error?: string;
      };
      if (!res.ok) {
        toast.error(json.error ?? t("errorToast"));
        return;
      }
      const newBalance = json.data?.new_balance ?? 0;
      track("refill_claimed", {
        sifflets_received: newBalance - currentBalance,
        balance_before: currentBalance,
      });
      toast.success(
        t("successToast", {
          balance: newBalance.toLocaleString(bcp47),
        }),
      );
      router.refresh();
    } catch {
      toast.error(t("connLostToast"));
    } finally {
      setLoading(false);
    }
  }

  if (isEligible) {
    return (
      <button
        onClick={handleRefill}
        disabled={loading}
        className="mt-4 flex w-full animate-pulse items-center justify-center gap-2 rounded-2xl bg-green-500 py-4 text-base font-black uppercase tracking-wide text-zinc-950 shadow-lg transition hover:animate-none hover:bg-green-400 active:scale-[0.98] disabled:opacity-60"
      >
        {loading ? t("loading") : t("claimButton")}
      </button>
    );
  }

  if (nextRefillAt) {
    return (
      <div className="mt-4 rounded-2xl border border-white/10 bg-zinc-900 px-5 py-4 text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          {t("nextBonusLabel")}
        </p>
        <p className="mt-1 text-2xl font-black tabular-nums text-white">
          {countdown}
        </p>
      </div>
    );
  }

  return null;
}
