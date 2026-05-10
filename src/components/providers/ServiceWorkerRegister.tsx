"use client";

import { useEffect } from "react";
import { log } from "@/lib/logger";

/**
 * Enregistre `/sw.js` pour critères PWA (installable) + mises à jour shell.
 * Échoue silencieusement si non supporté ou hors HTTPS (sauf localhost).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator))
      return;
    const { protocol, hostname } = window.location;
    const secure =
      protocol === "https:" ||
      hostname === "localhost" ||
      hostname === "127.0.0.1";
    if (!secure) return;

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err) => {
        log.warn("SW", "enregistrement impossible", { error: String(err) });
      });
  }, []);

  return null;
}
