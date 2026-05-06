"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Landmark, User, Users, Target, MonitorPlay } from "lucide-react";

import { useTranslations } from "next-intl";

export function BottomNav() {
  const pathname = usePathname();
  const [superVisible, setSuperVisible] = useState(false);
  const t = useTranslations("Navigation");

  useEffect(() => {
    const onAvailable = (e: Event) => {
      setSuperVisible((e as CustomEvent<{ enabled: boolean }>).detail.enabled);
    };
    window.addEventListener("sifflet:drawer-available", onAvailable);
    return () =>
      window.removeEventListener("sifflet:drawer-available", onAvailable);
  }, []);

  const isMatchPage = /^\/match\//.test(pathname);
  const fabActive = isMatchPage && superVisible;

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
              onClick={() =>
                fabActive &&
                window.dispatchEvent(new CustomEvent("sifflet:open-drawer"))
              }
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
      className={`flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest transition-colors active:scale-95 ${
        isActive ? "text-green-500" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      <Icon className="h-5 w-5" />
      <span>{label}</span>
    </Link>
  );
}
