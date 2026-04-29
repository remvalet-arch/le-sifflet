"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/lobby", emoji: "🏟️", label: "Stade" },
  { href: "/leaderboard", emoji: "🏆", label: "Classement" },
  { href: "/profile", emoji: "👤", label: "Profil" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 z-50 w-full border-t border-white/8 bg-zinc-950/95 backdrop-blur-xl"
    >
      <div
        className="flex"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
      >
        {TABS.map(({ href, emoji, label }) => {
          const isActive =
            pathname === href ||
            (href !== "/lobby" && pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors active:scale-95 ${
                isActive ? "text-green-500" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <span className="text-2xl leading-none">{emoji}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
