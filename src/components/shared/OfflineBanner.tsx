"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

export function OfflineBanner() {
  const t = useTranslations("Common");
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      setIsOffline(!navigator.onLine);
    }, 0);

    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-center justify-center gap-2 bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-300"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
      {t("offlineMessage")}
    </div>
  );
}
