"use client";

import { useEffect } from "react";
import { track, type NotifType, type SmartMuteReason } from "@/lib/analytics";

// Listens for postMessages from the service worker when a push notification
// is suppressed by Smart Mute (app visible). Tracks the suppression event.
export function useSmartMuteTracker() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.serviceWorker) return;

    const handler = (event: MessageEvent) => {
      if (event.data?.type !== "NOTIF_SUPPRESSED_BY_SMART_MUTE") return;
      track("notif_suppressed_by_smart_mute", {
        notif_type: (event.data.notif_type as NotifType) ?? "var_alert",
        reason: (event.data.reason as SmartMuteReason) ?? "app_visible",
        match_id: (event.data.match_id as string | undefined) ?? undefined,
      });
    };

    navigator.serviceWorker.addEventListener("message", handler);
    return () =>
      navigator.serviceWorker.removeEventListener("message", handler);
  }, []);
}
