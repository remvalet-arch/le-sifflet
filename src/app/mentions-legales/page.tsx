import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mentions Légales — VAR Time",
};

export default function MentionsLegalesPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-8">
      <div className="mx-auto max-w-prose space-y-8">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs font-bold text-zinc-500 hover:text-white"
        >
          <ChevronLeft className="size-4" />
          Accueil
        </Link>

        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-1">
            Légal
          </p>
          <h1 className="text-2xl font-semibold">Mentions Légales</h1>
          <p className="mt-2 text-xs text-zinc-500">
            Dernière mise à jour : mai 2026
          </p>
        </div>

        <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-semibold text-white">Éditeur</h2>
          <p>
            VAR Time est édité par Rémi Valet, auto-entrepreneur.
            <br />
            Contact : rem.valet@gmail.com
          </p>
        </section>

        <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-semibold text-white">Hébergement</h2>
          <p>
            Le service est hébergé par Vercel Inc., 440 N Barranca Ave #4133,
            Covina, CA 91723, États-Unis.
            <br />
            Base de données : Supabase, 970 Toa Payoh North, Singapour.
          </p>
        </section>

        <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-semibold text-white">
            Propriété intellectuelle
          </h2>
          <p>
            L&apos;ensemble des contenus présents sur VAR Time (textes, design,
            code source) sont la propriété exclusive de l&apos;éditeur. Toute
            reproduction est interdite sans autorisation préalable.
          </p>
        </section>

        <section className="space-y-4 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-base font-semibold text-white">
            Données personnelles
          </h2>
          <p>
            Conformément au RGPD, vous disposez d&apos;un droit d&apos;accès, de
            rectification et de suppression de vos données. Consultez notre{" "}
            <Link href="/privacy" className="text-green-400 underline">
              Politique de confidentialité
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
