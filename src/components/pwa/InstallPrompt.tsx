"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // default to true so it doesn't flash

  useEffect(() => {
    // Check if running on iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);

    // Check if already installed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = window.navigator as any;
    const isInstalled =
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true;

    // Wait a tick before setting state to avoid "Calling setState synchronously within an effect" warning
    // even though it's the mount effect, the linter is strict.
    setTimeout(() => {
      setIsIOS(isIosDevice);
      setIsStandalone(isInstalled);
    }, 0);

    // Listen for beforeinstallprompt (Android/Chrome)
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

    const timer = setTimeout(() => {
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
  }, [isStandalone, deferredPrompt, isIOS]);

  return null;
}
