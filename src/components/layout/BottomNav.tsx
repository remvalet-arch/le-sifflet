"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Landmark, Trophy, User } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();
  const [superVisible, setSuperVisible] = useState(false);

  useEffect(() => {
    const onAvailable = (e: Event) => {
      setSuperVisible((e as CustomEvent<{ enabled: boolean }>).detail.enabled);
    };
    window.addEventListener("sifflet:drawer-available", onAvailable);
    return () => window.removeEventListener("sifflet:drawer-available", onAvailable);
  }, []);

  const isMatchPage = /^\/match\//.test(pathname);
  const showSuperButton = isMatchPage && superVisible;

  return (
    <nav className="fixed bottom-0 z-50 w-full overflow-visible border-t border-white/8 bg-zinc-950/90 backdrop-blur-md">
      <div
        className="relative flex items-end"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
      >
        <TabLink href="/lobby" Icon={Landmark} label="Stade" pathname={pathname} />

        {/* Slot central context-aware :
            → Super-Bouton en LiveRoom (match En Direct)
            → Classement sur toutes les autres pages */}
        {showSuperButton ? (
          <div className="relative flex flex-1 justify-center">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("sifflet:open-drawer"))}
              aria-label="Ouvrir le tiroir d'action"
              className="absolute -top-6 left-1/2 -translate-x-1/2 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 shadow-lg shadow-green-500/40 transition hover:bg-green-400 active:scale-95"
            >
              <svg width={22} height={22} viewBox="0 0 24 24" fill="white" aria-hidden>
                <circle cx="8" cy="12" r="8" />
                <rect x="14" y="8" width="10" height="8" rx="4" />
              </svg>
            </button>
            <span className="py-2.5 text-[10px] opacity-0 select-none" aria-hidden>·</span>
          </div>
        ) : (
          <TabLink href="/leaderboard" Icon={Trophy} label="Kop" pathname={pathname} />
        )}

        <TabLink href="/profile" Icon={User} label="Profil" pathname={pathname} />
      </div>
    </nav>
  );
}

function TabLink({
  href,
  Icon,
  label,
  pathname,
}: {
  href: string;
  Icon: React.ElementType;
  label: string;
  pathname: string;
}) {
  const isActive = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors active:scale-95 ${
        isActive ? "text-green-500" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
