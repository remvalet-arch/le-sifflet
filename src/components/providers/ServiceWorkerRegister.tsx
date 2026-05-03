"use client";

import { useEffect } from "react";

/**
 * Enregistre `/sw.js` pour critères PWA (installable) + mises à jour shell.
 * Échoue silencieusement si non supporté ou hors HTTPS (sauf localhost).
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const { protocol, hostname } = window.location;
    const secure = protocol === "https:" || hostname === "localhost" || hostname === "127.0.0.1";
    if (!secure) return;

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((err) => {
        console.warn("[SW] enregistrement impossible:", err);
      });
  }, []);

  return null;
}
