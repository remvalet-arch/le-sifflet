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
  const squadIdsRef = useRef<string[]>([]);
  const isOnLiguesRef = useRef(isOnLigues);
  const wasOnLiguesRef = useRef(isOnLigues);

  useEffect(() => {
    isOnLiguesRef.current = isOnLigues;
  }, [isOnLigues]);

  // Vérifie les non-lus à l'init et après chaque retour de /ligues
  // (SquadChat met à jour last_read_at → la re-vérif retourne 0 non-lus)
  useEffect(() => {
    const wasOnLigues = wasOnLiguesRef.current;
    wasOnLiguesRef.current = isOnLigues;

    if (!userId) return;
    if (isOnLigues) {
      setTimeout(() => setHasUnread(false), 0);
      return;
    }
    // Quand on quitte /ligues, on suppose que l'utilisateur a tout lu :
    // le badge ne revient que via realtime (nouveau message d'un autre user)
    if (wasOnLigues) {
      setTimeout(() => setHasUnread(false), 0);
      return;
    }
    let cancelled = false;
    const supabase = createClient();

    void supabase
      .from("squad_members")
      .select("squad_id, last_read_at")
      .eq("user_id", userId)
      .then(async ({ data: memberships }) => {
        if (cancelled || !memberships || memberships.length === 0) {
          setTimeout(() => setHasUnread(false), 0);
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
        if (!cancelled) setTimeout(() => setHasUnread(checks.some(Boolean)), 0);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, isOnLigues]);

  // Realtime — affiche le badge dès qu'un autre user envoie un message
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`bottomnav-unread-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "squad_messages" },
        (payload) => {
          const msg = payload.new as {
            squad_id: string;
            user_id: string | null;
          };
          if (
            squadIdsRef.current.includes(msg.squad_id) &&
            msg.user_id !== userId &&
            !isOnLiguesRef.current
          ) {
            setTimeout(() => setHasUnread(true), 0);
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId]);

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

        {isMatchPage && (
          <div className="flex -mt-5 items-start justify-center">
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
        {badge && !liveIndicator && (
          <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-whistle opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-whistle" />
          </span>
        )}
      </span>
      <span>{label}</span>
    </Link>
  );
}
