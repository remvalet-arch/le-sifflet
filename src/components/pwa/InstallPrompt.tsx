"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

const LS_KEY = "pwa_install_last_shown";
// Mobile : re-propose après 7 jours. Desktop : 30 jours.
const SNOOZE_DAYS_MOBILE = 7;
const SNOOZE_DAYS_DESKTOP = 30;

function isSnoozed(isMobile: boolean): boolean {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return false;
    const daysSince = (Date.now() - Number(raw)) / 86_400_000;
    return daysSince < (isMobile ? SNOOZE_DAYS_MOBILE : SNOOZE_DAYS_DESKTOP);
  } catch {
    return false;
  }
}

function snooze(): void {
  try {
    localStorage.setItem(LS_KEY, String(Date.now()));
  } catch {
    // localStorage indisponible (mode privé strict) — on ignore
  }
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isMobileDevice =
      /android|iphone|ipad|ipod/.test(ua) ||
      window.matchMedia("(pointer: coarse)").matches;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = window.navigator as any;
    const isInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true;

    setTimeout(() => {
      setIsIOS(isIosDevice);
      setIsMobile(isMobileDevice);
      setIsStandalone(isInstalled);
    }, 0);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
  }, []);

  useEffect(() => {
    if (isStandalone) return;
    if (isSnoozed(isMobile)) return;

    const timer = setTimeout(() => {
      // Marque immédiatement pour ne pas re-montrer lors du prochain chargement
      snooze();

      toast(
        <div className="flex flex-col gap-2">
          <span className="font-bold">Installe VAR Time 📺</span>
          <span className="text-sm">
            Pour une meilleure expérience sans latence au stade, ajoute
            l&apos;app sur ton écran d&apos;accueil !
          </span>
          {deferredPrompt && (
            <button
              onClick={() => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (deferredPrompt as any).prompt();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (deferredPrompt as any).userChoice.then(() =>
                  setDeferredPrompt(null),
                );
              }}
              className="mt-2 w-full rounded-lg bg-green-500 py-2 text-sm font-black text-zinc-950 uppercase"
            >
              Installer l&apos;application
            </button>
          )}
          {isIOS && !deferredPrompt && (
            <span className="mt-1 text-xs text-zinc-400">
              Sur iOS : appuie sur <span className="font-bold">Partager</span>{" "}
              puis{" "}
              <span className="font-bold">Sur l&apos;écran d&apos;accueil</span>
            </span>
          )}
        </div>,
        {
          duration: 15000,
          position: "top-center",
          closeButton: true,
          icon: <Download className="h-5 w-5 text-green-500" />,
        },
      );
    }, 5000);

    return () => clearTimeout(timer);
  }, [isStandalone, isMobile, deferredPrompt, isIOS]);

  return null;
}
