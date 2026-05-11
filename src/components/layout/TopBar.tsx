"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  BookOpen,
  Settings,
  LogOut,
  Trophy,
  ShoppingBag,
  MessageCircle,
  Bell,
  ArrowLeft,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { switchLocale } from "@/app/actions/locale";
import { createClient } from "@/lib/supabase/client";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import type { ProfileRow } from "@/types/database";
import type { Locale } from "@/lib/i18n/locale";
import { useLiveRoom } from "@/contexts/LiveRoomContext";

function getSectionLabels(t: ReturnType<typeof useTranslations<"TopBar">>) {
  return [
    { pattern: /^\/lobby/, label: t("sectionLobby") },
    { pattern: /^\/pronos/, label: t("sectionPronos") },
    { pattern: /^\/ligues/, label: t("sectionLigues") },
    { pattern: /^\/profile/, label: t("sectionProfil") },
    { pattern: /^\/match\//, label: t("sectionMatch") },
    { pattern: /^\/messages/, label: t("sectionMessages") },
    { pattern: /^\/leaderboard/, label: t("sectionClassement") },
    { pattern: /^\/shop/, label: t("sectionBoutique") },
  ];
}

const PRIMARY_PATHS = [/^\/lobby/, /^\/pronos/, /^\/ligues/, /^\/profile/];

function useSectionLabel(
  t: ReturnType<typeof useTranslations<"TopBar">>,
): string | null {
  const pathname = usePathname();
  // Primary nav pages and conversation pages use in-page titles — no topbar centre label
  if (
    PRIMARY_PATHS.some((p) => p.test(pathname)) ||
    /^\/messages\/.+/.test(pathname)
  )
    return null;
  return (
    getSectionLabels(t).find(({ pattern }) => pattern.test(pathname))?.label ??
    null
  );
}

function useBackRoute(
  t: ReturnType<typeof useTranslations<"TopBar">>,
): { href: string; label: string } | null {
  const pathname = usePathname();
  if (/^\/match\//.test(pathname))
    return { href: "/lobby", label: t("backStade") };
  if (/^\/messages\/.+/.test(pathname))
    return { href: "/messages", label: t("backMessages") };
  if (/^\/settings\//.test(pathname))
    return { href: "/settings", label: t("backSettings") };
  if (pathname === "/shop") return { href: "/lobby", label: t("backStade") };
  if (pathname === "/rules") return { href: "/lobby", label: t("backStade") };
  if (pathname === "/settings")
    return { href: "/lobby", label: t("backStade") };
  if (pathname === "/leaderboard")
    return { href: "/lobby", label: t("backStade") };
  if (/^\/ligues\/.+/.test(pathname))
    return { href: "/ligues", label: t("backLigues") };
  return null;
}

type Props = {
  username: string;
  userId: string;
  rank: string;
  xp: number;
  hasUnreadDm?: boolean;
  unreadNotifCount?: number;
};

export function TopBar({
  username,
  userId,
  rank,
  xp: initialXp,
  hasUnreadDm = false,
  unreadNotifCount = 0,
}: Props) {
  const [open, setOpen] = useState(false);
  const [liveRank, setLiveRank] = useState(rank);
  const [liveXp, setLiveXp] = useState(initialXp);
  const [localUnreadNotif, setLocalUnreadNotif] = useState(unreadNotifCount);
  const locale = useLocale() as Locale;
  const t = useTranslations("TopBar");
  const bcp47 =
    { fr: "fr-FR", en: "en-GB", es: "es-ES", de: "de-DE", it: "it-IT" }[
      locale
    ] ?? "fr-FR";
  const router = useRouter();
  const [, startTransition] = useTransition();
  const sectionLabel = useSectionLabel(t);
  const backRoute = useBackRoute(t);
  const { matchTitle } = useLiveRoom();
  const pathname = usePathname();
  const isMatchPage = /^\/match\//.test(pathname);
  const centreLabel = isMatchPage && matchTitle ? matchTitle : sectionLabel;

  // Sync badge count when navigating to/from /notifications
  useEffect(() => {
    if (pathname === "/notifications") {
      setTimeout(() => setLocalUnreadNotif(0), 0);
    }
  }, [pathname]);

  // Realtime : met à jour rang/XP dès qu'un pari est résolu
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`topbar-profile-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const updated = payload.new as ProfileRow;
          setLiveRank(updated.rank);
          if (typeof updated.xp === "number") setLiveXp(updated.xp);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  // Realtime : badge notifications — s'incrémente à chaque nouvelle notif
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`topbar-notifs-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          setTimeout(() => setLocalUnreadNotif((n) => n + 1), 0);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

  return (
    <>
      <header
        className="relative z-10 w-full shrink-0 border-b border-white/8 bg-zinc-950/95 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex h-14 items-center justify-between px-4">
          {/* Logo / Back button */}
          {backRoute ? (
            <button
              type="button"
              onClick={() => {
                if (window.history.length > 1) router.back();
                else router.push(backRoute.href);
              }}
              className="flex min-h-[44px] min-w-[44px] items-center gap-1.5 text-zinc-400 transition hover:text-white active:scale-95"
              aria-label={backRoute.label}
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span className="text-[11px] font-black uppercase tracking-wide">
                {backRoute.label}
              </span>
            </button>
          ) : (
            <Link href="/lobby" className="flex items-center">
              <span className="inline-flex items-center rounded border border-white/25 px-2 py-0.5 text-[11px] font-black tracking-widest text-white">
                VAR
                <span className="mx-1.5 text-white/30">⚡</span>
                TIME
              </span>
            </Link>
          )}

          {/* Section label / match title */}
          {centreLabel && (
            <span className="max-w-[140px] truncate text-center text-[11px] font-black uppercase tracking-widest text-zinc-400">
              {centreLabel}
            </span>
          )}

          <div className="flex items-center gap-2">
            {/* Notifications bell */}
            <Link
              href="/notifications"
              aria-label={t("ariaNotifications")}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 active:scale-95"
            >
              <Bell className="h-5 w-5" aria-hidden="true" />
              {localUnreadNotif > 0 && (
                <span
                  className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-whistle text-[9px] font-black text-zinc-950 ring-2 ring-zinc-950"
                  aria-hidden="true"
                >
                  {localUnreadNotif > 9 ? "9+" : localUnreadNotif}
                </span>
              )}
            </Link>

            {/* Messages privés */}
            <Link
              href="/messages"
              aria-label={t("ariaMessages")}
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 active:scale-95"
            >
              <MessageCircle className="h-5 w-5" />
              {hasUnreadDm && (
                <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-whistle ring-2 ring-zinc-950" />
              )}
            </Link>

            {/* Burger */}
            <button
              onClick={() => setOpen(true)}
              aria-label={t("ariaOpenMenu")}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 active:scale-95"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Side sheet */}
      <aside
        className="fixed top-0 z-[60] flex h-full w-72 flex-col border-l border-white/8 bg-zinc-950 shadow-2xl transition-transform duration-300 ease-out"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          right: "max(0px, calc(50vw - 14rem))",
          transform: open
            ? "translateX(0)"
            : "translateX(calc(100% + max(0px, calc(50vw - 14rem))))",
        }}
      >
        {/* Profile header */}
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              {t("connected")}
            </p>
            <p className="mt-0.5 text-base font-black text-white">{username}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-zinc-500">
              {liveRank}
            </p>
            <p className="mt-0.5 text-[10px] font-bold tabular-nums text-zinc-600">
              {liveXp.toLocaleString(bcp47)} XP
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label={t("ariaCloseMenu")}
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:text-white active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 p-3">
          <SheetLink
            href="/leaderboard"
            icon={<Trophy className="h-4 w-4" />}
            label={t("leaderboard")}
            onClick={() => setOpen(false)}
          />
          <SheetLink
            href="/shop"
            icon={<ShoppingBag className="h-4 w-4" />}
            label={t("shop")}
            onClick={() => setOpen(false)}
          />
          <SheetLink
            href="/rules"
            icon={<BookOpen className="h-4 w-4" />}
            label={t("rules")}
            onClick={() => setOpen(false)}
          />
          <SheetLink
            href="/settings"
            icon={<Settings className="h-4 w-4" />}
            label={t("settings")}
            onClick={() => setOpen(false)}
          />
        </nav>

        {/* Language switcher */}
        <div className="mx-3 mt-1 flex items-center justify-between rounded-xl border border-white/8 bg-white/3 px-4 py-3">
          <span className="text-sm font-semibold text-zinc-400">
            {t("language")}
          </span>
          <div className="flex overflow-hidden rounded-lg border border-white/10">
            {(["fr", "en", "es", "de", "it"] as const).map((l) => {
              const isActive = locale === l;
              return (
                <button
                  key={l}
                  onClick={() =>
                    startTransition(async () => {
                      await switchLocale(l);
                      router.refresh();
                    })
                  }
                  className={`px-2.5 py-1.5 text-xs font-black uppercase tracking-wide transition ${
                    isActive
                      ? "bg-green-500 text-zinc-950"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  {l}
                </button>
              );
            })}
          </div>
        </div>

        {/* Logout */}
        <div className="mt-auto border-t border-white/8 p-3">
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl border border-red-500/20 bg-red-950/20 px-4 py-3 text-sm font-bold text-red-400 transition hover:bg-red-950/40 active:scale-[0.98]"
            >
              <LogOut className="h-4 w-4" />
              {t("logout")}
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}

function SheetLink({
  href,
  icon,
  label,
  onClick,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-white"
    >
      {icon}
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="rounded-md border border-whistle/30 bg-whistle/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-whistle">
          {badge}
        </span>
      )}
    </Link>
  );
}
