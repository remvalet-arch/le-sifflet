"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Landmark, User, Users, Target, MonitorPlay } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLiveRoom } from "@/contexts/LiveRoomContext";
import { createClient } from "@/lib/supabase/client";

function useLikelyLiveHour(): boolean {
  const h = new Date().getHours();
  const day = new Date().getDay();
  const isWeekend = day === 0 || day === 6;
  return isWeekend ? h >= 13 && h < 23 : h >= 18 && h < 23;
}

export function BottomNav({ userId }: { userId?: string }) {
  const pathname = usePathname();
  const t = useTranslations("Navigation");
  const { drawerAvailable, openDrawer } = useLiveRoom();
  const likelyLive = useLikelyLiveHour();
  const isOnLobby = pathname === "/lobby" || pathname.startsWith("/lobby/");
  const isMatchPage = /^\/match\//.test(pathname);
  const fabActive = isMatchPage && drawerAvailable;
  const isOnLigues = pathname === "/ligues" || pathname.startsWith("/ligues/");

  const [hasUnread, setHasUnread] = useState(false);
  const [showVarTooltip, setShowVarTooltip] = useState(false);
  const squadIdsRef = useRef<string[]>([]);
  const isOnLiguesRef = useRef(isOnLigues);
  // Once the user visits /ligues, stop re-checking the DB (trust SquadChat to
  // update last_read_at). The badge can only come back via realtime after that.
  const visitedLiguesRef = useRef(false);

  useEffect(() => {
    isOnLiguesRef.current = isOnLigues;
  }, [isOnLigues]);

  useEffect(() => {
    if (!userId) return;
    if (isOnLigues) {
      visitedLiguesRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasUnread(false);
      return;
    }
    if (visitedLiguesRef.current) return;

    let cancelled = false;
    let timerId: ReturnType<typeof setTimeout>;
    const supabase = createClient();

    void supabase
      .from("squad_members")
      .select("squad_id, last_read_at")
      .eq("user_id", userId)
      .then(async ({ data: memberships }) => {
        if (cancelled || !memberships || memberships.length === 0) {
          timerId = setTimeout(() => setHasUnread(false), 0);
          return;
        }
        squadIdsRef.current = memberships.map((m) => m.squad_id);

        const checks = await Promise.all(
          memberships.map(async (m) => {
            const q = supabase
              .from("squad_messages")
              .select("id", { count: "exact", head: true })
              .eq("squad_id", m.squad_id);
            if (m.last_read_at) q.gt("created_at", m.last_read_at);
            const { count } = await q;
            return (count ?? 0) > 0;
          }),
        );
        if (!cancelled)
          timerId = setTimeout(() => setHasUnread(checks.some(Boolean)), 0);
      });

    return () => {
      cancelled = true;
      clearTimeout(timerId);
    };
  }, [userId, isOnLigues]);

  // Realtime — affiche le badge dès qu'un autre user envoie un message
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    let timerId: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel(`bottomnav-unread-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "squad_messages" },
        (payload) => {
          const msg = payload.new as {
            squad_id: string;
            user_id: string | null;
            is_system_message?: boolean;
          };
          if (
            squadIdsRef.current.includes(msg.squad_id) &&
            msg.user_id !== null &&
            msg.user_id !== userId &&
            !msg.is_system_message &&
            !isOnLiguesRef.current
          ) {
            clearTimeout(timerId);
            timerId = setTimeout(() => setHasUnread(true), 0);
          }
        },
      )
      .subscribe();
    return () => {
      clearTimeout(timerId);
      void channel.unsubscribe();
    };
  }, [userId]);

  useEffect(() => {
    if (!fabActive) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem("var_btn_tooltip_shown")) return;
    const show = setTimeout(() => setShowVarTooltip(true), 800);
    const hide = setTimeout(() => {
      setShowVarTooltip(false);
      localStorage.setItem("var_btn_tooltip_shown", "1");
    }, 4800);
    return () => {
      clearTimeout(show);
      clearTimeout(hide);
    };
  }, [fabActive]);

  // Sur un match live : bottom nav réduite au seul bouton VAR
  if (fabActive) {
    return (
      <nav
        className="relative z-10 w-full shrink-0 border-t border-white/8 bg-zinc-950/95 backdrop-blur-md"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="relative flex h-16 items-start justify-center">
          {showVarTooltip && (
            <div
              className="pointer-events-none absolute bottom-full mb-2 z-20 animate-in fade-in slide-in-from-bottom-1 duration-200"
              aria-hidden
            >
              <div className="rounded-xl border border-green-500/30 bg-zinc-900 px-3 py-2 text-center shadow-xl">
                <p className="text-[11px] font-black text-green-400">
                  ⚡ Appuie ici quand tu
                </p>
                <p className="text-[11px] font-black text-green-400">
                  repères une action VAR !
                </p>
              </div>
              <div className="mx-auto mt-[-4px] size-2 rotate-45 border-b border-r border-green-500/30 bg-zinc-900" />
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setShowVarTooltip(false);
              localStorage.setItem("var_btn_tooltip_shown", "1");
              openDrawer();
            }}
            aria-label={t("ariaCallVar")}
            data-testid="fab-var-button"
            className="-mt-5 flex size-14 items-center justify-center rounded-full border-4 border-zinc-950 bg-green-500 shadow-lg shadow-[0_0_15px_rgba(34,197,94,0.5)] transition hover:bg-green-400 active:scale-95"
          >
            <MonitorPlay
              className="ml-0.5 size-6 text-zinc-950"
              aria-hidden="true"
            />
          </button>
        </div>
      </nav>
    );
  }

  return (
    <nav
      className="relative z-10 w-full shrink-0 border-t border-white/8 bg-zinc-950/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="relative grid h-16 grid-cols-4">
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
        <TabLink
          href="/ligues"
          Icon={Users}
          label={t("ligues")}
          pathname={pathname}
          badge={hasUnread}
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
  badge = false,
}: {
  href: string;
  Icon: React.ElementType;
  label: string;
  pathname: string;
  liveIndicator?: boolean;
  badge?: boolean;
}) {
  const isActive = pathname === href || pathname.startsWith(href + "/");
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      aria-label={
        liveIndicator
          ? `${label} — matchs en cours`
          : badge
            ? `${label} — nouveaux messages`
            : label
      }
      className={`relative flex flex-col items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-widest transition-colors active:scale-95 ${
        isActive ? "text-whistle" : "text-zinc-400 hover:text-zinc-200"
      }`}
    >
      {isActive && (
        <span
          aria-hidden="true"
          className="absolute inset-x-[20%] top-0 h-0.5 rounded-b-full bg-whistle"
        />
      )}
      <span className="relative inline-flex">
        <Icon className="size-5" aria-hidden="true" />
        {liveIndicator && (
          <span
            className="absolute -right-1 -top-1 flex size-2.5"
            aria-hidden="true"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
          </span>
        )}
        {badge && !liveIndicator && (
          <span
            className="absolute -right-1 -top-1 flex size-2.5"
            aria-hidden="true"
          >
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-whistle opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-whistle" />
          </span>
        )}
      </span>
      <span aria-hidden="true">{label}</span>
    </Link>
  );
}
