"use client";

import { useEffect, useState } from "react";
import {
  getConsentStatus,
  grantConsent,
  denyConsent,
  restoreConsent,
} from "@/lib/analytics-consent";

export function ConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    restoreConsent();
    setTimeout(() => setShow(getConsentStatus() === "pending"), 0);
  }, []);

  if (!show) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentement analytics"
      className="fixed bottom-0 left-0 right-0 z-[100] mx-auto max-w-md border-t border-white/10 bg-zinc-900 px-4 pb-safe pt-4"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 0px), 1rem)" }}
    >
      <p className="mb-3 text-xs text-zinc-400">
        On utilise PostHog pour comprendre comment l&apos;app est utilisée.
        Aucune donnée perso ni vente à des tiers. Tu peux refuser sans rien
        perdre.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => {
            grantConsent();
            setShow(false);
          }}
          className="flex-1 rounded-xl bg-green-600 py-2 text-sm font-black text-white transition hover:bg-green-500"
        >
          OK pour moi
        </button>
        <button
          onClick={() => {
            denyConsent();
            setShow(false);
          }}
          className="flex-1 rounded-xl border border-white/10 py-2 text-sm font-bold text-zinc-400 transition hover:text-white"
        >
          Non merci
        </button>
      </div>
    </div>
  );
}
