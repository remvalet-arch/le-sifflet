"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";

const MONTH_NAMES_FR = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

function getStorageKey(year: number, month: number) {
  return `new_season_shown_${year}_${String(month).padStart(2, "0")}`;
}

export function NewSeasonOverlay() {
  const t = useTranslations("NewSeason");
  const locale = useLocale();
  const [visible, setVisible] = useState(false);
  const [monthName, setMonthName] = useState("");

  useEffect(() => {
    const now = new Date();
    if (now.getDate() !== 1) return;
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-indexed
    const key = getStorageKey(year, month);
    if (localStorage.getItem(key)) return;

    // Resolve month name
    let name: string;
    try {
      name = now.toLocaleString(locale === "en" ? "en-GB" : locale, {
        month: "long",
      });
    } catch {
      name = MONTH_NAMES_FR[month] ?? "";
    }
    setTimeout(() => {
      setMonthName(name);
      setVisible(true);
    }, 0);
  }, [locale]);

  function dismiss() {
    const now = new Date();
    const key = getStorageKey(now.getFullYear(), now.getMonth());
    localStorage.setItem(key, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 backdrop-blur-sm px-5">
      <div className="w-full max-w-sm rounded-3xl border border-amber-500/25 bg-zinc-900 p-7 text-center shadow-[0_0_60px_rgba(251,191,36,0.2)]">
        <div className="mb-4 text-5xl">🏆</div>
        <h2 className="text-lg font-black uppercase tracking-wide text-white">
          {t("title", { month: monthName })}
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          {t("body", { month: monthName })}
        </p>
        <div className="mt-5 rounded-2xl border border-white/8 bg-zinc-800 px-4 py-3 text-left text-sm text-zinc-400">
          <p>🪙 {t("siffletsReset")}</p>
          <p className="mt-1">📊 {t("pointsReset")}</p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="mt-6 w-full rounded-2xl bg-amber-500 py-3.5 font-black uppercase tracking-wide text-zinc-950 transition hover:bg-amber-400 active:scale-[0.97]"
        >
          {t("cta")}
        </button>
      </div>
    </div>
  );
}
