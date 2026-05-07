"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[error-boundary]", error);
  }, [error]);

  return (
    <html lang="fr">
      <body className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-6 text-center max-w-sm">
          <span className="text-6xl">🟥</span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">
              Carton Rouge
            </p>
            <h1 className="text-xl font-black text-white">Erreur inattendue</h1>
            <p className="mt-2 text-sm text-zinc-400">
              L&apos;arbitre a perdu le fil. Réessaie ou retourne au lobby.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2.5 text-sm font-black text-green-400 transition hover:bg-green-500/20"
            >
              Réessayer
            </button>
            <Link
              href="/lobby"
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-white/10"
            >
              Lobby
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
