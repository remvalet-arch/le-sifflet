"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Menu, X, BookOpen, Settings, LogOut, Trophy } from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { WhistleLogo } from "@/components/ui/WhistleLogo";
import { createClient } from "@/lib/supabase/client";
import type { ProfileRow } from "@/types/database";

type Props = { siffletsBalance: number; username: string; userId: string };

export function TopBar({ siffletsBalance, username, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState(siffletsBalance);
  const [flash, setFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Realtime : met à jour le solde dès qu'un pari est résolu
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
          if (updated.sifflets_balance > balance) {
            setFlash(true);
            if (flashTimer.current) clearTimeout(flashTimer.current);
            flashTimer.current = setTimeout(() => setFlash(false), 2000);
          }
          setBalance(updated.sifflets_balance);
        },
      )
      .subscribe();

    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
      void supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  return (
    <>
      <header
        className="fixed top-0 z-50 w-full border-b border-white/8 bg-zinc-950/95 backdrop-blur-xl"
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex h-14 items-center justify-between px-4">
          {/* Logo */}
          <Link href="/lobby" className="flex items-center gap-2.5">
            <WhistleLogo size="sm" />
            <span className="text-sm font-black uppercase tracking-tight text-white">
              Le Sifflet
            </span>
          </Link>

          {/* Balance — flash vert quand le solde augmente */}
          <div
            className={`rounded-full border px-3 py-1 text-sm font-black tabular-nums transition-all duration-500 ${
              flash
                ? "border-green-400 bg-green-400/20 text-green-300 shadow-lg shadow-green-400/30"
                : "border-green-500/30 bg-green-500/10 text-green-400"
            }`}
          >
            {balance.toLocaleString("fr-FR")}
            <span
              className={`ml-1 text-xs font-normal transition-colors duration-500 ${
                flash ? "text-green-300/80" : "text-green-400/60"
              }`}
            >
              pts
            </span>
          </div>

          {/* Burger */}
          <button
            onClick={() => setOpen(true)}
            aria-label="Ouvrir le menu"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 active:scale-95"
          >
            <Menu className="h-5 w-5" />
          </button>
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
        className={`fixed right-0 top-0 z-[60] flex h-full w-72 flex-col border-l border-white/8 bg-zinc-950 shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Connecté
            </p>
            <p className="mt-0.5 text-base font-black text-white">{username}</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/60 transition hover:text-white active:scale-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          <SheetLink
            href="/leaderboard"
            icon={<Trophy className="h-4 w-4" />}
            label="Classement"
            onClick={() => setOpen(false)}
          />
          <SheetLink
            href="/rules"
            icon={<BookOpen className="h-4 w-4" />}
            label="Règles du jeu"
            onClick={() => setOpen(false)}
          />
          <SheetLink
            href="/settings"
            icon={<Settings className="h-4 w-4" />}
            label="Paramètres"
            onClick={() => setOpen(false)}
          />
        </nav>

        <div className="mt-auto border-t border-white/8 p-3">
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-xl border border-red-500/20 bg-red-950/20 px-4 py-3 text-sm font-bold text-red-400 transition hover:bg-red-950/40 active:scale-[0.98]"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
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
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-white"
    >
      {icon}
      {label}
    </Link>
  );
}
