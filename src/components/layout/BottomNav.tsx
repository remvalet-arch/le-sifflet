"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Landmark, User, Users, Target, MonitorPlay } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLiveRoom } from "@/contexts/LiveRoomContext";

function useLikelyLiveHour(): boolean {
  const h = new Date().getHours();
  const day = new Date().getDay(); // 0=dim, 6=sam
  const isWeekend = day === 0 || day === 6;
  return isWeekend ? h >= 13 && h < 23 : h >= 18 && h < 23;
}

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("Navigation");
  const { drawerAvailable, openDrawer } = useLiveRoom();
  const likelyLive = useLikelyLiveHour();
  const isOnLobby = pathname === "/lobby" || pathname.startsWith("/lobby/");

  const isMatchPage = /^\/match\//.test(pathname);
  const fabActive = isMatchPage && drawerAvailable;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md border-t border-white/8 bg-zinc-950/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div
        className={`relative grid h-16 ${isMatchPage ? "grid-cols-5" : "grid-cols-4"}`}
      >
        <TabLink
          href="/lobby"
          Icon={Landmark}
          label={t("stade")}
          pathname={pathname}
          liveIndicator={likelyLive && !isOnLobby}
        />
        <TabLink
          href="/pronos"
          Icon={Target}
          label={t("pronos")}
          pathname={pathname}
        />

        {/* Col 3 — Bouton VAR au centre avec débordement en -mt-5, uniquement sur la page match */}
        {isMatchPage && (
          <div className="flex items-start justify-center -mt-5">
            <button
              type="button"
              disabled={!fabActive}
              onClick={() => fabActive && openDrawer()}
              aria-label="Appeler la VAR"
              className={`flex h-14 w-14 items-center justify-center rounded-full border-4 border-zinc-950 shadow-lg transition active:scale-95 ${
                fabActive
                  ? "bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)] hover:bg-green-400"
                  : "cursor-default bg-zinc-700 opacity-50"
              }`}
            >
              <MonitorPlay
                className={`ml-0.5 h-6 w-6 ${fabActive ? "text-zinc-950" : "text-zinc-400"}`}
                aria-hidden="true"
              />
            </button>
          </div>
        )}

        <TabLink
          href="/ligues"
          Icon={Users}
          label={t("ligues")}
          pathname={pathname}
        />
        <TabLink
          href="/profile"
          Icon={User}
          label={t("profil")}
          pathname={pathname}
        />
      </div>
    </nav>
  );
}

function TabLink({
  href,
  Icon,
  label,
  pathname,
  liveIndicator = false,
}: {
  href: string;
  Icon: React.ElementType;
  label: string;
  pathname: string;
  liveIndicator?: boolean;
}) {
  const isActive = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`relative flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest transition-colors active:scale-95 ${
        isActive ? "text-green-500" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      <span className="relative inline-flex">
        <Icon className="h-5 w-5" />
        {liveIndicator && (
          <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
          </span>
        )}
      </span>
      <span>{label}</span>
    </Link>
  );
}
