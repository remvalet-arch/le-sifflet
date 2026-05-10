"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Common");

  useEffect(() => {
    console.error("[app-error-boundary]", error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <span className="text-5xl">🟥</span>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">
          {t("errorTitle")}
        </p>
        <h2 className="text-lg font-black text-white">{t("errorHeading")}</h2>
        <p className="mt-2 text-sm text-zinc-400">{t("errorDesc")}</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm font-black text-green-400 transition hover:bg-green-500/20"
        >
          {t("retry")}
        </button>
        <Link
          href="/lobby"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/10"
        >
          Lobby
        </Link>
      </div>
    </main>
  );
}
