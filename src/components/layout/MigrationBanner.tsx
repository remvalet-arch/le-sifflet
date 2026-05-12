"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

const STORAGE_KEY = "vartime:migration-banner-dismissed";
const SHOW_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function MigrationBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Never show in PWA standalone mode — user already installed the app
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in navigator &&
        (navigator as { standalone?: boolean }).standalone === true);
    if (isStandalone) return;

    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      const id = setTimeout(() => setVisible(true), 0);
      return () => clearTimeout(id);
    }
    // Re-show if dismissed more than 7 days ago (stale flag cleanup)
    const dismissedAt = parseInt(dismissed, 10);
    if (Date.now() - dismissedAt > SHOW_DURATION_MS) {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const t = useTranslations("Banner");

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    setVisible(false);
  }

  return (
    <div className="relative z-50 w-full bg-whistle/15 border-b border-whistle/30 px-4 py-2.5">
      <div className="mx-auto flex max-w-2xl items-start gap-3">
        <p className="flex-1 text-xs leading-snug text-whistle/90">
          <span className="font-black">{t("migrationBold")}</span>{" "}
          {t("migrationText")}{" "}
          <span className="font-bold">{t("migrationDomain")}</span>.
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("migrationClose")}
          className="mt-0.5 shrink-0 text-whistle/60 hover:text-whistle transition"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
