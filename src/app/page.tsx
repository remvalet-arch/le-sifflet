import Link from "next/link";
import { Suspense } from "react";
import { Goal } from "lucide-react";
import { HomeAuthCtas } from "@/components/home/HomeAuthCtas";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-gradient-to-b from-pitch-800 to-pitch-900 text-chalk">
      <header className="border-b border-white/10 px-4 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2 font-black uppercase tracking-tight">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-whistle text-pitch-900 shadow-md">
              <Goal className="h-5 w-5" aria-hidden />
            </span>
            <span className="text-lg">Le Sifflet</span>
          </div>
          <Link
            href="/debug"
            className="text-xs font-semibold uppercase tracking-wide text-green-200/90 underline-offset-4 hover:text-white hover:underline"
          >
            État API
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-1 flex-col justify-center gap-6 px-4 py-16 text-center">
        <p className="text-sm font-bold uppercase tracking-widest text-whistle/90">
          MVP — étape 2
        </p>
        <h1 className="text-4xl font-black uppercase leading-tight tracking-tight text-white sm:text-5xl">
          T&apos;as sorti tes lunettes pour le hors-jeu ?
        </h1>
        <p className="text-lg text-green-100/95">
          Connecte-toi pour rejoindre le lobby, voir les matchs et préparer la live
          room.
        </p>
        <div className="flex flex-col items-center justify-center gap-3 pt-4">
          <Suspense fallback={<div className="h-12 w-full max-w-xs rounded-full bg-white/10" />}>
            <HomeAuthCtas />
          </Suspense>
          <Link
            href="/debug"
            className="text-xs font-semibold uppercase tracking-wide text-green-200/80 underline-offset-4 hover:text-white hover:underline"
          >
            Vérifier Supabase
          </Link>
        </div>
      </main>
    </div>
  );
}
