import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "VAR TIME — Pronostics football en temps réel",
  description:
    "Pronostique en temps réel sur les décisions d'arbitre, grimpe au classement et affronte tes amis dans des ligues privées. 100% gratuit, monnaie fictive.",
  robots: { index: false, follow: false },
};

export default function DiscoverPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-5 py-6 sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="rounded border border-white/25 px-1.5 py-0.5 text-[11px] font-black tracking-widest text-white">
            VAR
          </span>
          <span className="text-sm font-black uppercase tracking-widest text-white">
            TIME
          </span>
        </div>
        <Link
          href="/login"
          className="flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-green-400 transition hover:bg-green-500/20 active:scale-95"
        >
          Accéder →
        </Link>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-2xl px-5 pb-16 pt-8 text-center sm:px-8">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-green-500/20 bg-green-500/8 px-3 py-1.5">
          <span className="size-1.5 rounded-full bg-green-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-green-300/90">
            Football interactif
          </span>
        </div>
        <h1 className="text-[clamp(2rem,6vw,3.5rem)] font-semibold uppercase leading-tight tracking-tight text-white">
          Le football, en interactif.
        </h1>
        <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-zinc-400">
          VAR TIME te permet de pronostiquer en temps réel sur les décisions
          d&rsquo;arbitre pendant les matchs. Grimpe au classement, affronte tes
          amis dans des ligues privées et suivi la CDM 2026 en mode stade.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/login"
            className="flex h-12 items-center justify-center rounded-2xl bg-green-500 px-8 font-black uppercase tracking-wide text-black shadow-[0_0_25px_rgba(34,197,94,0.35)] transition hover:bg-green-400 active:scale-95"
          >
            Essayer gratuitement
          </Link>
        </div>
        <p className="mt-4 text-[10px] font-bold uppercase tracking-widest text-zinc-600">
          Gratuit · Monnaie fictive (Sifflets) · Aucun argent réel · PWA mobile
        </p>
      </section>

      {/* Features */}
      <section className="border-t border-white/8 py-12">
        <div className="mx-auto max-w-2xl px-5 sm:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                icon: "⚡",
                title: "Temps réel",
                body: "Pronostique sur chaque action litigieuse pendant le match — penalty, hors-jeu VAR, carton rouge.",
              },
              {
                icon: "🏆",
                title: "Classement mondial",
                body: "Affronte toute la communauté et grimpe dans le classement global de la saison.",
              },
              {
                icon: "⚔️",
                title: "Ligues privées",
                body: "Crée une ligue privée, invite tes amis et joue en mode championnat 1 contre 1.",
              },
              {
                icon: "🎯",
                title: "Pronos avant-match",
                body: "Score exact, buteurs, cotes dynamiques — accumule des Sifflets avant le coup d'envoi.",
              },
            ].map(({ icon, title, body }) => (
              <div
                key={title}
                className="rounded-2xl border border-white/8 bg-zinc-900 p-5"
              >
                <span className="text-2xl">{icon}</span>
                <p className="mt-3 font-black text-white">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PWA install */}
      <section className="border-t border-white/8 py-12">
        <div className="mx-auto max-w-md px-5 text-center sm:px-8">
          <p className="text-sm font-bold text-zinc-400">
            Disponible sur iOS et Android via PWA.
            <br />
            Aucun téléchargement requis.
          </p>
          <p className="mt-2 text-xs text-zinc-600">
            Safari → Partager → Sur l&rsquo;écran d&rsquo;accueil &nbsp;·&nbsp;
            Chrome → Menu ⋮ → Ajouter à l&rsquo;écran d&rsquo;accueil
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/8 py-8 text-center">
        <p className="text-[10px] text-zinc-700">
          VAR TIME est un jeu gratuit de simulation. Monnaie fictive. Aucun
          argent réel impliqué.
        </p>
        <p className="mt-2 text-[10px] text-zinc-700">© 2026 VAR Time.</p>
      </footer>
    </main>
  );
}
